import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import {
  encryptMessageClient,
  decryptMessageClient,
  encryptMessageGCM,
  decryptMessageGCM,
  storeEncryptionKey,
  getEncryptionKey,
  generateSharedKey
} from '../utils/encryption';
import { loadOrCreateIdentityKeyPair, deriveConversationKey } from '../utils/e2eeKeys';

const ChatComponent = ({ currentUserId, currentUsername }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const privateKeyRef = useRef(null);
  const publicKeyUploadRef = useRef(false);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const initializeIdentityKey = async () => {
      try {
        await ensureIdentityReady();
      } catch (error) {
        console.error('Failed to initialize identity key:', error);
      }
    };

    initializeIdentityKey();
  }, []);

  const ensureIdentityReady = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      return false;
    }

    const identity = await loadOrCreateIdentityKeyPair();
    privateKeyRef.current = identity.privateKey;

    if (!publicKeyUploadRef.current) {
      await axios.put(
        `${process.env.REACT_APP_SERVER_URL || 'http://localhost:5000'}/api/users/keys`,
        { identityPublicKey: identity.publicKey },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      publicKeyUploadRef.current = true;
    }

    return true;
  };

  // Initialize Socket.io connection
  useEffect(() => {
    socketRef.current = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000');

    socketRef.current.on('connect', () => {
      socketRef.current.emit('register-user', currentUserId);
    });

    socketRef.current.on('receive-message', async (data) => {
      const { id, senderId, encryptedMessage, timestamp } = data;

      // Show messages from any user, not just selected
      try {
        await ensureIdentityReady();
        const token = localStorage.getItem('token');
        const userResponse = await axios.get(
          `${process.env.REACT_APP_SERVER_URL || 'http://localhost:5000'}/api/users/${senderId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const remoteIdentityKey = userResponse.data.user.identityPublicKey;
        let decrypted;
        if (encryptedMessage.alg === 'AES-256-GCM' && remoteIdentityKey && privateKeyRef.current) {
          const conversationKey = await deriveConversationKey(
            privateKeyRef.current,
            remoteIdentityKey,
            currentUserId,
            senderId
          );
          decrypted = await decryptMessageGCM(
            encryptedMessage.encryptedMessage,
            conversationKey,
            encryptedMessage.iv,
            encryptedMessage.authTag
          );
        } else {
          let legacyKey = getEncryptionKey(senderId);
          if (!legacyKey) {
            legacyKey = generateSharedKey(currentUserId, senderId);
            storeEncryptionKey(senderId, legacyKey);
          }
          decrypted = decryptMessageClient(
            encryptedMessage.encryptedMessage,
            legacyKey,
            encryptedMessage.iv
          );
        }

        if (senderId === selectedUserId) {
          setMessages(prev => [...prev, {
            _id: id || `${senderId}-${timestamp}`,
            senderId,
            receiverId: currentUserId,
            message: decrypted,
            createdAt: timestamp,
            isOwn: false
          }]);
        }
      } catch (error) {
        console.error('Failed to decrypt message:', error);
        // Still add message even if decryption fails, so user knows something arrived
        if (senderId === selectedUserId) {
          setMessages(prev => [...prev, {
            _id: id || `${senderId}-${timestamp}`,
            senderId,
            receiverId: currentUserId,
            message: '[Failed to decrypt message]',
            createdAt: timestamp,
            isOwn: false
          }]);
        }
      }
    });

    socketRef.current.on('user-status', (data) => {
      const { userId, status } = data;
      if (status === 'online') {
        setOnlineUsers(prev => new Set([...prev, userId]));
      } else {
        setOnlineUsers(prev => {
          const updated = new Set(prev);
          updated.delete(userId);
          return updated;
        });
      }
    });

    socketRef.current.on('typing-indicator', (data) => {
      const { senderId, isTyping: typing } = data;
      if (senderId === selectedUserId) {
        setIsTyping(typing);
      }
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [currentUserId, selectedUserId]);

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          return;
        }
        const response = await axios.get(`${process.env.REACT_APP_SERVER_URL || 'http://localhost:5000'}/api/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(response.data.users);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };

    fetchUsers();

    const refreshInterval = setInterval(fetchUsers, 20000);
    return () => clearInterval(refreshInterval);
  }, []);

  // Fetch conversation history
  const fetchConversation = async (userId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await ensureIdentityReady();
      const response = await axios.get(
        `${process.env.REACT_APP_SERVER_URL || 'http://localhost:5000'}/api/messages/conversation/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const userResponse = await axios.get(
        `${process.env.REACT_APP_SERVER_URL || 'http://localhost:5000'}/api/users/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const remoteIdentityKey = userResponse.data.user.identityPublicKey;
      let gcmConversationKey = null;
      if (remoteIdentityKey && privateKeyRef.current) {
        gcmConversationKey = await deriveConversationKey(
          privateKeyRef.current,
          remoteIdentityKey,
          currentUserId,
          userId
        );
      }

      // Keep legacy key path for old messages
      let key = getEncryptionKey(userId);
      if (!key) {
        key = generateSharedKey(currentUserId, userId);
        storeEncryptionKey(userId, key);
      }

      // Decrypt all messages
      const decryptedMessages = await Promise.all(response.data.messages.map(async (msg) => {
        try {
          let decrypted;
          if (msg.alg === 'AES-256-GCM' && msg.authTag && gcmConversationKey) {
            decrypted = await decryptMessageGCM(
              msg.encryptedMessage,
              gcmConversationKey,
              msg.iv,
              msg.authTag
            );
          } else {
            decrypted = decryptMessageClient(
              msg.encryptedMessage,
              key,
              msg.iv
            );
          }
          // Check if decryption actually worked (not empty)
          if (!decrypted || decrypted.trim() === '') {
            return { 
              ...msg, 
              message: '🔒 [Old message - key no longer available]', 
              isOwn: msg.senderId._id === currentUserId 
            };
          }
          
          return {
            ...msg,
            message: decrypted,
            isOwn: msg.senderId._id === currentUserId
          };
        } catch (error) {
          console.error('Failed to decrypt message:', msg._id, error);
          // Show encrypted content indicator instead of hiding the message
          return { 
            ...msg, 
            message: '🔒 [Old message - key no longer available]', 
            isOwn: msg.senderId._id === currentUserId 
          };
        }
      }));

      setMessages(decryptedMessages);
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle user selection
  const handleSelectUser = (userId) => {
    setSelectedUserId(userId);
    setMessages([]);
    fetchConversation(userId);
  };

  // Handle send message
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputMessage.trim()) {
      return;
    }
    
    if (!selectedUserId) {
      alert('Please select a user first');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Session expired. Please login again.');
        return;
      }

      await ensureIdentityReady();

      let selectedUser = users.find((user) => user._id === selectedUserId);
      let recipientIdentityKey = selectedUser?.identityPublicKey;

      if (!recipientIdentityKey) {
        const latestUserResponse = await axios.get(
          `${process.env.REACT_APP_SERVER_URL || 'http://localhost:5000'}/api/users/${selectedUserId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        recipientIdentityKey = latestUserResponse.data.user?.identityPublicKey;
      }

      let encryptedPayload;
      if (recipientIdentityKey && privateKeyRef.current) {
        const conversationKey = await deriveConversationKey(
          privateKeyRef.current,
          recipientIdentityKey,
          currentUserId,
          selectedUserId
        );

        const { encryptedMessage, iv, authTag } = await encryptMessageGCM(
          inputMessage,
          conversationKey
        );
        encryptedPayload = {
          encryptedMessage,
          iv,
          authTag,
          alg: 'AES-256-GCM',
          version: 2
        };
      } else {
        // Backward-compatible fallback for users who have not initialized E2E keys yet.
        let legacyKey = getEncryptionKey(selectedUserId);
        if (!legacyKey) {
          legacyKey = generateSharedKey(currentUserId, selectedUserId);
          storeEncryptionKey(selectedUserId, legacyKey);
        }
        const { encryptedMessage, iv } = encryptMessageClient(inputMessage, legacyKey);
        encryptedPayload = {
          encryptedMessage,
          iv,
          authTag: null,
          alg: 'AES-256-CBC',
          version: 1
        };
      }
      
      const response = await axios.post(
        `${process.env.REACT_APP_SERVER_URL || 'http://localhost:5000'}/api/messages/send`,
        {
          receiverId: selectedUserId,
          encryptedMessage: encryptedPayload.encryptedMessage,
          iv: encryptedPayload.iv,
          authTag: encryptedPayload.authTag,
          alg: encryptedPayload.alg,
          version: encryptedPayload.version
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Add to local state
      setMessages(prev => [...prev, {
        _id: response.data.message.id,
        senderId: currentUserId,
        receiverId: selectedUserId,
        message: inputMessage,
        createdAt: response.data.message.timestamp,
        isOwn: true
      }]);

      // Emit to recipient via socket (don't send encryption key)
      socketRef.current.emit('send-message', {
        senderId: currentUserId,
        receiverId: selectedUserId,
        messageId: response.data.message.id,
        timestamp: response.data.message.timestamp,
        encryptedMessage: {
          encryptedMessage: encryptedPayload.encryptedMessage,
          iv: encryptedPayload.iv,
          authTag: encryptedPayload.authTag,
          alg: encryptedPayload.alg,
          version: encryptedPayload.version
        }
      });
      setInputMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert(`Failed to send message: ${error.response?.data?.message || error.message}`);
    }
  };

  // Handle typing indicator
  const handleInputChange = (e) => {
    setInputMessage(e.target.value);

    // Emit typing indicator
    socketRef.current.emit('user-typing', {
      recipientId: selectedUserId,
      isTyping: true
    });

    // Clear timeout and set new one
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit('user-typing', {
        recipientId: selectedUserId,
        isTyping: false
      });
    }, 1000);
  };

  // Get user initials for avatar
  const getInitials = (username) => {
    return username?.slice(0, 2).toUpperCase() || '??';
  };
  
  // Get avatar color based on username
  const getAvatarColor = (username) => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-orange-500',
      'bg-teal-500',
      'bg-indigo-500'
    ];
    const index = username?.charCodeAt(0) % colors.length || 0;
    return colors[index];
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredUsers = users.filter((user) => {
    if (!normalizedSearch) return true;
    const username = (user.username || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    return username.includes(normalizedSearch) || email.includes(normalizedSearch);
  });

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-100 via-cyan-50 to-blue-50">
      {/* Users List - Messages Sidebar */}
      <div className="w-80 bg-white flex flex-col shadow-lg">
        {/* Search */}
        <div className="p-6 pb-4">
          <div className="relative">
            <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search" 
              className="w-full pl-12 pr-4 py-3 text-sm bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-gray-200 focus:outline-none text-gray-900 placeholder-gray-400"
            />
          </div>
        </div>
        
        {/* Messages Header */}
        <div className="px-6 pb-4">
          <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
        </div>
        
        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredUsers.map(user => (
            <div
              key={user._id}
              onClick={() => handleSelectUser(user._id)}
              className={`px-6 py-4 cursor-pointer transition-all ${
                selectedUserId === user._id 
                  ? 'bg-gray-50' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="relative flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full ${getAvatarColor(user.username)} flex items-center justify-center text-white font-semibold text-sm`}>
                    {getInitials(user.username)}
                  </div>
                  {onlineUsers.has(user._id) && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {user.username}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <div className="px-6 py-8 text-center text-sm text-gray-500">
              No users match your search.
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-cream-100">
        {selectedUserId ? (
          <>
            {/* Chat Header */}
            <div className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className={`w-12 h-12 rounded-full ${getAvatarColor(users.find(u => u._id === selectedUserId)?.username)} flex items-center justify-center text-white font-semibold`}>
                    {getInitials(users.find(u => u._id === selectedUserId)?.username)}
                  </div>
                  {onlineUsers.has(selectedUserId) && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                  )}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 text-lg">
                    {users.find(u => u._id === selectedUserId)?.username}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {onlineUsers.has(selectedUserId) ? '● Online' : 'Offline'}
                  </p>
                </div>
              </div>
              <div />
            </div>

            {/* Messages - Clean Layout */}
            <div className="flex-1 overflow-y-auto px-6 py-5 bg-cream-100">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-gray-900 mb-3"></div>
                    <p className="text-sm text-gray-600 font-medium">Loading messages...</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white flex items-center justify-center shadow-sm">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-gray-900 font-medium mb-1">No messages yet</p>
                    <p className="text-sm text-gray-500">Send a message to start the conversation</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, index) => (
                    <div
                      key={msg._id}
                      className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                      style={{ animationDelay: `${index * 0.03}s` }}
                    >
                      <div className={`flex items-end space-x-3 max-w-xl ${msg.isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        {!msg.isOwn && (
                          <div className={`w-9 h-9 rounded-full ${getAvatarColor(users.find(u => u._id === selectedUserId)?.username)} flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
                            {getInitials(users.find(u => u._id === selectedUserId)?.username)}
                          </div>
                        )}
                        <div
                          className={`px-5 py-3 rounded-2xl ${
                            msg.isOwn
                              ? 'bg-chat-dark text-white rounded-br-sm shadow-lg'
                              : 'bg-white text-gray-900 rounded-bl-sm shadow-md'
                          }`}
                        >
                          <p className={`text-sm leading-relaxed ${msg.message?.includes('🔒') ? 'italic opacity-75' : ''}`}>
                            {msg.message}
                          </p>
                          <p className={`text-xs mt-1.5 ${msg.isOwn ? 'text-gray-400' : 'text-gray-500'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex items-end space-x-3 animate-fadeIn">
                      <div className={`w-9 h-9 rounded-full ${getAvatarColor(users.find(u => u._id === selectedUserId)?.username)} flex items-center justify-center text-white text-xs font-semibold`}>
                        {getInitials(users.find(u => u._id === selectedUserId)?.username)}
                      </div>
                      <div className="bg-white px-5 py-4 rounded-2xl rounded-bl-sm shadow-md flex items-center space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input - Docked Bottom Design */}
            <form onSubmit={handleSendMessage} className="bg-white px-6 py-4 border-t border-gray-100">
              <div className="flex gap-3 items-center">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={handleInputChange}
                  placeholder="Write a Message"
                  className="flex-1 px-5 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200 text-sm text-gray-900 placeholder-gray-400"
                  disabled={!selectedUserId}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || !selectedUserId}
                  className="flex-shrink-0 w-11 h-11 rounded-full bg-chat-dark hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-cream-100">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white shadow-sm flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-900 text-lg font-semibold mb-2">Select a conversation</p>
              <p className="text-gray-500 text-sm">Choose a contact from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatComponent;
