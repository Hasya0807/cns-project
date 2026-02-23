# Complete Setup & Installation Guide

## Project Overview

This is a **full-stack encrypted chat application** with:
- **Backend**: Node.js/Express with MongoDB
- **Frontend**: React with real-time Socket.io
- **Encryption**: AES-256 end-to-end encrypted messages
- **Features**: Real-time messaging, user authentication, online status, typing indicators

## What You Have

```
📦 Complete Package Includes:
├── Backend (Node.js + Express)
│   ├── User Authentication (JWT + bcrypt)
│   ├── Message Encryption/Decryption (AES-256-GCM)
│   ├── Real-time Communication (Socket.io)
│   └── MongoDB Integration
│
├── Frontend (React)
│   ├── Login/Signup UI
│   ├── Chat Interface with encryption
│   ├── User list with online status
│   └── Real-time message sync
│
└── Documentation
    ├── QUICKSTART.md (5-minute setup)
    ├── README.md (detailed guide)
    ├── ARCHITECTURE.md (technical deep dive)
    └── SETUP_GUIDE.md (this file)
```

## Prerequisites

### Required Software
- **Node.js** (v14+) - Download from https://nodejs.org/
- **MongoDB** - Either:
  - **Local**: Download from https://www.mongodb.com/try/download/community
  - **Cloud**: Create free account at https://www.mongodb.com/cloud/atlas

### Verify Installation
```bash
# Check Node.js
node -v
npm -v

# Check MongoDB (if local)
mongod --version
```

## Full Installation Instructions

### Option 1: Local MongoDB Setup (Beginner)

#### Step 1: Install MongoDB Locally

**Windows:**
1. Download MongoDB Community Edition from mongodb.com
2. Run installer
3. Choose "Install MongoDB as a Service"
4. MongoDB will start automatically

**Mac:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu):**
```bash
sudo apt-get update
sudo apt-get install -y mongodb

# Start MongoDB
sudo systemctl start mongodb
```

#### Step 2: Verify MongoDB Connection
```bash
# Open new terminal
mongosh

# You should see MongoDB shell
# Type: exit
```

### Option 2: MongoDB Atlas (Cloud) Setup

1. **Create Account**
   - Go to https://www.mongodb.com/cloud/atlas
   - Click "Sign Up"
   - Create account with email

2. **Create Cluster**
   - Click "Create a Deployment"
   - Choose "Shared Cluster" (Free)
   - Select region (AWS recommended)
   - Click "Create"

3. **Create Database User**
   - Click "Security" → "Database Access"
   - Click "Add New Database User"
   - Username: `chatuser`
   - Password: Generate secure password
   - Click "Add User"

4. **Get Connection String**
   - Click "Deployment" → "Connect"
   - Choose "Connect your application"
   - Copy connection string
   - Replace `<password>` with your password
   - Replace `<cluster-name>` with your cluster name

5. **Whitelist IP (if needed)**
   - Click "Security" → "Network Access"
   - Click "Add IP Address"
   - Choose "Allow access from anywhere" (0.0.0.0/0)

---

## Backend Setup (Node.js Server)

### Step 1: Create Project Structure

```bash
# Create main project directory
mkdir encrypted-chat-project
cd encrypted-chat-project

# Create backend directory
mkdir backend
cd backend
```

### Step 2: Copy Backend Files

Copy these files into the `backend` folder:
- `server.js`
- `package.json`
- `models/` folder (User.js, Message.js)
- `routes/` folder (auth.js, messages.js, users.js)
- `middleware/` folder (auth.js)
- `utils/` folder (encryption.js)

### Step 3: Install Dependencies

```bash
# In backend directory
npm install
```

This installs:
- express (web framework)
- socket.io (real-time communication)
- mongoose (MongoDB database)
- bcryptjs (password hashing)
- jsonwebtoken (authentication)
- cors (cross-origin requests)
- dotenv (environment variables)

### Step 4: Configure Environment

Create `.env` file in backend directory:

**For Local MongoDB:**
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/encrypted-chat
JWT_SECRET=your-super-secret-key-change-this-in-production
CLIENT_URL=http://localhost:3000
```

**For MongoDB Atlas:**
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://chatuser:your-password@cluster.mongodb.net/encrypted-chat?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-key-change-this-in-production
CLIENT_URL=http://localhost:3000
```

### Step 5: Start Backend Server

```bash
# Start with auto-reload (development)
npm run dev

# Or start normally
npm start
```

**Expected Output:**
```
MongoDB connected
Server running on port 5000
```

✅ **Backend is ready!** Keep this terminal open.

---

## Frontend Setup (React Application)

### Step 1: Create React App

```bash
# Go back to main project directory
cd ..

# Create React app
npx create-react-app frontend
cd frontend
```

### Step 2: Install Additional Dependencies

```bash
# Install required packages
npm install axios socket.io-client crypto-js

# Install styling tools
npm install -D tailwindcss postcss autoprefixer

# Initialize Tailwind
npx tailwindcss init -p
```

### Step 3: Copy React Components

Replace these files in the `src/` folder:
- `App.js` (use provided `App.jsx`)
- Create `components/` folder with:
  - `AuthComponent.jsx`
  - `ChatComponent.jsx`
- Create `utils/` folder with:
  - `encryption.js` (use provided `client-encryption.js`)

### Step 4: Update Tailwind Configuration

Edit `tailwind.config.js`:
```javascript
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### Step 5: Add Tailwind CSS

Edit `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Step 6: Configure Environment

Create `.env` in frontend directory:
```env
REACT_APP_SERVER_URL=http://localhost:5000
```

### Step 7: Start Frontend

```bash
# In frontend directory
npm start
```

**Expected Output:**
- Browser opens to `http://localhost:3000`
- You see the login/signup screen

✅ **Frontend is ready!**

---

## Testing the Application

### Test Scenario: Sign Up & Chat

**Terminal 1** (Backend running on port 5000):
```bash
cd backend
npm run dev
```

**Terminal 2** (Frontend running on port 3000):
```bash
cd frontend
npm start
```

**In Browser:**

1. **Browser 1 - Alice's Account**
   - URL: `http://localhost:3000`
   - Click "Sign Up"
   - Fill form:
     - Username: `alice`
     - Email: `alice@test.com`
     - Password: `password123`
   - Click "Sign Up"

2. **Browser 2 - Bob's Account**
   - Open new browser/incognito window
   - URL: `http://localhost:3000`
   - Click "Sign Up"
   - Fill form:
     - Username: `bob`
     - Email: `bob@test.com`
     - Password: `password123`
   - Click "Sign Up"

3. **Send Messages**
   - In Browser 1:
     - Select "bob" from user list
     - Type message: "Hello Bob!"
     - Press Send
   - In Browser 2:
     - Instantly see message: "Hello Bob!"
     - Type reply: "Hi Alice!"
   - In Browser 1:
     - See Bob's reply instantly

✅ **End-to-end encryption working!**

---

## Verify Encryption is Working

### Check Database

```bash
# Open MongoDB shell
mongosh

# Or if using cloud, use MongoDB Atlas Web Interface

# View database
use encrypted-chat

# View messages collection
db.messages.find()

# Example output:
# You'll see encryptedMessage field with random-looking text
# Server cannot decrypt this - only clients with the key can!
```

### Check Network Traffic

1. Open Browser DevTools (F12)
2. Go to "Network" tab
3. Send a message
4. Find the POST request to `/api/messages/send`
5. Look at the request body - message is encrypted
6. Open DevTools "Application" → "Session Storage"
7. See `enc_key_*` entries with encryption keys

---

## Project File Structure

```
encrypted-chat-project/
│
├── backend/
│   ├── models/
│   │   ├── User.js              # User database schema
│   │   └── Message.js           # Message database schema
│   │
│   ├── routes/
│   │   ├── auth.js              # Login/Signup endpoints
│   │   ├── messages.js          # Message endpoints
│   │   └── users.js             # User list endpoints
│   │
│   ├── middleware/
│   │   └── auth.js              # JWT verification
│   │
│   ├── utils/
│   │   └── encryption.js        # Server encryption (AES-256-GCM)
│   │
│   ├── server.js                # Main server file
│   ├── package.json             # Dependencies
│   ├── .env                     # Configuration (DO NOT COMMIT)
│   └── .env.example             # Template (COMMIT THIS)
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AuthComponent.jsx    # Login/Signup UI
│   │   │   └── ChatComponent.jsx    # Chat interface
│   │   │
│   │   ├── utils/
│   │   │   └── encryption.js        # Client encryption (AES-256)
│   │   │
│   │   ├── App.js               # Main React component
│   │   ├── index.css            # Tailwind CSS
│   │   └── index.js             # React entry point
│   │
│   ├── .env                     # Frontend config
│   ├── tailwind.config.js       # Tailwind configuration
│   ├── package.json             # Dependencies
│   └── public/                  # Static assets
│
└── Documentation/
    ├── README.md                # Complete documentation
    ├── QUICKSTART.md            # 5-minute setup
    ├── ARCHITECTURE.md          # Technical details
    └── SETUP_GUIDE.md          # This file
```

---

## Common Issues & Solutions

### Issue 1: "Cannot find module 'express'"
```bash
# Solution: Install dependencies
cd backend
npm install
```

### Issue 2: "MongoDB connection refused"
**For Local MongoDB:**
```bash
# Terminal 1: Start MongoDB
mongod

# Terminal 2: Run backend
cd backend
npm run dev
```

**For MongoDB Atlas:**
- Check connection string in `.env`
- Verify IP address is whitelisted
- Check username/password are correct

### Issue 3: "Socket.io connection refused"
```bash
# Make sure backend is running on port 5000
# Check .env has correct PORT=5000
# Clear browser cache (Ctrl+Shift+Delete)
# Hard refresh (Ctrl+Shift+R)
```

### Issue 4: "Port already in use"
```bash
# Find process using port 5000
# Windows:
netstat -ano | findstr :5000

# Mac/Linux:
lsof -ti:5000

# Kill the process
# Windows: taskkill /PID <PID> /F
# Mac/Linux: kill -9 <PID>
```

### Issue 5: Messages not encrypting
- Check browser console for errors
- Verify `crypto-js` is installed: `npm list crypto-js`
- Clear sessionStorage and try again
- Check that encryption key was generated

### Issue 6: Can't send messages
- Verify both users are logged in
- Check backend logs for errors
- Verify receiver exists in database
- Make sure Socket.io connection is established

---

## Deployment Guide

### Deploy Backend (Heroku)

1. **Create Heroku Account**
   - Go to https://www.heroku.com
   - Sign up for free account

2. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   heroku login
   ```

3. **Create Heroku App**
   ```bash
   cd backend
   heroku create your-app-name
   ```

4. **Set Environment Variables**
   ```bash
   heroku config:set JWT_SECRET=your-secret-key
   heroku config:set MONGODB_URI=your-atlas-connection-string
   heroku config:set CLIENT_URL=your-frontend-url
   ```

5. **Deploy**
   ```bash
   git push heroku main
   ```

### Deploy Frontend (Vercel)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   cd frontend
   vercel --env REACT_APP_SERVER_URL=your-backend-url
   ```

### Deploy Both (Alternative: AWS)

Use AWS EC2, Lightsail, or Elastic Beanstalk for both backend and frontend.

---

## Security Checklist for Production

- [ ] Change `JWT_SECRET` to strong random string
- [ ] Use HTTPS/TLS for all connections
- [ ] Enable CORS only for your domain
- [ ] Implement rate limiting on auth routes
- [ ] Use MongoDB Atlas with authentication
- [ ] Enable MongoDB encryption at rest
- [ ] Implement key rotation for encryption keys
- [ ] Set up proper logging and monitoring
- [ ] Regular security audits
- [ ] Keep dependencies updated

---

## Next Steps

1. ✅ Complete setup (you're here!)
2. ✅ Test locally with multiple browsers
3. ✅ Verify encryption in database
4. ✅ Add more users and test conversations
5. Deploy to production
6. Set up monitoring/logging
7. Add more features (file sharing, voice calls, etc.)

---

## Getting Help

### Debugging Tips
1. Check browser console (F12 → Console tab)
2. Check server logs (terminal running backend)
3. Check network requests (F12 → Network tab)
4. Check MongoDB directly with mongosh

### Common Commands
```bash
# Backend logs
npm run dev

# Frontend logs
npm start

# Check MongoDB connection
mongosh

# Kill port 5000
# Windows: netstat -ano | findstr :5000
# Mac/Linux: lsof -ti:5000 | xargs kill -9
```

---

## You're All Set! 🎉

You now have a fully functional end-to-end encrypted chat application!

### What to do next:
1. Read `README.md` for detailed documentation
2. Check `ARCHITECTURE.md` for technical details
3. Review `QUICKSTART.md` for quick reference
4. Customize the UI and add features
5. Deploy to production when ready

**Happy coding!** 🚀
