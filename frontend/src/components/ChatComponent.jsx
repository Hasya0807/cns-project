import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import {
  encryptMessageClient,
  decryptMessageClient,
  storeEncryptionKey,
  getEncryptionKey,
  generateEncryptionKey,
  generateSharedKey
} from '../utils/encryption';

const ChatComponent = ({ currentUserId, currentUsername }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [loading, setLoading] = useState(false);
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

  // Initialize Socket.io connection
  useEffect(() => {
    socketRef.current = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000');

    socketRef.current.on('connect', () => {
      console.log('Connected to server');
      socketRef.current.emit('register-user', currentUserId);
    });

    socketRef.current.on('receive-message', (data) => {
      const { senderId, encryptedMessage, timestamp } = data;
      
      console.log('Received message from:', senderId);

      // Show messages from any user, not just selected
      try {
        // Use locally stored encryption key for this conversation
        const key = getEncryptionKey(senderId);
        console.log('Using stored key for sender:', key ? 'Found' : 'Not found');
        
        if (key) {
          const decrypted = decryptMessageClient(
            encryptedMessage.encryptedMessage,
            key,
            encryptedMessage.iv
          );
          
          console.log('Decrypted message:', decrypted);
          
          // Only update UI if this is the currently selected conversation
          if (senderId === selectedUserId) {
            setMessages(prev => [...prev, {
              _id: Math.random(),
              senderId,
              receiverId: currentUserId,
              message: decrypted,
              createdAt: timestamp,
              isOwn: false
            }]);
          }
        } else {
          console.error('No encryption key available for sender:', senderId);
          if (senderId === selectedUserId) {
            setMessages(prev => [...prev, {
              _id: Math.random(),
              senderId,
              receiverId: currentUserId,
              message: '[No encryption key - start a new conversation]',
              createdAt: timestamp,
              isOwn: false
            }]);
          }
        }
      } catch (error) {
        console.error('Failed to decrypt message:', error);
        // Still add message even if decryption fails, so user knows something arrived
        if (senderId === selectedUserId) {
          setMessages(prev => [...prev, {
            _id: Math.random(),
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
        const response = await axios.get(`${process.env.REACT_APP_SERVER_URL || 'http://localhost:5000'}/api/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(response.data.users);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };

    fetchUsers();
  }, []);

  // Fetch conversation history
  const fetchConversation = async (userId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_SERVER_URL || 'http://localhost:5000'}/api/messages/conversation/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Fetched messages:', response.data.messages.length);

      // Get or generate shared encryption key for this conversation
      // Both users will generate the same key based on their user IDs
      let key = getEncryptionKey(userId);
      if (!key) {
        console.log('No existing key found, generating shared key');
        key = generateSharedKey(currentUserId, userId);
        storeEncryptionKey(userId, key);
      } else {
        console.log('Using existing key for conversation');
      }
      setEncryptionKey(key);

      // Decrypt all messages
      const decryptedMessages = response.data.messages.map(msg => {
        try {
          console.log('Attempting to decrypt message:', msg._id);
          const decrypted = decryptMessageClient(
            msg.encryptedMessage,
            key,
            msg.iv
          );
          console.log('Decrypted result:', decrypted);
          
          // Check if decryption actually worked (not empty)
          if (!decrypted || decrypted.trim() === '') {
            console.warn('Decryption returned empty string for:', msg._id);
            return { 
              ...msg, 
              message: '🔒 [Old message - key no longer available]', 
              isOwn: msg.senderId._id === currentUserId 
            };
          }
          
          console.log('Successfully decrypted:', decrypted);
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
      });

      console.log('Setting messages:', decryptedMessages.length);
      setMessages(decryptedMessages);
      
      // Check if there are unreadable messages
      const unreadableCount = decryptedMessages.filter(m => m.message?.includes('🔒')).length;
      if (unreadableCount > 0) {
        console.warn(`${unreadableCount} messages could not be decrypted (wrong encryption key)`);
      }
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
    
    // Debugging logs
    console.log('Send button clicked');
    console.log('Input message:', inputMessage);
    console.log('Selected user ID:', selectedUserId);
    console.log('Encryption key:', encryptionKey);

    if (!inputMessage.trim()) {
      console.log('Message is empty');
      return;
    }
    
    if (!selectedUserId) {
      console.log('No user selected');
      alert('Please select a user first');
      return;
    }
    
    // Get or generate shared encryption key
    let currentKey = encryptionKey;
    if (!currentKey) {
      currentKey = getEncryptionKey(selectedUserId);
      if (!currentKey) {
        console.log('No encryption key found, generating shared key');
        currentKey = generateSharedKey(currentUserId, selectedUserId);
        storeEncryptionKey(selectedUserId, currentKey);
        setEncryptionKey(currentKey);
      }
    }

    console.log('Using key for encryption (length):', currentKey?.length);

    try {
      // Encrypt message on client side (true end-to-end encryption)
      const { encryptedMessage, iv } = encryptMessageClient(
        inputMessage,
        currentKey
      );

      console.log('Message encrypted successfully');

      // Send encrypted message to server (server never sees plaintext)
      const token = localStorage.getItem('token');
      console.log('Sending to backend...');
      
      const response = await axios.post(
        `${process.env.REACT_APP_SERVER_URL || 'http://localhost:5000'}/api/messages/send`,
        {
          receiverId: selectedUserId,
          encryptedMessage: encryptedMessage,
          iv: iv
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Backend response:', response.data);

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
        encryptedMessage: {
          encryptedMessage,
          iv
        }
      });

      console.log('Message sent successfully');
      setInputMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      console.error('Error details:', error.response?.data);
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

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-100 via-cyan-50 to-blue-50">
      {/* Left Navigation Icons */}
      <div className="w-20 bg-white flex flex-col items-center py-6 space-y-6 shadow-sm">
        <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center cursor-pointer">
          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
          </svg>
        </div>
        
        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors">
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        
        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors">
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        
        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors">
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </div>
        
        <div className="flex-1"></div>
        
        <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center cursor-pointer">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
          </svg>
        </div>
        
        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors">
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        
        <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center cursor-pointer">
          <span className="text-white font-bold text-xl">N</span>
        </div>
      </div>

      {/* Users List - Messages Sidebar */}
      <div className="w-96 bg-white flex flex-col shadow-lg">
        {/* Search */}
        <div className="p-6 pb-4">
          <div className="relative">
            <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
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
          {users.map(user => (
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
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-cream-100">
        {selectedUserId ? (
          <>
            {/* Chat Header */}
            <div className="bg-white shadow-sm px-8 py-5 flex items-center justify-between">
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
              <div className="flex items-center space-x-3">
                <button className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </button>
                <button className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <button className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages - Clean Layout */}
            <div className="flex-1 overflow-y-auto px-8 py-6 bg-cream-100">
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
            <form onSubmit={handleSendMessage} className="bg-white px-8 py-5 border-t border-gray-100">
              <div className="flex gap-3 items-center">
                <button
                  type="button"
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
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
                  onClick={() => console.log('Button clicked directly')}
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
