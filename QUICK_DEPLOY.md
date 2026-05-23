# Deploy Your Research System for FREE - Complete Guide

## Choose Your Deployment Path

### **Easiest Path (Recommended)** ⭐
- **Frontend**: Deploy to Vercel (takes 5 minutes)
- **Backend**: Deploy to Hugging Face Spaces (takes 10 minutes)
- **Cost**: $0/month
- **Uptime**: 100% (never sleeps)

### Alternative Paths
- **All-in-one Railway**: $0 for first month, then $5/month
- **Render**: $0 but sleeps after 15 min of inactivity
- **Self-host**: More complex but possible

---

## Part 1: Deploy Backend to Hugging Face Spaces (10 min)

### Prerequisites
- GitHub account (free)
- Hugging Face account (free, at https://huggingface.co)

### Step-by-Step

**Note**: API keys are **OPTIONAL** for deployment! Users input them directly in the app when they use it. Skip to step 2 if you want to deploy without pre-configuring keys.

1. **(OPTIONAL) Pre-configure API Keys**
   - If you want users to NOT have to enter keys every time, get them now:
   - Groq: https://console.groq.com (free, unlimited)
   - Tavily: https://tavily.com (free, 1000 searches/month)

2. **Create Hugging Face Space**
   - Go to https://huggingface.co/spaces
   - Click "Create new Space"
   - Name: `research-api-backend` (or any name)
   - SDK: **Docker** (important!)
   - Visibility: Public
   - Click "Create Space"

3. **Upload Code to Space**

   **Option A: Using Git (Recommended)**
   ```bash
   # In terminal, navigate to your project root
   cd "f:\Multi Agent Research System"
   
   # Clone your HF Space repo
   git clone https://huggingface.co/spaces/YOUR-USERNAME/research-api-backend
   cd research-api-backend
   
   # Copy backend files
   cp -r ../backend/* .
   
   # Push to Hugging Face
   git add .
   git commit -m "Initial FastAPI backend"
   git push
   ```

   **Option B: Using Web UI**
   - Go to your Space on HF
   - Click Files → Upload files
   - Select all files from your `backend` folder
   - Upload

4. **(OPTIONAL) Set Environment Variables**
   - Only do this if you have API keys from step 1 and want to pre-configure them
   - Go to your HF Space → Settings → "Repository secrets"
   - Click "New secret" and add:
     ```
     GROQ_API_KEY = your-groq-key-here          (optional)
     TAVILY_API_KEY = your-tavily-key-here      (optional)
     ENVIRONMENT = production                    (recommended)
     ```
   - If you skip this, users will enter their keys when using the app

5. **Wait for Deploy**
   - HF Spaces auto-detects your Dockerfile
   - Should build and deploy in 2-5 minutes
   - You'll get a URL like: `https://username-research-api-backend.hf.space`
   - Test it: Visit `https://your-url/api/health` in browser

**Backend is now LIVE!**

---

## Part 2: Deploy Frontend to Vercel (5 min)

### Prerequisites
- GitHub account with your project repo

### Step-by-Step

1. **Connect GitHub to Vercel**
   - Go to https://vercel.com
   - Click "Sign up" (use GitHub account)
   - Click "New Project"
   - Select your GitHub repo

2. **Configure Project**
   - Framework: Next.js (auto-detected)
   - Root directory: `./frontend`
   - Click "Deploy"

3. **Add Environment Variables**
   - After deploy, go to Project Settings → Environment Variables
   - Click "Add Environment Variable"
   - **Name**: `BACKEND_URL`
   - **Value**: `https://your-hf-space-url` (from Part 1)
   - Click "Save"
   - **Redeploy** (it will redeploy automatically)

**Frontend is now LIVE!**

---

## Connect Frontend to Backend

The connection is **automatic** once you set `BACKEND_URL` in Vercel!

**How it works:**
1. Your frontend loads on Vercel
2. When you click "Research", it calls `/api/research`
3. Next.js rewrites this to your Hugging Face Space backend
4. Backend processes request, returns response
5. Frontend displays results

**Test it:**
1. Go to your Vercel frontend URL
2. Enter a topic, click "Research"
3. Wait for results
4. Success!

---

## Total Setup Summary

| Step | Time | Cost | Done? |
|------|------|------|-------|
| Get API keys (Groq + Tavily) | 5 min | $0 | ☐ |
| Deploy backend to HF Spaces | 10 min | $0 | ☐ |
| Deploy frontend to Vercel | 5 min | $0 | ☐ |
| Set BACKEND_URL in Vercel | 2 min | $0 | ☐ |
| **TOTAL** | **22 min** | **$0/month** | ☐ |

---

## Troubleshooting

### "CORS Error" when using the app
- Make sure `BACKEND_URL` is set in Vercel
- Check it's the correct HF Space URL (should end with `.hf.space`)
- Redeploy frontend: Vercel → Deployments → Redeploy

### "API Health Check Failed"
- Visit `https://your-hf-space-url/api/health` directly in browser
- If 404: Backend didn't deploy correctly
  - Check HF Space build logs
  - Check API keys are set correctly

### Backend takes long to respond
- First request might be slow (HF Spaces wakes up container)
- Subsequent requests are fast
- This is normal! Free tier behavior

### "API key missing" error
- Check you set `GROQ_API_KEY` and `TAVILY_API_KEY` in HF Space secrets
- Restart the HF Space: Click "Settings" → "Restart Space"

---

## Additional Resources

- **Full Deployment Guide**: See `DEPLOYMENT_GUIDE.md` in project root
- **HF Spaces Docs**: https://huggingface.co/docs/hub/spaces
- **Vercel Docs**: https://vercel.com/docs
- **FastAPI Docs**: https://fastapi.tiangolo.com/

---

## You're Done!

Your Multi-Agent Research System is **live on the internet** with:
- ✅ Production-ready deployment
- ✅ Zero monthly cost
- ✅ Unlimited requests
- ✅ Never expires

**Next Steps:**
1. Share your Vercel URL with friends
2. Customize the frontend colors/branding
3. Add more AI providers (OpenAI, Claude, etc.)
4. Monitor usage in platform dashboards

---

## Pro Tips

- **Groq is free and fast**: Use it by default (no API key costs)
- **Tavily search is free**: First 100 searches free per month
- **Vercel never sleeps**: Your frontend is always available
- **HF Spaces never sleeps**: Your backend is always available
- **Total cost**: $0/month (truly free!)

Happy deploying! 🚀
