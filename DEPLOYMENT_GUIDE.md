# Deployment Guide - Multi-Agent Research System

## Quick Overview

You have **multiple free deployment options**:

| Platform | Frontend | Backend | Cost | Notes |
|----------|----------|---------|------|-------|
| **Hugging Face Spaces** | ❌ | ✅ | FREE | Never expires, no auto-sleep |
| **Vercel** | ✅ | ❌ | FREE | Best for Next.js frontend |
| **Railway** | ✅ | ✅ | $5/mo after free month | Good all-in-one option |
| **Render** | ✅ | ✅ | FREE (with limitations) | Free tier sleeps after 15 min |

**Recommended Setup**: Vercel (Frontend) + Hugging Face Spaces (Backend)

---

## Option 1: Hugging Face Spaces (RECOMMENDED)

This is the **best free option** - truly unlimited, never expires, no auto-sleep.

### Step 1: Create a Space

1. Go to https://huggingface.co/spaces
2. Click "Create new Space"
3. Fill in:
   - **Name**: something like `research-api-backend`
   - **License**: MIT (or your choice)
   - **Space SDK**: Select **"Docker"** (this is important!)
4. Click "Create Space"

### Step 2: Upload Your Code

Option A - Using Git (Recommended):
```bash
cd your-workspace
git clone https://huggingface.co/spaces/YOUR-USERNAME/research-api-backend
cd research-api-backend
cp -r ../backend/* .
git add .
git commit -m "Initial commit: FastAPI backend"
git push
```

Option B - Using HF Web UI:
- Go to your Space settings
- Upload the entire `backend` folder contents

### Step 3: (OPTIONAL) Set Environment Variables

**Note**: API keys are optional! Users provide them dynamically in the app when they use it.

1. Go to your Space → Settings → "Repository secrets"
2. Only add these if you want to pre-configure them:
   - `GROQ_API_KEY` = [Get free from https://console.groq.com] (optional)
   - `TAVILY_API_KEY` = [Get free from https://tavily.com] (optional)
   - `ENVIRONMENT` = `production` (recommended)
3. If you skip this, users will enter their API keys when using the app

### Step 4: Deploy & Get Your URL

Once you push, HF Spaces will:
- Auto-detect `Dockerfile`
- Build Docker image
- Deploy automatically
- Give you a public URL like: `https://username-research-api-backend.hf.space`

**That's it!** Your backend is live.

---

## Option 2: Vercel (Frontend ONLY)

Since Vercel doesn't support Python backends, use this for your Next.js frontend.

### Step 1: Deploy Frontend

```bash
cd frontend
npm install
```

### Step 2: Connect to Vercel

1. Push your repo to GitHub
2. Go to https://vercel.com
3. Click "New Project"
4. Select your GitHub repo
5. Choose "frontend" as root directory
6. Deploy

### Step 3: Set Backend URL

1. In Vercel Dashboard → Project Settings → Environment Variables
2. Add: `NEXT_PUBLIC_API_URL=https://your-hf-space-url`
3. Redeploy

---

## Option 3: Railway (All-in-One)

Good option that supports both frontend and backend.

### Backend Setup

1. Fork your repo on GitHub
2. Go to https://railway.app
3. Click "New Project" → "Deploy from GitHub"
4. Select your repository
5. Railway auto-detects `Procfile`
6. Add environment variables
7. Deploy

**Note**: Free tier is only 1 month, then $5/month.

### Frontend Setup

Same process, Railway will detect `package.json` and `next.config.js`.

---

## Option 4: Render

Good for learning, but free tier has limitations (sleeps after 15 min).

### Backend

1. Go to https://render.com
2. Create new "Web Service"
3. Connect GitHub
4. Select root: `./backend`
5. Build: `pip install -r requirements.txt`
6. Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
7. Add environment variables
8. Deploy

---

## Code Changes Made for Multi-Platform Support

### What's New

1. **Dockerfile** - Works with any platform that supports Docker
   - Automatically uses `$PORT` environment variable
   - HF Spaces uses 7860, Railway uses 8000
   - Other platforms can customize

2. **.dockerignore** - Optimizes Docker build

3. **Updated CORS** in `main.py`
   - Supports `*.hf.space` wildcard
   - Works with localhost, Railway, Render, etc.
   - Configurable via `ALLOW_ORIGINS` env var

4. **Health Check Endpoint** - Already existed at `/api/health`
   - Used by platforms for uptime monitoring

5. **Environment-Aware Config**
   - `ENVIRONMENT` variable controls CORS strictness
   - Backward compatible with Railway's `Procfile`

---

## Connecting Frontend to Backend

### In Your Next.js Frontend

Update `frontend/next.config.js` or environment files:

```javascript
// Use environment variable
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// In your API calls:
fetch(`${API_URL}/api/research`, { ... })
```

### Environment Variables

**Local Development:**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Deployed:**
```
NEXT_PUBLIC_API_URL=https://username-research-api-backend.hf.space
```

---

## Verification Checklist

- [ ] Backend deployed and running
- [ ] Frontend deployed and pointing to backend
- [ ] Health check works: `GET /api/health`
- [ ] CORS allows frontend origin
- [ ] API keys configured in backend
- [ ] Test research endpoint with sample topic

---

## Troubleshooting

### Backend returns CORS error

Check:
1. Frontend URL matches `ALLOW_ORIGINS` in backend
2. Backend's `CORS` middleware is configured correctly
3. Run: `curl -H "Origin: your-frontend-url" https://your-backend-url/api/health`

### Port conflicts

- HF Spaces: Always uses 7860
- Railway: Check in dashboard
- Local: Change port in `uvicorn` command

### API Keys not working

- Check env vars in deployment platform settings
- Make sure keys are actually set (not just in `.env` file)
- Test with Groq (free, no key needed)

### Build fails on deployment

- Check Dockerfile paths are correct
- Ensure `requirements.txt` is in backend folder
- Check platform has enough storage (usually >1GB free)

---

## You're Done!

Your Multi-Agent Research System is now live on the internet, with zero monthly costs!

**Questions?** Check deployment platform docs:
- [HF Spaces Docs](https://huggingface.co/docs/hub/spaces)
- [Vercel Docs](https://vercel.com/docs)
- [Railway Docs](https://railway.app/docs)
