# Deployment Configuration Reference

## Backend (Node.js + Express)

### render.yaml (Optional - for infrastructure as code)
```yaml
services:
  - type: web
    name: encrypted-chat-backend
    runtime: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: PORT
        value: 5000
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        scope: secret
      - key: JWT_SECRET
        scope: secret
      - key: CLIENT_URL
        value: https://your-frontend.vercel.app
```

## Frontend (React)

### vercel.json (Optional - for optimization)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "env": {
    "REACT_APP_SERVER_URL": "@react_app_server_url"
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache"
        }
      ]
    }
  ]
}
```

## Environment Variables Checklist

### Backend (.env for production on Render)
- [ ] PORT=5000
- [ ] NODE_ENV=production
- [ ] MONGODB_URI=[your connection string]
- [ ] JWT_SECRET=[strong random string]
- [ ] CLIENT_URL=[your vercel domain]

### Frontend (.env for production on Vercel)
- [ ] REACT_APP_SERVER_URL=[your render domain]

## Security Checklist

- [ ] Never commit .env to Git
- [ ] .gitignore includes node_modules/
- [ ] JWT_SECRET is strong and random
- [ ] MongoDB connection string is in .env only
- [ ] CORS is configured correctly
- [ ] Socket.io allows correct origin

## Post-Deployment Checklist

- [ ] Frontend loads without errors
- [ ] Can sign up and create account
- [ ] Can log in successfully
- [ ] Can chat in real-time
- [ ] Messages are encrypted
- [ ] User list updates in real-time
- [ ] Typing indicators work
- [ ] Can see online/offline status
- [ ] Backend API is responsive
- [ ] No CORS errors in browser console

## Monitoring

### Render Dashboard
- Check logs for backend errors
- Monitor memory usage
- Check uptime

### Vercel Dashboard
- Check build logs
- Monitor analytics
- Check error tracking

## Performance Tips

1. **Backend (Render)**
   - Upgrade from free tier if needed 24/7 uptime
   - Monitor MongoDB connection pool
   - Use caching for frequently accessed data

2. **Frontend (Vercel)**
   - Enable compression (automatic)
   - Lazy load components
   - Optimize images

3. **Database (MongoDB Atlas)**
   - Use indexes on frequently queried fields
   - Monitor connection usage
   - Upgrade tier if needed

## Useful Commands

```bash
# Test backend locally before deploying
cd backend
npm install
npm run dev

# Test frontend locally before deploying
cd frontend
npm install
npm start

# Build frontend for production
npm run build

# Check environment variables are set
echo $REACT_APP_SERVER_URL
```

## Rollback Instructions

### If Render deployment fails:
1. Go to Render dashboard
2. Select your service
3. Click "Deployment History"
4. Click "Rollback" on the previous working version

### If Vercel deployment fails:
1. Go to Vercel dashboard
2. Select your project
3. Go to "Deployments"
4. Click "Rollback" on the previous working version
