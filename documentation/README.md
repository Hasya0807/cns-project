# Encrypted Chat Application - MERN Stack

A secure, end-to-end encrypted chat application built with MERN stack (MongoDB, Express, React, Node.js) with real-time messaging using Socket.io and AES-256 encryption.

## Features

- **End-to-End Encryption**: All messages encrypted with AES-256-GCM
- **Real-time Messaging**: Socket.io for instant message delivery
- **User Authentication**: JWT-based auth with bcrypt password hashing
- **Online Status**: Real-time online/offline status
- **Typing Indicators**: See when users are typing
- **Message History**: All messages stored securely in MongoDB
- **Multi-device Support**: Chat from different devices
- **User Search**: Find and chat with other users

## Tech Stack

### Backend
- Node.js & Express.js
- MongoDB with Mongoose
- Socket.io for real-time communication
- JWT for authentication
- AES-256-GCM for encryption

### Frontend
- React
- Axios for API requests
- Socket.io client
- crypto-js for client-side encryption
- Tailwind CSS for styling

## Project Structure

```
encrypted-chat/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   └── Message.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── messages.js
│   │   └── users.js
│   ├── middleware/
│   │   └── auth.js
│   ├── utils/
│   │   └── encryption.js
│   ├── server.js
│   ├── .env
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatComponent.jsx
│   │   │   └── AuthComponent.jsx
│   │   ├── utils/
│   │   │   └── encryption.js
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.js
│   ├── .env
│   └── package.json
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js v14+
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create .env file**
   ```bash
   cp .env.example .env
   ```

4. **Update .env with your configuration**
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/encrypted-chat
   JWT_SECRET=your-secret-key-change-in-production
   CLIENT_URL=http://localhost:3000
   NODE_ENV=development
   ```

5. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

The server will run on `http://localhost:5000`

### Frontend Setup

1. **Create React app (if not already done)**
   ```bash
   npx create-react-app encrypted-chat-frontend
   cd encrypted-chat-frontend
   ```

2. **Install additional dependencies**
   ```bash
   npm install axios socket.io-client crypto-js
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```

3. **Replace the default files with provided components**
   - Copy `App.jsx` to `src/App.js`
   - Copy `AuthComponent.jsx` to `src/components/AuthComponent.jsx`
   - Copy `ChatComponent.jsx` to `src/components/ChatComponent.jsx`
   - Copy client `encryption.js` to `src/utils/encryption.js`

4. **Create .env file in frontend root**
   ```
   REACT_APP_SERVER_URL=http://localhost:5000
   ```

5. **Start the development server**
   ```bash
   npm start
   ```

The app will open on `http://localhost:3000`

## Encryption Details

### Server-Side (Backend)
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Size**: 256 bits (32 bytes)
- **IV**: 128-bit random value per message
- **Authentication**: GCM authentication tag for integrity

### Client-Side (Frontend)
- **Library**: crypto-js
- **Algorithm**: AES-256-CBC
- **Storage**: sessionStorage (cleared when tab closes)
- **Key Derivation**: Random 256-bit keys per conversation

### Message Flow
1. Client encrypts message with AES-256
2. Encrypted message + IV sent to server via HTTP/WebSocket
3. Server stores encrypted message in MongoDB
4. Server forwards encrypted message to recipient via Socket.io
5. Recipient decrypts message with same key

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user

### Messages
- `POST /api/messages/send` - Send encrypted message
- `GET /api/messages/conversation/:userId` - Get chat history
- `GET /api/messages/unread` - Get unread message count
- `DELETE /api/messages/:messageId` - Delete a message

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:userId` - Get user by ID
- `GET /api/users/search/:query` - Search users

## Socket.io Events

### Client → Server
- `register-user` - Register user when connecting
- `send-message` - Send message to recipient
- `user-typing` - Emit typing indicator

### Server → Client
- `receive-message` - Receive message from sender
- `user-status` - User came online/offline
- `typing-indicator` - User is typing

## Security Considerations

1. **Never share encryption keys** over insecure channels
2. **Use HTTPS in production** to secure key transmission
3. **Implement key exchange protocol** (Diffie-Hellman) for production
4. **Rotate JWT secret regularly**
5. **Use strong passwords** - Enforce password complexity
6. **Rate limiting** - Implement on authentication endpoints
7. **Message validation** - Verify message integrity with hashes
8. **Data sanitization** - Sanitize all user inputs

## Production Deployment

### Environment Variables
Always set strong values for production:
```
JWT_SECRET=generate-a-strong-random-string
MONGODB_URI=your-production-mongodb-uri
NODE_ENV=production
CLIENT_URL=your-production-frontend-url
```

### MongoDB Atlas
1. Create cluster on MongoDB Atlas
2. Create database user
3. Whitelist IP addresses
4. Get connection string
5. Add to MONGODB_URI

### Deployment Options

**Heroku (Backend)**
```bash
heroku login
heroku create your-app-name
heroku config:set JWT_SECRET=your-secret
git push heroku main
```

**Vercel (Frontend)**
```bash
npm install -g vercel
vercel --env REACT_APP_SERVER_URL=your-backend-url
```

**AWS/DigitalOcean**
- Deploy Node.js app on EC2/Droplet
- Use PM2 for process management
- Set up reverse proxy with Nginx
- Use SSL certificates with Let's Encrypt

## Important Notes

### Key Management for Production
The current implementation generates random keys per conversation. For production:

1. **Implement Diffie-Hellman Key Exchange** for secure key establishment
2. **Use Perfect Forward Secrecy (PFS)** - different keys per message
3. **Implement key rotation** mechanisms
4. **Store keys securely** - never in localStorage

### Example DH Implementation
```javascript
// Use library like 'diffie-hellman' or 'libsodium.js'
const dh = crypto.createDiffieHellman(2048);
const publicKey = dh.generateKeys('hex');
// Exchange public keys and derive shared secret
```

## Troubleshooting

**Issue**: Messages not sending
- Check if server is running
- Verify MongoDB connection
- Check browser console for errors
- Ensure encryption key is set

**Issue**: Socket.io connection fails
- Check CORS configuration
- Verify server URL in .env
- Check firewall settings
- Look at server logs

**Issue**: Decryption fails
- Ensure same encryption key is used
- Check IV is correct
- Verify message wasn't corrupted
- Check auth tag integrity

## Testing

### Create Test Users
1. Sign up with multiple accounts
2. Open in different browsers/tabs
3. Send messages between accounts
4. Verify messages are encrypted in MongoDB

### Test Encryption
```bash
# On the client, open DevTools console
const { encryptMessageClient, decryptMessageClient } = window.encryption;
const key = "your-key-here";
const encrypted = encryptMessageClient("Hello", key);
const decrypted = decryptMessageClient(encrypted.encryptedMessage, key, encrypted.iv);
```

## Contributing
Feel free to submit issues and enhancement requests!

## License
MIT

## Support
For issues, questions, or suggestions, please create an issue in the repository.
