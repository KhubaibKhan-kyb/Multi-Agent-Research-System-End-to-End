"""
main.py — FastAPI Backend for Multi-Agent Research System
==========================================================

NEW IN THIS VERSION:
  - Accepts model_id, llm_api_key, and tavily_api_key from the frontend
  - Dynamically builds the correct LangChain LLM based on the chosen model
  - Groq models work with NO api key (truly free tier)
  - All other models require the user's own key (we never store them)
  - The agents and chains are now built fresh per-request using the chosen LLM

MODEL ROUTING:
  groq/...       → langchain_groq.ChatGroq         (free, no key needed)
  openai/...     → langchain_openai.ChatOpenAI
  anthropic/...  → langchain_anthropic.ChatAnthropic
  google/...     → langchain_google_genai.ChatGoogleGenerativeAI

ARCHITECTURE:
  This file is the main backend entry point. It imports tools from tools.py
  (build_search_tool, scrape_url) and builds agents dynamically per request.
  
  Note: agents.py and pipeline.py in the root are LEGACY and not used.
  All active agent logic is in this file.

AGENT TYPE:
  Using modern Tool Calling Agent (create_tool_calling_agent), not ReAct.
  Tool Calling is native to modern LLMs and replaces the deprecated ReAct pattern.
"""

import asyncio
import json
import sys
import os
from typing import AsyncGenerator, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

app = FastAPI(title="Multi-Agent Research API", version="2.0.0")

# =========================================================================
# CORS Configuration - Platform-Agnostic
#
# Supports:
#   - Local development (localhost:3000)
#   - Hugging Face Spaces (*.hf.space)
#   - Railway (auto-generated domains)
#   - Custom domains via ALLOW_ORIGINS env var
# =========================================================================
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://*.hf.space",  # Hugging Face Spaces wildcard
]

# Add any custom origins from environment variable
extra_origins = os.getenv("ALLOW_ORIGINS", "")
if extra_origins:
    allowed_origins.extend([origin.strip() for origin in extra_origins.split(",") if origin.strip()])

# For Hugging Face Spaces and other environments, allow broader CORS
# In production with a real frontend, restrict this further
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
if ENVIRONMENT == "production":
    # In production, use only explicitly configured origins
    pass
else:
    # In development/preview, allow localhost and HF Spaces
    allowed_origins.extend([
        "http://localhost:*",
        "http://127.0.0.1:*",
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Updated Request Model
#
# model_id:     e.g. "groq/llama-3.3-70b-versatile" or "openai/gpt-4o"
# llm_api_key:  User's key for paid providers. Empty string for Groq (free).
# tavily_api_key: User's Tavily key for the search tool.
# ---------------------------------------------------------------------------
class ResearchRequest(BaseModel):
    topic: str
    model_id: str = "groq/llama-3.3-70b-versatile"   # Default to free model
    llm_api_key: Optional[str] = ""
    tavily_api_key: Optional[str] = ""


def make_sse_event(event_type: str, data: dict) -> str:
    payload = json.dumps({"type": event_type, **data})
    return f"data: {payload}\n\n"


# ---------------------------------------------------------------------------
# LLM FACTORY
#
# WHY A FACTORY FUNCTION?
#   Instead of always using gpt-4o-mini from .env, we now build the LLM
#   dynamically based on what the user selected and which key they provided.
#
# HOW model_id WORKS:
#   We use a "provider/model-name" format, e.g.:
#     "groq/llama-3.3-70b-versatile"
#     "openai/gpt-4o-mini"
#     "anthropic/claude-haiku-4-5"
#     "google/gemini-1.5-flash"
#
#   We split on "/" to get the provider, then import the right LangChain class.
# ---------------------------------------------------------------------------
def build_llm(model_id: str, api_key: str):
    """
    Build and return the appropriate LangChain LLM instance.
    Raises ValueError if provider is unknown or key is missing when required.
    """
    provider, model_name = model_id.split("/", 1)

    if provider == "groq":
        # Groq is FREE — no user key needed.
        # We use our own GROQ_API_KEY from .env, or it can be left empty
        # if Groq is configured via environment (GROQ_API_KEY env var).
        # Get a free key at: https://console.groq.com
        from langchain_groq import ChatGroq
        groq_key = os.getenv("GROQ_API_KEY", "")
        return ChatGroq(
            model=model_name,
            temperature=0.4,
            api_key=groq_key or None,
        )

    elif provider == "openai":
        if not api_key:
            raise ValueError("OpenAI API key is required for this model.")
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model=model_name, temperature=0.4, api_key=api_key)

    elif provider == "anthropic":
        if not api_key:
            raise ValueError("Anthropic API key is required for this model.")
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model=model_name, temperature=0.4, api_key=api_key)

    elif provider == "google":
        if not api_key:
            raise ValueError("Google API key is required for this model.")
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(model=model_name, temperature=0.4, google_api_key=api_key)

    else:
        raise ValueError(f"Unknown provider: {provider}")


# ---------------------------------------------------------------------------
# AGENT & CHAIN BUILDERS
#
# WHY REBUILD PER REQUEST?
#   Previously the agents were created once at import time using a hardcoded
#   LLM. Now each request brings its own model + key, so we build fresh
#   agents for each run. This is safe because LangChain agents are stateless.
# ---------------------------------------------------------------------------
def build_search_agent(llm, tavily_key: str):
    """Build the search agent with the given LLM and Tavily key."""
    from langchain.agents import AgentExecutor, create_tool_calling_agent
    from langchain_core.prompts import ChatPromptTemplate
    from backend.tools import build_search_tool   # see note below

    search_tool = build_search_tool(tavily_key)

    # We use LangChain's modern tool-calling agent (replaces deprecated ReAct agent)
    # Tool calling is native to modern LLMs and more efficient than ReAct loops
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a research assistant. Use tools to find information."),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}"),
    ])
    agent = create_tool_calling_agent(llm, [search_tool], prompt)
    return AgentExecutor(agent=agent, tools=[search_tool], verbose=False)


def build_reader_agent(llm, tavily_key: str):
    """Build the reader agent with the given LLM."""
    from backend.tools import scrape_url
    from langchain.agents import AgentExecutor, create_tool_calling_agent
    from langchain_core.prompts import ChatPromptTemplate

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a web reader. Scrape URLs to extract content."),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}"),
    ])
    agent = create_tool_calling_agent(llm, [scrape_url], prompt)
    return AgentExecutor(agent=agent, tools=[scrape_url], verbose=False)


def build_writer_chain(llm):
    """Build the writer chain with the given LLM."""
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.output_parsers import StrOutputParser

    writer_prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert research writer. Write clear, structured and insightful reports."),
        ("human", """Write a detailed research report on the topic below.

Topic: {topic}

Research Gathered:
{research}

Structure the report as:
- Introduction
- Key Findings (minimum 3 well-explained points)
- Conclusion
- Sources (list all URLs found in the research)

Be detailed, factual and professional."""),
    ])
    return writer_prompt | llm | StrOutputParser()


def build_critic_chain(llm):
    """Build the critic chain with the given LLM."""
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.output_parsers import StrOutputParser

    critic_prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a sharp and constructive research critic. Be honest and specific."),
        ("human", """Review the research report below and evaluate it strictly.

Report:
{report}

Respond in this exact format:

Score: X/10

Strengths:
- ...
- ...

Areas to Improve:
- ...
- ...

One line verdict:
..."""),
    ])
    return critic_prompt | llm | StrOutputParser()


# ---------------------------------------------------------------------------
# STREAMING GENERATOR (updated to accept model + keys)
# ---------------------------------------------------------------------------
async def research_stream(
    topic: str,
    model_id: str,
    llm_api_key: str,
    tavily_api_key: str,
) -> AsyncGenerator[str, None]:

    try:
        # Build the LLM — raises ValueError if key missing or provider unknown
        try:
            llm = build_llm(model_id, llm_api_key)
        except ValueError as e:
            yield make_sse_event("error", {"message": str(e)})
            return

        # Use Tavily key from request, fall back to .env
        effective_tavily_key = tavily_api_key or os.getenv("TAVILY_API_KEY", "")
        if not effective_tavily_key:
            yield make_sse_event("error", {"message": "Tavily API key is required."})
            return

        # --- Stage 1: Search ---
        yield make_sse_event("status", {
            "stage": "search",
            "message": f"Search agent scanning the web"
        })

        search_agent = build_search_agent(llm, effective_tavily_key)
        search_result = await asyncio.to_thread(
            search_agent.invoke,
            {"input": f"Find recent, reliable, and detailed information on: {topic}."}
        )
        search_results = search_result.get("output", "")

        yield make_sse_event("search_done", {"stage": "search", "content": search_results})

        # --- Stage 2: Reader ---
        yield make_sse_event("status", {
            "stage": "reader",
            "message": "Reader agent extracting deep content"
        })

        reader_agent = build_reader_agent(llm, effective_tavily_key)
        reader_result = await asyncio.to_thread(
            reader_agent.invoke,
            {"input": (
                f"Based on these search results about '{topic}', "
                f"pick the most relevant URL and scrape it.\n\n{search_results[:800]}"
            )}
        )
        scraped_content = reader_result.get("output", "")

        yield make_sse_event("reader_done", {"stage": "reader", "content": scraped_content})

        # --- Stage 3: Writer (streamed word by word) ---
        yield make_sse_event("status", {
            "stage": "writer",
            "message": "Composing research report"
        })

        writer_chain = build_writer_chain(llm)
        research_combined = (
            f"SEARCH RESULTS:\n{search_results}\n\n"
            f"SCRAPED CONTENT:\n{scraped_content}"
        )

        chunk_queue: asyncio.Queue = asyncio.Queue()
        loop = asyncio.get_event_loop()

        def stream_writer_sync():
            for chunk in writer_chain.stream({"topic": topic, "research": research_combined}):
                loop.call_soon_threadsafe(chunk_queue.put_nowait, chunk)
            loop.call_soon_threadsafe(chunk_queue.put_nowait, None)

        asyncio.get_event_loop().run_in_executor(None, stream_writer_sync)

        full_report = ""
        while True:
            chunk = await chunk_queue.get()
            if chunk is None:
                break
            full_report += chunk
            yield make_sse_event("report_chunk", {"chunk": chunk})

        # --- Stage 4: Critic ---
        yield make_sse_event("status", {
            "stage": "critic",
            "message": "Critic agent evaluating the report"
        })

        critic_chain = build_critic_chain(llm)
        critic_report = await asyncio.to_thread(
            critic_chain.invoke, {"report": full_report}
        )

        yield make_sse_event("critic_done", {"stage": "critic", "content": critic_report})
        yield make_sse_event("done", {"message": "Research complete"})

    except Exception as e:
        yield make_sse_event("error", {"message": str(e)})


@app.post("/api/research")
async def research_endpoint(request: ResearchRequest):
    return StreamingResponse(
        research_stream(
            topic=request.topic,
            model_id=request.model_id,
            llm_api_key=request.llm_api_key or "",
            tavily_api_key=request.tavily_api_key or "",
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "Multi-Agent Research API v2"}