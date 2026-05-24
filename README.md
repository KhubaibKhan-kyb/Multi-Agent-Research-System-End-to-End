# Argus: Multi-Agent Research System

A real-time, multi-agent AI research assistant. This system takes a user topic and orchestrates four specialized AI agents to search the web, scrape documentation, write a comprehensive report, and critique its own output. 

The architecture is fully decoupled, using a Next.js frontend and a stateless FastAPI backend. It is designed to be thread-safe, handle concurrent users, and stream reasoning in real-time.

## Architecture & Core Features

Instead of relying on basic agent templates, this backend was built from scratch to handle real production environments. 

* **Stateless & Thread-Safe:** API keys are injected dynamically per request. There are no global client initializations that could cause cross-talk or crashes when multiple users hit the server concurrently.
* **AI Time-Travel Prevention:** LLMs naturally default to their older training data. This system uses dynamic timestamp injections in the core system prompts, ensuring the agents always know the current date and prioritize fetching the absolute latest news and documentation.
* **Strict CORS Routing:** Built-in middleware securely routes traffic between separated frontend (Vercel) and backend (Hugging Face) domains.
* **Dynamic Model Routing:** Users can bring their own API keys for paid models (OpenAI, Anthropic, Google), or use the integrated free tier powered by Groq (Llama 3). Keys are never stored; they are used in memory and immediately discarded.

## The Agent Pipeline

1. **Search Agent:** Uses the Tavily API to find recent, reliable information across the web.
2. **Reader Agent:** Extracts and cleans relevant text directly from the target URLs.
3. **Writer Chain:** Composes a structured, insightful research report based on the scraped data.
4. **Critic Chain:** Reviews the report, scores it, and provides actionable feedback.

## Features

**Multiple AI Models**
- Free: Groq (Llama 3.3 70B, Llama 3.1 8B, Gemma 2, Mixtral)
- Paid: OpenAI (GPT-4o, GPT-4o mini), Anthropic (Claude), Google (Gemini)

**Real-Time Streaming**
- Watch each research stage complete as it happens
- Live progress indicators and stage transitions

**Your Own API Keys**
- Bring your own paid model keys (OpenAI, Anthropic, Google)
- Free Groq tier requires no key
- Keys are **never stored** - sent per-request only

**Web Search & Scraping**
- Powered by Tavily API
- Automatic URL extraction and content scraping

**Beautiful UI**
- Responsive design 
- Dark theme with smooth animations
- Markdown support for formatted reports

---

## Local Setup

### 1. Prerequisites
* Python 3.9+
* Node.js 16+

### 2. Backend Setup (FastAPI)
Navigate to the root directory and install the Python dependencies:

```bash
pip install -r requirements.txt

---

### 2. Install Backend Dependencies

```bash
# From project root
uv pip install -r requirements.txt
```

Or with pip:
```bash
pip install -r requirements.txt
```

### 3. Start Python Server on your Configured Port

```bash
uvicorn main:app --reload --port 7086
```

### 4. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 5. Start Everything

```bash
npm run dev
```

This starts both the backend (FastAPI on port 7086) and frontend (Next.js on port 3000) simultaneously.

You'll see:
```
✓ Backend: Uvicorn running on http://127.0.0.1:7086
✓ Frontend: http://localhost:3000
```

### 6. Open in Browser

Visit **http://localhost:3000** and start researching!

---

## How It Works

### Architecture

```
┌─────────────────┐
│   React UI      │  ← User selects model, topic, API keys
│  (Frontend)     │
└────────┬────────┘
         │ POST /api/research (streaming)
         ▼
┌─────────────────────────────────┐
│    FastAPI Server (Backend)     │
├─────────────────────────────────┤
│ 1. Build LLM                    │
│    └─ Creates the right LLM     │
│       based on user's choice    │
│                                 │
│ 2. Search Agent                 │
│    └─ web_search() tool         │──┐
│       (uses Tavily API)         │  │
│                                 │  │ External APIs
│ 3. Reader Agent                 │  │
│    └─ scrape_url() tool     ────┼──┤
│       (uses BeautifulSoup)      │  │
│                                 │  │
│ 4. Writer Chain                 │  │
│    └─ Generates report          │  │
│                                 │  │
│ 5. Critic Chain                 │  │
│    └─ Evaluates report          │  │
└────────┬────────────────────────┘  │
         │                          │
         │ SSE Events ◄─────────────┘
         │ (real-time)
         ▼
    Browser UI Updates
```

### Data Flow

1. **Frontend** sends research request with:
   - Topic
   - Model ID (e.g., "groq/llama-3.3-70b-versatile")
   - LLM API Key (if paid model)
   - Tavily API Key

2. **Backend** receives request and:
   - Builds the correct LLM instance
   - Creates agents (Search, Reader, Writer, Critic)
   - Runs the 4-stage pipeline
   - Streams results back via SSE (Server-Sent Events)

3. **Frontend** displays results in real-time as they arrive

---

## Usage

### Basic Research

1. **Select Model**
   - Choose from Free (Groq) or Paid (OpenAI/Anthropic/Google)
   - If paid, paste your API key (never stored)

2. **Add Tavily Key** 
   - Get free key: https://tavily.com

3. **Enter Topic**
   - Example: "Latest breakthroughs in quantum computing"

4. **Click Research**
   - Watch the pipeline execute in real-time
   - See search → read → write → critique stages

5. **Review & Download**
   - Read the generated report
   - Download as markdown

---

## Project Structure

```
Multi-Agent-Research-System/
├── backend/                    # FastAPI server & core agent logic (Hugging Face)
│   ├── .dockerignore
│   ├── Dockerfile              # Backend containerization
│   ├── main.py                 # Main FastAPI app
│   ├── Procfile
│   ├── requirements.txt        # Python dependencies
│   └── tools.py                # Web search & scraping tools
├── frontend/                   # Next.js UI (Deployed on Vercel)
│   ├── app/                    # React components & UI
│   ├── .env.local.example
│   ├── Dockerfile              # Frontend containerization
│   ├── next.config.js          # Next.js config
│   ├── package.json            # Node dependencies
│   ├── postcss.config.js
│   ├── tailwind.config.js      # Tailwind styles
│   └── tsconfig.json           # TypeScript config
├── .env
├── .env.example
├── .gitignore
├── docker-compose.yml          # Docker composition for full-stack local dev
└── README.md                   # This file
```

---

## Key Files Explained

### `backend/main.py`
- FastAPI server that runs the research pipeline
- `build_llm()` — Creates the correct LangChain LLM based on user's model choice
- `build_search_agent()`, `build_reader_agent()`, etc. — Create agents with the LLM
- `/api/research` — Main endpoint that runs the 4-stage pipeline

### `frontend/app/page.tsx`
- React component (client-side)
- Model selector with 4 groups (Free, OpenAI, Anthropic, Google)
- Real-time progress display
- Report viewing and download

### `backend/tools.py`
- `web_search()` — Searches the web using Tavily API
- `scrape_url()` — Extracts text from URLs using BeautifulSoup
- Used by the agents in the pipeline

---

## Security & Privacy

- **API Keys are NEVER stored** — sent per-request only
- **No persistent user data** — stateless backend
- **HTTPS recommended** — when deploying to production
- **Environment variables** — sensitive keys stored locally only

---

## Deployment

### Deploy Backend (Hugging Face Spaces)

The backend is fully containerized using Docker and is designed to run smoothly on Hugging Face Spaces.

1. **Create a New Space:** Go to Hugging Face, create a new Space, and select **Docker** as the SDK template. Choose the **Blank** configuration.
2. **Push Your Code:** Initialize Git inside your `backend/` directory (or use the main project root) and push your backend files to the Hugging Face repository.
3. **Configure Environment Variables:** In your Space's **Settings** tab, add your secret keys under **Repository Secrets**:
   * `TAVILY_API_KEY` (Your web search API key)
   * `GROQ_API_KEY` (Optional, for the free tier models)
   * `ALLOW_ORIGINS` (Set this to your Vercel public frontend URL to allow safe access)
4. **Expose the Endpoint:** Hugging Face will automatically read your `Dockerfile` and build the container. Once it turns green, copy your direct Space API URL (usually formatted as `https://your-username-space-name.hf.space`).

### Deploy Frontend (Vercel)

The Next.js user interface is built to be deployed on Vercel with zero friction.

1. **Connect Repository:** Import your repository into your Vercel dashboard.
2. **Set Root Directory:** In the project build settings, ensure your **Root Directory** is explicitly set to `frontend`.
3. **Add Environment Variables:** Under the Project Settings, add the following environment variable so the client can talk to the server:
   * `BACKEND_URL`: `https://your-username-space-name.hf.space` (The Hugging Face Space URL you copied above)
4. **Manage Deployment Protection (Optional):** If you are sharing a specific deployment preview link with others and want them to access it instantly without hitting a login screen, navigate to **Settings > Deployment Protection** and toggle **OFF** Vercel Authentication for Previews.
5. **Deploy:** Hit deploy. Vercel will build the frontend and host it globally.

### Deploy Frontend (Vercel)

1. Push code to GitHub
2. Create a new Vercel project and set the root directory to `frontend`
3. Set the framework preset to `Next.js`
4. Add this environment variable:
   ```
   BACKEND_URL=https://your-backend-api.com
   ```
5. Deploy the frontend

Once deployed, Vercel will use `BACKEND_URL` to forward `/api/*` calls to your backend.

---

## Environment Variables

### `.env` (Backend)

```env
# Required
TAVILY_API_KEY=tvly-xxxxx

# Optional (for free Groq tier)
GROQ_API_KEY=gsk-xxxxx
```

### `frontend/.env.local` (Frontend - for production)

```env
BACKEND_URL=https://your-backend-api.com
```

### Backend environment variables summary

```env
TAVILY_API_KEY=tvly-xxxxx
GROQ_API_KEY=gsk-xxxxx
ALLOW_ORIGINS=https://your-frontend.vercel.app
```

---

## Troubleshooting

### "Tavily API key is required"
- Add `TAVILY_API_KEY` to `.env` in project root
- Or enter it in the UI on each request

### "OpenAI API key is required for this model"
- Select a free model (Groq) if you don't have a paid key
- Or paste your OpenAI key in the UI

### Backend not responding
- Check backend is running on `http://localhost:7860`
- Check CORS settings in `main.py`

### Frontend can't find backend
- Ensure backend is running on port 7860
- Check `fetch("/api/research", ...)` in `page.tsx`

---

## Contributing

Contributions welcome! Feel free to:
- Add more tools (e.g., arXiv search, academic databases)
- Add more LLM providers
- Improve the UI/UX
- Fix bugs and optimize performance

---

## License

Mit. Feel free to use for personal or commercial projects.

---

## Questions?

If you have questions:
1. Check the troubleshooting section
2. Review the architecture diagram
3. Inspect browser DevTools (F12) for error messages
4. Check backend logs in terminal

---

**Happy researching!**
