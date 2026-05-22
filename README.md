# Argus — Multi-Agent Research System

> Deep research, on demand. A real-time AI research assistant that searches, reads, writes, and critiques.

![Python](https://img.shields.io/badge/Python-3.9%2B-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)
![Next.js](https://img.shields.io/badge/Next.js-latest-black)

---

## Overview

Argus is a **multi-agent research system** that automates deep research in real-time. It combines four specialized AI agents to:

1. **Search** — Find recent, reliable information across the web
2. **Read** — Extract and summarize relevant content from URLs
3. **Write** — Compose structured, insightful research reports
4. **Critique** — Review and score reports with actionable feedback

The entire process streams live to your browser, so you see research happening in real-time.

---

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
- Keys are **never stored** — sent per-request only

**Web Search & Scraping**
- Powered by Tavily API
- Automatic URL extraction and content scraping

**Beautiful UI**
- Responsive design (mobile-first)
- Dark theme with smooth animations
- Markdown support for formatted reports

---

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 16+
- API Keys:
  - **Tavily** (free tier available): https://tavily.com
  - **Groq** (optional, free tier): https://console.groq.com
  - **OpenAI / Anthropic / Google** (optional, for paid models)

### 1. Clone & Setup

```bash
git clone https://github.com/yourusername/argus.git
cd "Multi Agent Research System"
```

### 2. Install Backend Dependencies

```bash
# From project root
uv pip install -r requirements.txt
```

Or with pip:
```bash
pip install -r requirements.txt
```

### 3. Configure Environment

Create a `.env` file in the **project root**:

```env
# Tavily API Key (required for web search)
TAVILY_API_KEY=tvly-xxxxxxxxxxxxx

# Groq API Key (optional, only if using free models)
GROQ_API_KEY=gsk-xxxxxxxxxxxxx
```

### 4. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 5. Start Everything

From the **project root**, run:

```bash
npm run dev
```

This starts both the backend (FastAPI on port 8000) and frontend (Next.js on port 3000) simultaneously.

You'll see:
```
✓ Backend: Uvicorn running on http://127.0.0.1:8000
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

2. **Add Tavily Key** (if not in `.env`)
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
Multi Agent Research System/
├── backend/
│   ├── main.py                 # FastAPI server
│   └── requirements.txt         # Python dependencies
├── frontend/
│   ├── app/
│   │   ├── page.tsx            # Main React component
│   │   ├── layout.tsx          # Layout wrapper
│   │   └── globals.css         # Tailwind styles
│   ├── package.json            # Node dependencies
│   ├── next.config.js          # Next.js config
│   └── tsconfig.json           # TypeScript config
├── tools.py                    # Web search & scraping tools
├── requirements.txt            # Backend dependencies
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

### `tools.py`
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

### Deploy Backend (e.g., Railway, Fly.io)

1. Push code to GitHub
2. Connect repository to hosting platform
3. Set environment variables in the dashboard
4. Deploy FastAPI server

Example with Railway:
```bash
# railway.json
{
  "buildCommand": "pip install -r requirements.txt",
  "startCommand": "cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT"
}
```

### Deploy Frontend (Vercel)

1. Push code to GitHub
2. Connect repository to Vercel
3. Vercel auto-detects Next.js
4. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-api.com
   ```
5. Deploy automatically

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
NEXT_PUBLIC_API_URL=https://your-backend-api.com
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
- Check backend is running on `http://localhost:8000`
- Check CORS settings in `main.py`

### Frontend can't find backend
- Ensure backend is running on port 8000
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

Feel free to use for personal or commercial projects.

---

## Questions?

If you have questions:
1. Check the troubleshooting section
2. Review the architecture diagram
3. Inspect browser DevTools (F12) for error messages
4. Check backend logs in terminal

---

**Happy researching!**
