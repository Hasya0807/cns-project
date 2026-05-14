#!/bin/bash

# ✅ DEPLOYMENT CHECKLIST FOR ENCRYPTED CHAT APP

echo "🔍 Checking deployment prerequisites..."

# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install it from https://git-scm.com/"
    exit 1
fi
echo "✅ Git installed"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install it from https://nodejs.org/"
    exit 1
fi
echo "✅ Node.js $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi
echo "✅ npm $(npm --version)"

echo ""
echo "📋 DEPLOYMENT STEPS:"
echo ""
echo "1️⃣  Push your code to GitHub"
echo "   git add ."
echo "   git commit -m 'Prepare for deployment'"
echo "   git push origin main"
echo ""
echo "2️⃣  Deploy Backend to Render (https://render.com)"
echo "   - New Web Service"
echo "   - Connect GitHub repo"
echo "   - Start Command: npm start"
echo "   - Add env variables (see DEPLOYMENT_GUIDE.md)"
echo ""
echo "3️⃣  Deploy Frontend to Vercel (https://vercel.com)"
echo "   - Import project"
echo "   - Select 'frontend' folder"
echo "   - Add REACT_APP_SERVER_URL env variable"
echo "   - Deploy"
echo ""
echo "4️⃣  Update Backend with Frontend URL"
echo "   - Go to Render backend settings"
echo "   - Update CLIENT_URL to your Vercel domain"
echo ""
echo "5️⃣  Test the deployment"
echo "   - Visit your Vercel frontend URL"
echo "   - Test signup/login"
echo "   - Test real-time chat"
echo ""
echo "✨ All done! Your app is live! 🎉"
