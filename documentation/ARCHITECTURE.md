# Architecture & Technical Documentation

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                     │
│                      React Application                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Components:                                          │   │
│  │  - AuthComponent (Login/Signup UI)                   │   │
│  │  - ChatComponent (Chat UI + Encryption Logic)        │   │
│  │  - Message Display & Input                           │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Client-Side Encryption (crypto-js):                 │   │
│  │  - AES-256-CBC encryption                            │   │
│  │  - Per-conversation keys in sessionStorage           │   │
│  │  - Message encryption before sending                 │   │
│  │  - Message decryption after receiving                │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/HTTPS (REST API)
                     │ WebSocket (Socket.io)
                     │
┌────────────────────▼────────────────────────────────────────┐
│                  BACKEND (Node.js/Express)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Routes/Endpoints:                                    │   │
│  │  - POST /api/auth/signup                             │   │
│  │  - POST /api/auth/login                              │   │
│  │  - POST /api/messages/send                           │   │
│  │  - GET /api/messages/conversation/:userId            │   │
│  │  - GET /api/users                                    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Middleware:                                          │   │
│  │  - JWT Authentication (protect routes)               │   │
│  │  - Password hashing (bcryptjs)                       │   │
│  │  - CORS configuration                                │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Server-Side Encryption (crypto):                    │   │
│  │  - AES-256-GCM encryption                            │   │
│  │  - IV generation per message                         │   │
│  │  - Auth tag verification                             │   │
│  │  - Message integrity hashing                         │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Real-time Communication (Socket.io):                │   │
│  │  - User registration on connect                      │   │
│  │  - Online/offline status broadcast                   │   │
│  │  - Message relay to active connections               │   │
│  │  - Typing indicators                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │ MongoDB Queries
                     │ Data Persistence
                     │
┌────────────────────▼────────────────────────────────────────┐
│                   DATABASE (MongoDB)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Collections:                                         │   │
│  │  - users (username, email, hashed_password, etc)     │   │
│  │  - messages (encrypted_msg, iv, receiver, sender)    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Indexes:                                             │   │
│  │  - senderId + receiverId (for conversations)         │   │
│  │  - receiverId + isRead (for unread messages)         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Message Flow Diagram

### Sending a Message

```
┌─────────────┐
│   Alice     │
│  writes msg │
│  "Hello"    │
└────┬────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ CLIENT ENCRYPTION PHASE             │
│ ================================   │
│ 1. Retrieve/Generate AES key        │
│ 2. Create random IV (16 bytes)      │
│ 3. Encrypt "Hello" with AES-256     │
│ 4. Result:                          │
│    - encryptedMsg: "u2FsdGVkX..."  │
│    - IV: "3d4f5f6g7h8i9j0k"        │
└────┬────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ HTTP POST /api/messages/send        │
│ {                                   │
│   receiverId: "bob_id",             │
│   message: "Hello",                 │
│   encryptionKey: "abc123..."        │
│ }                                   │
└────┬────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ SERVER RECEIVES                     │
│ 1. Verify JWT token                 │
│ 2. Validate receiver exists         │
│ 3. Encrypt message (redundant       │
│    security layer)                  │
└────┬────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ SERVER STORES IN DB                 │
│ Message {                           │
│   _id: new ObjectId(),              │
│   senderId: "alice_id",             │
│   receiverId: "bob_id",             │
│   encryptedMessage: "u2FsdGVkX...", │
│   iv: "3d4f5f...",                  │
│   createdAt: timestamp              │
│ }                                   │
└────┬────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ SOCKET.IO REAL-TIME DELIVERY        │
│ 1. Check if Bob is online           │
│ 2. Emit to Bob's socket:            │
│    {                                │
│      senderId: "alice_id",          │
│      encryptedMessage: {...}        │
│    }                                │
└────┬────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│ BOB'S CLIENT                         │
│ ================================     │
│ 1. Receive encrypted message        │
│ 2. Retrieve same AES key from       │
│    sessionStorage                   │
│ 3. Decrypt "Hello" using:           │
│    - encryptedMessage               │
│    - IV from message                │
│    - AES key                        │
│ 4. Display "Hello" in chat          │
└──────────────────────────────────────┘
```

### Receiving a Message (offline storage)

```
┌──────────────────┐
│  Bob offline     │
│  Alice sends msg │
└────┬─────────────┘
     │
     ▼
┌───────────────────────────────────────┐
│ SERVER STORES MESSAGE                 │
│ (encrypted in MongoDB)                │
│                                       │
│ Even though Bob is offline, the       │
│ message is safely stored and          │
│ encrypted in the database             │
└────┬──────────────────────────────────┘
     │
     ▼
┌───────────────────────────────────────┐
│  Bob comes online                     │
│  1. Connects via Socket.io            │
│  2. Client fetches conversation       │
│     GET /messages/conversation/:alice │
│  3. Server returns all encrypted      │
│     messages from Alice               │
│  4. Client decrypts each message      │
│  5. Displays in chat history          │
└───────────────────────────────────────┘
```

## Authentication Flow

```
┌──────────────┐
│  New User    │
│  Sign Up     │
└────┬─────────┘
     │
     ▼
┌──────────────────────────────────────┐
│ POST /api/auth/signup                │
│ {                                    │
│   username: "alice",                 │
│   email: "alice@test.com",           │
│   password: "secret123"              │
│ }                                    │
└────┬─────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│ SERVER VALIDATION                    │
│ 1. Check if user exists              │
│ 2. Validate email format             │
│ 3. Check password length             │
│ 4. Hash password with bcrypt         │
│ 5. Generate random public key        │
│ 6. Create user in MongoDB            │
└────┬─────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│ GENERATE JWT TOKEN                   │
│                                      │
│ Header:   {alg: "HS256"}             │
│ Payload:  {id: "user_id"}            │
│ Secret:   "your-secret-key"          │
│ Token:    "eyJhbGc..."               │
└────┬─────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│ SEND TO CLIENT                       │
│ {                                    │
│   token: "eyJhbGc...",               │
│   user: {                            │
│     id: "user_id",                   │
│     username: "alice",               │
│     publicKey: "..."                 │
│   }                                  │
│ }                                    │
└────┬─────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│ CLIENT STORES                        │
│ localStorage.setItem("token", ...)   │
│ localStorage.setItem("user", ...)    │
│                                      │
│ Token sent with every API request:  │
│ Authorization: Bearer eyJhbGc...     │
└──────────────────────────────────────┘
```

## Encryption Algorithm Details

### Server-Side: AES-256-GCM

```
Message: "Hello World"
Key: 32 random bytes (256 bits)
IV: 16 random bytes (128 bits)

┌─────────────────────────────────┐
│ AES-256-GCM Encryption          │
├─────────────────────────────────┤
│ 1. Pad message with PKCS7       │
│ 2. Apply AES block cipher (16   │
│    rounds, 256-bit key)         │
│ 3. Generate Authentication Tag  │
│    (provides authenticity &     │
│    integrity checking)          │
│ 4. Output:                      │
│    - Ciphertext                 │
│    - IV (needed for decryption) │
│    - Auth Tag (for verification)│
└─────────────────────────────────┘

Example Output:
{
  encryptedMessage: "3f4e5a6b...",
  iv: "a1b2c3d4e5f6...",
  authTag: "7c8d9e0f1a..."
}
```

### Client-Side: AES-256-CBC

```
Message: "Hello World"
Key: 32 random bytes (256 bits)
IV: 16 random bytes (128 bits)

┌─────────────────────────────────┐
│ AES-256-CBC Encryption          │
├─────────────────────────────────┤
│ 1. Pad message with PKCS7       │
│ 2. Apply AES in CBC mode with   │
│    previous ciphertext block    │
│ 3. Output: Ciphertext           │
└─────────────────────────────────┘

Example Output:
{
  encryptedMessage: "abc123def456...",
  iv: "x1y2z3a4b5c6..."
}
```

## Database Schema

### Users Collection

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  username: "alice",
  email: "alice@test.com",
  password: "$2a$10$...", // bcrypt hash
  publicKey: "key123abc...",
  avatar: null,
  status: "online", // "online" or "offline"
  lastSeen: ISODate("2024-02-17T10:30:00Z"),
  createdAt: ISODate("2024-02-15T08:20:00Z"),
  updatedAt: ISODate("2024-02-17T10:30:00Z")
}
```

### Messages Collection

```javascript
{
  _id: ObjectId("507f191e810c19729de860ea"),
  senderId: ObjectId("507f1f77bcf86cd799439011"), // Alice
  receiverId: ObjectId("507f1f77bcf86cd799439012"), // Bob
  encryptedMessage: "u2FsdGVkX1Y2Z3a4...", // AES encrypted
  iv: "3d4f5f6g7h8i9j0k", // Initialization Vector
  messageHash: "abc123def456...", // SHA-256 hash
  authTag: "7c8d9e0f1a2b3c4d", // GCM auth tag
  isRead: false,
  createdAt: ISODate("2024-02-17T10:30:00Z"),
  updatedAt: ISODate("2024-02-17T10:30:00Z")
}
```

### Indexes

```javascript
// For fast conversation queries
db.messages.createIndex({ senderId: 1, receiverId: 1 })

// For quick unread message lookup
db.messages.createIndex({ receiverId: 1, isRead: 1 })
```

## Security Features

### 1. End-to-End Encryption
- All messages encrypted before leaving client
- Server never has access to plaintext
- Each conversation has unique key

### 2. Authentication
- JWT tokens for session management
- bcrypt for password hashing (10 salt rounds)
- Token expiration (7 days)

### 3. Data Integrity
- GCM authentication tags on server
- SHA-256 message hashes
- Signature verification possible

### 4. Transport Security
- HTTPS recommended for production
- Socket.io with secure WebSocket
- CORS configuration

### 5. Access Control
- JWT middleware on all protected routes
- Users can only access their own data
- Receiver verification for messages

## Performance Optimizations

### Database
- Indexes on commonly queried fields
- Pagination on message history (50 items default)
- Connection pooling with Mongoose

### Real-time Communication
- Socket.io namespaces for organization
- Room-based message delivery
- Binary encoding option for payload reduction

### Encryption
- Client-side encryption (no server overhead)
- Lazy key generation (only when needed)
- Session storage for key caching

### Frontend
- React memo for component optimization
- useRef for socket connection persistence
- sessionStorage for temporary key storage

## Error Handling

### Server-Side
```javascript
try {
  // Operation
} catch (error) {
  console.error('Error:', error);
  res.status(500).json({ message: 'Server error' });
}
```

### Client-Side
```javascript
try {
  const decrypted = decryptMessageClient(msg, key, iv);
} catch (error) {
  console.error('Decryption failed:', error);
  // Show "Failed to decrypt message"
}
```

## Scalability Considerations

### For Small Scale (< 1000 users)
- Current architecture is sufficient
- Local MongoDB is fine
- Single server handles all connections

### For Medium Scale (1000-10000 users)
- MongoDB Atlas for reliability
- Redis for session management
- Load balancing with multiple Node servers
- CDN for static assets

### For Large Scale (> 10000 users)
- Microservices architecture
- Message queue (RabbitMQ/Kafka)
- Distributed key-value store
- Sharding strategy for MongoDB
- DDoS protection

## Testing Checklist

- [ ] User authentication works
- [ ] Messages encrypt/decrypt correctly
- [ ] Real-time delivery functions
- [ ] Database stores encrypted messages
- [ ] Online status updates
- [ ] Typing indicators work
- [ ] Message history loads
- [ ] Multiple conversations independent
- [ ] Token expiration handled
- [ ] Error messages display properly

This architecture ensures messages are encrypted end-to-end while providing real-time communication capabilities.
