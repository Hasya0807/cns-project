# 🚀 Deployment Guide - Encrypted Chat Application

This guide will help you deploy your application to **Render** (Backend) and **Vercel** (Frontend).

---

## 📋 Prerequisites

- GitHub account (https://github.com)
- Render account (https://render.com) - FREE
- Vercel account (https://vercel.com) - FREE
- MongoDB Atlas account with active cluster (already set up ✓)

---

## 🔧 Step 1: Prepare Your Code for Deployment

### 1.1 Update Backend Configuration

✅ **Already set up:** `.env` and `.gitignore` files created

Verify your backend `.env` file has these variables:
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=your_mongodb_atlas_connection_string_here
JWT_SECRET=your_strong_jwt_secret_key_here
CLIENT_URL=http://localhost:3000
```

### 1.2 Update Frontend Configuration

Create or update `.env` file in the `frontend/` folder:
```env
REACT_APP_API_URL=http://localhost:5000
```

---

## 📤 Step 2: Deploy Backend to Render

### 2.1 Create Render Account and Connect GitHub

1. Go to https://render.com and sign up
2. Click "New" → "Web Service"
3. Select "Deploy an existing GitHub repo"
4. Connect your GitHub account and authorize Render
5. Select your CNS project repository

### 2.2 Configure Render Deployment

**Fill in these settings:**

| Setting | Value |
|---------|-------|
| **Name** | encrypted-chat-backend |
| **Environment** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | Free |

### 2.3 Add Environment Variables on Render

Click "Advanced" and add these environment variables:

```
PORT=5000
NODE_ENV=production
MONGODB_URI=your_mongodb_atlas_connection_string_here
JWT_SECRET=your_strong_jwt_secret_key_here
CLIENT_URL=https://your-frontend-domain.vercel.app
```

⚠️ **Important:** Replace `CLIENT_URL` with your actual Vercel domain after deploying frontend

### 2.4 Deploy

Click "Create Web Service" and wait for deployment to complete.

**Your backend URL will look like:**
```
https://encrypted-chat-backend.onrender.com
```

Save this URL - you'll need it for the frontend!

---

## 📤 Step 3: Deploy Frontend to Vercel

### 3.1 Create Vercel Account

1. Go to https://vercel.com and sign up with GitHub
2. Click "Add New..." → "Project"
3. Select your CNS project repository
4. Select the `frontend` folder as the root directory

### 3.2 Configure Vercel Deployment

In the "Configure Project" screen:

**Environment Variables:**
```
REACT_APP_API_URL=https://encrypted-chat-backend.onrender.com
```

**Build Settings:**
- Framework: Create React App
- Build Command: `npm run build`
- Output Directory: `build`
- Install Command: `npm install`

### 3.3 Deploy

Click "Deploy" and wait for completion.

**Your frontend URL will be:** `https://your-project-name.vercel.app`

---

## 🔄 Step 4: Update Backend with Frontend URL

After Vercel deployment, update your Render backend:

1. Go to Render dashboard
2. Select your "encrypted-chat-backend" service
3. Go to "Environment"
4. Update `CLIENT_URL` to your Vercel domain
5. Click "Save Changes" (this will redeploy the backend)

---

## ✅ Step 5: Test Your Deployment

### Test Backend API:
```bash
curl https://encrypted-chat-backend.onrender.com/api/auth
```

### Test Frontend:
1. Open https://your-project-name.vercel.app
2. Try signing up
3. Create a message
4. Test real-time chat functionality

---

## 🚨 Troubleshooting

### Backend not connecting to MongoDB
- Verify MongoDB Atlas connection string is correct
- Check if your IP is whitelisted in MongoDB Atlas (Network Access)
- Render uses dynamic IPs, so allow access from 0.0.0.0/0

### Frontend can't connect to backend
- Verify `REACT_APP_API_URL` environment variable is set correctly
- Check browser console for CORS errors
- Ensure backend `CLIENT_URL` includes frontend domain

### Socket.io connection failing
- Verify Socket.io configuration in backend
- Check that Render's WebSocket support is enabled
- Frontend should use `http://` for local and `https://` for production

### Slow response times
- Render free tier has CPU limitations
- Consider upgrading to Render Starter ($7/month) for better performance

---

## 🔐 Security Notes

⚠️ **Never commit `.env` files to GitHub!**
- `.gitignore` prevents this, but double-check before pushing

🔑 **Store sensitive data safely:**
- JWT_SECRET should be strong and random
- MONGODB_URI contains password - keep it secret
- Don't share these values in public repositories

---

## 📚 Additional Resources

- **Render Docs:** https://render.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **MongoDB Atlas:** https://www.mongodb.com/docs/atlas/
- **Express + Socket.io:** https://socket.io/docs/v4/

---

## 🎉 You're Done!

Your encrypted chat application is now live and accessible to the world!

**Frontend:** https://your-project-name.vercel.app  
**Backend API:** https://encrypted-chat-backend.onrender.com

Enjoy your deployed application! 🚀
