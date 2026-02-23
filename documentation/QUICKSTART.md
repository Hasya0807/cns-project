# Quick Start Guide - Encrypted Chat Application

## 5-Minute Setup

### Prerequisites
- Node.js installed
- MongoDB installed locally OR MongoDB Atlas account
- 2 terminals open

### Step 1: Backend Setup (Terminal 1)

```bash
# Create backend directory
mkdir encrypted-chat-backend
cd encrypted-chat-backend

# Copy all backend files here:
# - server.js
# - package.json
# - models/ folder
# - routes/ folder
# - middleware/ folder
# - utils/ folder
# - .env.example

# Create .env file
cp .env.example .env

# Edit .env (nano .env or your editor)
# For local MongoDB:
# MONGODB_URI=mongodb://localhost:27017/encrypted-chat

# Install dependencies
npm install

# Start server
npm run dev
```

You should see: `Server running on port 5000`

### Step 2: Frontend Setup (Terminal 2)

```bash
# Create React app
npx create-react-app encrypted-chat-frontend
cd encrypted-chat-frontend

# Install dependencies
npm install axios socket.io-client crypto-js
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Copy React components:
# - AuthComponent.jsx to src/components/AuthComponent.jsx
# - ChatComponent.jsx to src/components/ChatComponent.jsx
# - client encryption.js to src/utils/encryption.js
# - App.jsx to src/App.js

# Create .env file
echo "REACT_APP_SERVER_URL=http://localhost:5000" > .env

# Start frontend
npm start
```

Your app should open at `http://localhost:3000`

## Testing the Application

### Test Scenario 1: Single Device, Multiple Browsers

1. **Browser 1**: 
   - Go to `http://localhost:3000`
   - Click "Sign Up"
   - Create User A (username: alice, email: alice@test.com, password: test123)

2. **Browser 2** (or Incognito):
   - Go to `http://localhost:3000`
   - Click "Sign Up"
   - Create User B (username: bob, email: bob@test.com, password: test123)

3. **Send Message**:
   - In Browser 1, select "bob" from users list
   - Type message: "Hello Bob!"
   - Click Send
   - In Browser 2, you should see the message instantly

### Test Scenario 2: Different Devices

1. On Device 1 (localhost:3000):
   - Login as Alice

2. On Device 2 (same network):
   - Change `localhost:3000` to `your-ip:3000`
   - Login as Bob
   - Messages will sync in real-time

## How the Encryption Works

### When Alice sends "Hello" to Bob:

```
1. Alice's React Client:
   - Generates random encryption key
   - Encrypts "Hello" with AES-256
   - Sends encrypted message to server

2. Backend (Node.js):
   - Receives encrypted message
   - Stores in MongoDB (still encrypted)
   - Sends to Bob via Socket.io

3. Bob's React Client:
   - Receives encrypted message
   - Uses same key to decrypt
   - Shows "Hello" in chat
```

### What's in the Database?

In MongoDB, messages look like:
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "senderId": "Alice's ID",
  "receiverId": "Bob's ID",
  "encryptedMessage": "u2FsdGVkX1...",
  "iv": "3d4f5f6g7h8i9j0k",
  "authTag": "a1b2c3d4e5f6g7h8",
  "createdAt": "2024-02-17T10:30:00Z"
}
```

Server has NO WAY to read messages!

## Common Issues & Solutions

### Issue: "Cannot find module 'express'"
```bash
# Solution: Install dependencies
npm install
```

### Issue: "MongoDB connection failed"
```bash
# Solution 1: Make sure MongoDB is running locally
mongod

# Solution 2: Use MongoDB Atlas (cloud)
# Get connection string from MongoDB Atlas and update .env:
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname
```

### Issue: Socket.io connection refused
```bash
# Solution: Make sure backend is running
# Check if server.js is running in terminal
# Verify PORT=5000 in .env
# Clear browser cache and refresh
```

### Issue: Messages not decrypting
```bash
# Solution: 
# 1. Check browser console for errors
# 2. Make sure both users are using same encryption key
# 3. Try opening in new incognito window
```

## File Structure Summary

```
project/
├── Backend/
│   ├── server.js ..................... Main server file
│   ├── package.json .................. Dependencies
│   ├── .env .......................... Configuration
│   ├── models/
│   │   ├── User.js ................... User schema
│   │   └── Message.js ................ Message schema
│   ├── routes/
│   │   ├── auth.js ................... Login/Signup
│   │   ├── messages.js ............... Message endpoints
│   │   └── users.js .................. User endpoints
│   ├── middleware/
│   │   └── auth.js ................... JWT verification
│   └── utils/
│       └── encryption.js ............. Server encryption (AES-256-GCM)
│
└── Frontend/
    ├── src/
    │   ├── App.js ..................... Main component
    │   ├── components/
    │   │   ├── AuthComponent.jsx ....... Login/Signup UI
    │   │   └── ChatComponent.jsx ....... Chat UI
    │   ├── utils/
    │   │   └── encryption.js .......... Client encryption (AES-256)
    │   └── index.js ................... Entry point
    └── package.json ................... Dependencies
```

## Next Steps

1. **Test with Multiple Users** - Create 3-4 test accounts
2. **Try Different Devices** - Use phone/tablet on same network
3. **Check Database** - View MongoDB collections with messages
4. **Monitor Encryption** - Open DevTools → Network to see encrypted payloads
5. **Deploy** - Follow README.md for production deployment

## Advanced Features to Add

- [ ] Message reactions/emojis
- [ ] File sharing with encryption
- [ ] Voice/video calls
- [ ] Message search
- [ ] User profiles/avatars
- [ ] Group chats
- [ ] Message expiration
- [ ] Read receipts
- [ ] End-to-end message authentication
- [ ] Key backup/recovery

## Resources

- Socket.io Docs: https://socket.io/docs/
- MongoDB Docs: https://docs.mongodb.com/
- Crypto-js: https://cryptojs.gitbook.io/
- React Docs: https://react.dev/

## Support Commands

```bash
# Check if backend is running
curl http://localhost:5000/

# Check MongoDB connection
mongosh

# Check Node.js version
node -v

# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# View backend logs in real-time
npm run dev
```

## Security Reminder

⚠️ This is a demonstration project. For production:
- Use HTTPS/TLS for all connections
- Implement proper key exchange (Diffie-Hellman)
- Use strong JWT secrets
- Implement rate limiting
- Add message verification
- Regular security audits

Enjoy secure chatting! 🔐
