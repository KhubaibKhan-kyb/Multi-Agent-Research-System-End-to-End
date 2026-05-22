"use client";

/*
  page.tsx — Main Application Page (v2)
  ======================================
  NEW IN THIS VERSION:
    - Model selector with grouped providers (Free / OpenAI / Anthropic / Google)
    - Dynamic API key input — only shown for paid models
    - Tavily API key input for the search tool
    - Fully responsive layout (mobile-first)
    - Smooth CSS transitions throughout
    - Footer cleaned up (no hardcoded model names)
    - All keys sent per-request, never stored server-side
*/

import { useState, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ─────────────────────────────────────────────────────────────────────────────
// MODEL CATALOGUE
// Each entry maps to a provider/model-name string the backend understands.
// isFree: true  → no LLM API key required (Groq pays for these)
// isFree: false → user must supply their own key
// ─────────────────────────────────────────────────────────────────────────────
const MODEL_GROUPS = [
  {
    group: "Free",
    badge: "No key needed",
    badgeColor: "var(--stage-done)",
    models: [
      { id: "groq/llama-3.3-70b-versatile", label: "Llama 3.3 70B", sub: "Groq · Free" },
      { id: "groq/llama-3.1-8b-instant", label: "Llama 3.1 8B", sub: "Groq · Free · Fast" },
      { id: "groq/gemma2-9b-it", label: "Gemma 2 9B", sub: "Groq · Free" },
      { id: "groq/mixtral-8x7b-32768", label: "Mixtral 8x7B", sub: "Groq · Free" },
    ],
  },
  {
    group: "OpenAI",
    badge: "Requires key",
    badgeColor: "var(--stage-writer)",
    models: [
      { id: "openai/gpt-4o", label: "GPT-4o", sub: "OpenAI · Best quality" },
      { id: "openai/gpt-4o-mini", label: "GPT-4o mini", sub: "OpenAI · Fast & cheap" },
      { id: "openai/gpt-4-turbo", label: "GPT-4 Turbo", sub: "OpenAI · Powerful" },
    ],
  },
  {
    group: "Anthropic",
    badge: "Requires key",
    badgeColor: "var(--stage-writer)",
    models: [
      { id: "anthropic/claude-opus-4-5", label: "Claude Opus 4.5", sub: "Anthropic · Most capable" },
      { id: "anthropic/claude-sonnet-4-5", label: "Claude Sonnet 4.5", sub: "Anthropic · Balanced" },
      { id: "anthropic/claude-haiku-4-5", label: "Claude Haiku 4.5", sub: "Anthropic · Fast" },
    ],
  },
  {
    group: "Google",
    badge: "Requires key",
    badgeColor: "var(--stage-writer)",
    models: [
      { id: "google/gemini-1.5-pro", label: "Gemini 1.5 Pro", sub: "Google · Powerful" },
      { id: "google/gemini-1.5-flash", label: "Gemini 1.5 Flash", sub: "Google · Fast" },
    ],
  },
];

// Flat lookup: model_id → label, for display in the header badge
const MODEL_LABEL: Record<string, string> = {};
MODEL_GROUPS.forEach((g) => g.models.forEach((m) => (MODEL_LABEL[m.id] = m.label)));

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type Stage = "search" | "reader" | "writer" | "critic" | "done" | null;

interface ResearchState {
  status: "idle" | "running" | "done" | "error";
  currentStage: Stage;
  currentMessage: string;
  searchContent: string;
  readerContent: string;
  reportContent: string;
  criticContent: string;
  error: string;
}

const INITIAL_STATE: ResearchState = {
  status: "idle",
  currentStage: null,
  currentMessage: "",
  searchContent: "",
  readerContent: "",
  reportContent: "",
  criticContent: "",
  error: "",
};

const STAGE_CONFIG: Record<string, { label: string; color: string; index: number }> = {
  search: { label: "Search", color: "var(--stage-search)", index: 0 },
  reader: { label: "Read", color: "var(--stage-reader)", index: 1 },
  writer: { label: "Write", color: "var(--stage-writer)", index: 2 },
  critic: { label: "Critique", color: "var(--stage-critic)", index: 3 },
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function ResearchPage() {
  const [topic, setTopic] = useState("");
  const [state, setState] = useState<ResearchState>(INITIAL_STATE);
  const [modelId, setModelId] = useState("groq/llama-3.3-70b-versatile");
  const [llmKey, setLlmKey] = useState("");
  const [tavilyKey, setTavilyKey] = useState("");
  const [modelOpen, setModelOpen] = useState(false);   // model dropdown
  const abortRef = useRef<AbortController | null>(null);

  // Is the selected model free (Groq)?
  const isFreeModel = modelId.startsWith("groq/");
  const selectedModel = MODEL_GROUPS.flatMap((g) => g.models).find((m) => m.id === modelId);

  // ─────────────────────────────────────────────────────────────────────────
  // STREAMING FETCH — unchanged logic, now sends model + keys
  // ─────────────────────────────────────────────────────────────────────────
  const runResearch = useCallback(async () => {
    if (!topic.trim()) return;
    setState({ ...INITIAL_STATE, status: "running" });
    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          model_id: modelId,
          llm_api_key: llmKey,
          tavily_api_key: tavilyKey,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const eventStr of events) {
          if (!eventStr.trim()) continue;
          const dataLine = eventStr.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;

          let event: Record<string, string>;
          try { event = JSON.parse(dataLine.replace("data: ", "")); }
          catch { continue; }

          switch (event.type) {
            case "status":
              setState((p) => ({ ...p, currentStage: event.stage as Stage, currentMessage: event.message }));
              break;
            case "search_done":
              setState((p) => ({ ...p, searchContent: event.content }));
              break;
            case "reader_done":
              setState((p) => ({ ...p, readerContent: event.content }));
              break;
            case "report_chunk":
              setState((p) => ({ ...p, reportContent: p.reportContent + event.chunk }));
              break;
            case "critic_done":
              setState((p) => ({ ...p, criticContent: event.content }));
              break;
            case "done":
              setState((p) => ({ ...p, status: "done", currentStage: "done", currentMessage: "Research complete" }));
              break;
            case "error":
              setState((p) => ({ ...p, status: "error", error: event.message }));
              break;
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        setState((p) => ({ ...p, status: "error", error: (err as Error).message }));
      }
    }
  }, [topic, modelId, llmKey, tavilyKey]);

  const isRunning = state.status === "running";
  const isDone = state.status === "done";
  const hasReport = state.reportContent.length > 0;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--bg-base)" }}>

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-sm"
        style={{ borderColor: "var(--bg-border)", backgroundColor: "rgba(10,10,10,0.85)" }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">

          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative w-7 h-7">
              <div className="absolute inset-0 rounded-full border" style={{ borderColor: "var(--accent)", opacity: 0.3 }} />
              <div className="absolute inset-1.5 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
            </div>
            <span className="text-base tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
              Argus
            </span>
          </div>

          {/* Pipeline breadcrumb — hidden on small screens */}
          <div
            className="hidden md:flex items-center gap-2 text-xs"
            style={{ fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}
          >
            {Object.entries(STAGE_CONFIG).map(([key, cfg], i) => (
              <span key={key} className="flex items-center gap-2">
                <span style={{ color: cfg.color }}>{cfg.label}</span>
                {i < 3 && <span style={{ color: "var(--bg-border)" }}>→</span>}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* ── PAGE BODY ─────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">

        {/* ── HERO ────────────────────────────────────────────────────────── */}
        <section
          className="mb-10 transition-all duration-500"
          style={{ opacity: isRunning || isDone ? 0.55 : 1 }}
        >
          {!hasReport && (
            <div className="mb-8">
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl mb-4 leading-none"
                style={{ fontFamily: "var(--font-display)", fontWeight: 300, color: "var(--text-primary)" }}
              >
                Deep research,
                <br />
                <span style={{ color: "var(--accent)" }}>on demand.</span>
              </h1>
              <p className="text-sm sm:text-base max-w-xl" style={{ color: "var(--text-secondary)", lineHeight: 1.75 }}>
                Enter any topic. Four specialized agents search, read, write, and critique — all streamed live.
              </p>
            </div>
          )}

          {/* Model selector + key inputs */}
          <div className="mb-6 grid gap-3 lg:grid-cols-[minmax(260px,420px)_1fr]">
            <div>
              <label className="block mb-2 text-xs tracking-widest uppercase" style={{ fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>
                Select model
              </label>
              <div className="relative">
                <button
                  onClick={() => setModelOpen(!modelOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-left transition-all duration-150"
                  style={{
                    background: "var(--bg-surface)",
                    border: `1px solid ${modelOpen ? "var(--accent-dim)" : "var(--bg-border)"}`,
                    borderRadius: "2px",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-mono)",
                    cursor: "pointer",
                  }}
                >
                  <span className="flex items-center gap-3">
                    {isFreeModel && (
                      <span className="text-xs px-1.5 py-0.5" style={{ background: "rgba(126,200,126,0.12)", color: "var(--stage-done)", border: "1px solid rgba(126,200,126,0.25)", borderRadius: "2px" }}>
                        Free
                      </span>
                    )}
                    <span>{selectedModel?.label || modelId}</span>
                  </span>
                  <span style={{ transform: modelOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", color: "var(--text-tertiary)" }}>▾</span>
                </button>

                {modelOpen && (
                  <div
                    className="absolute top-full left-0 right-0 z-50 mt-1 overflow-y-auto"
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--bg-border)",
                      borderRadius: "2px",
                      maxHeight: "min(440px, 70vh)",
                      boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
                    }}
                  >
                    {MODEL_GROUPS.map((group) => (
                      <div key={group.group}>
                        <div
                          className="px-4 py-2 flex items-center justify-between"
                          style={{ borderBottom: "1px solid var(--bg-border)" }}
                        >
                          <span className="text-xs tracking-widest uppercase" style={{ fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>
                            {group.group}
                          </span>
                          <span className="text-xs" style={{ color: group.badgeColor, fontFamily: "var(--font-mono)" }}>
                            {group.badge}
                          </span>
                        </div>
                        {group.models.map((model) => (
                          <button
                            key={model.id}
                            onClick={() => { setModelId(model.id); setModelOpen(false); }}
                            className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors duration-100"
                            style={{
                              background: modelId === model.id ? "var(--bg-elevated)" : "none",
                              border: "none",
                              borderBottom: "1px solid var(--bg-border)",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-elevated)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = modelId === model.id ? "var(--bg-elevated)" : "none"; }}
                          >
                            <div>
                              <div className="text-sm" style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                                {model.label}
                              </div>
                              <div className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                                {model.sub}
                              </div>
                            </div>
                            {modelId === model.id && (
                              <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                                <path d="M1 5L4.5 8.5L11 1" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div style={{ opacity: isFreeModel ? 0.35 : 1, transition: "opacity 0.3s", pointerEvents: isFreeModel ? "none" : "auto" }}>
                <label className="block mb-2 text-xs tracking-widest uppercase" style={{ fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>
                  {isFreeModel ? "LLM API Key (not needed)" : "LLM API Key"}
                </label>
                <input
                  type="password"
                  value={llmKey}
                  onChange={(e) => setLlmKey(e.target.value)}
                  placeholder={isFreeModel ? "Groq is free" : "sk-... / sk-ant-... / AIza..."}
                  className="w-full px-4 py-3 text-sm outline-none"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--bg-border)",
                    borderRadius: "2px",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-mono)",
                    caretColor: "var(--accent)",
                  }}
                  disabled={isFreeModel}
                  onFocus={(e) => { e.target.style.borderColor = "var(--accent-dim)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "var(--bg-border)"; }}
                />
                <p className="mt-1.5 text-xs" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                  Your key is sent per-request and never stored.
                </p>
              </div>

              <div>
                <label className="block mb-2 text-xs tracking-widest uppercase" style={{ fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>
                  Tavily API Key
                </label>
                <input
                  type="password"
                  value={tavilyKey}
                  onChange={(e) => setTavilyKey(e.target.value)}
                  placeholder="tvly-..."
                  className="w-full px-4 py-3 text-sm outline-none"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--bg-border)",
                    borderRadius: "2px",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-mono)",
                    caretColor: "var(--accent)",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "var(--accent-dim)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "var(--bg-border)"; }}
                />
                <p className="mt-1.5 text-xs" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                  Free tier available at tavily.com
                </p>
              </div>
            </div>
          </div>

          {/* Topic input + run button */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isRunning && runResearch()}
              placeholder="Enter a research topic"
              disabled={isRunning}
              className="flex-1 px-4 sm:px-5 py-3.5 text-sm sm:text-base outline-none transition-all duration-200"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--bg-border)",
                borderRadius: "2px",
                color: "var(--text-primary)",
                fontFamily: "var(--font-body)",
                caretColor: "var(--accent)",
              }}
              onFocus={(e) => { e.target.style.borderColor = "var(--accent-dim)"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--bg-border)"; }}
            />
            <button
              onClick={runResearch}
              disabled={isRunning || !topic.trim()}
              className="px-6 py-3.5 text-sm font-medium tracking-wide transition-all duration-200 shrink-0"
              style={{
                background: isRunning ? "var(--bg-elevated)" : "var(--accent)",
                color: isRunning ? "var(--text-tertiary)" : "var(--bg-base)",
                border: "none",
                borderRadius: "2px",
                fontFamily: "var(--font-mono)",
                cursor: isRunning ? "not-allowed" : "pointer",
                opacity: (!topic.trim() && !isRunning) ? 0.4 : 1,
              }}
            >
              {isRunning ? "Running…" : "Research"}
            </button>
          </div>
        </section>

        {/* ── PIPELINE PROGRESS ────────────────────────────────────────────── */}
        {(isRunning || isDone) && (
          <section className="mb-10 animate-fade-in">
            {/* Stage indicators */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-3 mb-5">
              {Object.entries(STAGE_CONFIG).map(([key, cfg]) => {
                const currentIndex = state.currentStage ? STAGE_CONFIG[state.currentStage]?.index ?? -1 : -1;
                const isActive = state.currentStage === key;
                const isComplete = currentIndex > cfg.index || isDone;

                return (
                  <div key={key} className="flex items-center gap-2">
                    <div
                      className="flex items-center justify-center transition-all duration-300"
                      style={{
                        width: "22px", height: "22px", borderRadius: "2px",
                        background: isComplete ? cfg.color : isActive ? "var(--bg-elevated)" : "var(--bg-surface)",
                        border: `1px solid ${isActive || isComplete ? cfg.color : "var(--bg-border)"}`,
                      }}
                    >
                      {isActive && (
                        <div className="w-2 h-2 rounded-full animate-pulse-dot" style={{ backgroundColor: cfg.color }} />
                      )}
                      {isComplete && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="var(--bg-base)" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      )}
                    </div>
                    <span
                      className="text-xs tracking-wider"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: isActive ? cfg.color : isComplete ? "var(--text-secondary)" : "var(--text-tertiary)",
                        transition: "color 0.3s",
                      }}
                    >
                      {cfg.label}
                    </span>
                    {cfg.index < 3 && (
                      <div
                        className="hidden sm:block w-6 h-px transition-all duration-500"
                        style={{ background: isComplete ? cfg.color : "var(--bg-border)" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Status message */}
            {state.currentMessage && (
              <p className="text-sm" style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                <span style={{ color: "var(--accent)" }}>→</span>{" "}
                {state.currentMessage}
                {isRunning && <span className="animate-blink ml-0.5" style={{ color: "var(--accent)" }}>_</span>}
              </p>
            )}
          </section>
        )}

        {/* ── ERROR ───────────────────────────────────────────────────────── */}
        {state.status === "error" && (
          <div
            className="mb-8 px-5 py-4 animate-fade-in"
            style={{
              background: "rgba(200,126,126,0.08)",
              border: "1px solid rgba(200,126,126,0.3)",
              borderRadius: "2px",
            }}
          >
            <p className="text-sm" style={{ color: "#c87e7e", fontFamily: "var(--font-mono)" }}>
              {state.error}
            </p>
          </div>
        )}

        {/* ── REPORT ──────────────────────────────────────────────────────── */}
        {hasReport && (
          <section className="mb-8 animate-slide-up">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs tracking-widest uppercase" style={{ fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>
                Research Report
              </span>
              {isDone && (
                <button
                  onClick={() => {
                    const blob = new Blob([state.reportContent], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = `${topic.replace(/\s+/g, "-")}-report.md`; a.click();
                  }}
                  className="text-xs px-3 py-1.5 transition-opacity hover:opacity-70"
                  style={{
                    fontFamily: "var(--font-mono)", color: "var(--accent)",
                    border: "1px solid var(--accent-dim)", borderRadius: "2px",
                    background: "none", cursor: "pointer",
                  }}
                >
                  Export .md
                </button>
              )}
            </div>
            <div className="accent-line mb-6" />

            <div className="px-5 sm:px-7 py-6 glass-card report-content" style={{ minHeight: "200px" }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{state.reportContent}</ReactMarkdown>
              {isRunning && state.currentStage === "writer" && <span className="streaming-cursor" />}
            </div>
          </section>
        )}

        {/* ── CRITIC ──────────────────────────────────────────────────────── */}
        {state.criticContent && (
          <section className="mb-8 animate-slide-up">
            <div className="mb-4">
              <span className="text-xs tracking-widest uppercase" style={{ fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>
                Critical Review
              </span>
            </div>
            <div className="accent-line mb-6" style={{ background: "linear-gradient(to right, var(--stage-critic), transparent)" }} />
            <div className="glass-card px-5 sm:px-7 py-6">
              <pre className="text-sm whitespace-pre-wrap leading-relaxed" style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                {state.criticContent}
              </pre>
            </div>
          </section>
        )}

        {/* ── SOURCE PANELS ───────────────────────────────────────────────── */}
        {(state.searchContent || state.readerContent) && isDone && (
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 animate-fade-in">
            {state.searchContent && (
              <CollapsiblePanel label="Search Results" stageColor="var(--stage-search)" content={state.searchContent} />
            )}
            {state.readerContent && (
              <CollapsiblePanel label="Scraped Content" stageColor="var(--stage-reader)" content={state.readerContent} />
            )}
          </section>
        )}

        {/* ── RESET ───────────────────────────────────────────────────────── */}
        {isDone && (
          <div className="flex justify-center animate-fade-in">
            <button
              onClick={() => { setState(INITIAL_STATE); setTopic(""); }}
              className="text-sm px-6 py-3 transition-all duration-200 hover:opacity-80"
              style={{
                fontFamily: "var(--font-mono)", color: "var(--text-secondary)",
                border: "1px solid var(--bg-border)", borderRadius: "2px",
                background: "none", cursor: "pointer",
              }}
            >
              New research
            </button>
          </div>
        )}

        {/* ── IDLE FEATURE CARDS ──────────────────────────────────────────── */}
        {state.status === "idle" && !topic && (
          <section className="mt-14 sm:mt-20 grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in">
            {[
              { stage: "search", label: "Search Agent", desc: "Queries the web via Tavily, returns titles, URLs, and snippets." },
              { stage: "reader", label: "Reader Agent", desc: "Picks the most relevant URL and scrapes full page content." },
              { stage: "writer", label: "Writer Chain", desc: "Synthesizes all research into a structured, detailed report." },
              { stage: "critic", label: "Critic Chain", desc: "Scores and critiques the report with specific, honest feedback." },
            ].map(({ stage, label, desc }) => (
              <div key={stage} className="px-4 py-4 glass-card">
                <div className="w-1 h-4 mb-3" style={{ background: STAGE_CONFIG[stage]?.color || "var(--accent)" }} />
                <p className="text-sm mb-1.5" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                  {label}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                  {desc}
                </p>
              </div>
            ))}
          </section>
        )}
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="mt-20 border-t" style={{ borderColor: "var(--bg-border)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-xs" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
            Argus — Multi-Agent Research System
          </span>
          <span className="text-xs" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
            Open source · Bring your own keys
          </span>
        </div>
      </footer>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COLLAPSIBLE PANEL
// ─────────────────────────────────────────────────────────────────────────────
function CollapsiblePanel({ label, stageColor, content }: { label: string; stageColor: string; content: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        style={{ background: "none", border: "none", cursor: "pointer" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.02)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
      >
        <div className="flex items-center gap-3">
          <div className="w-1 h-4" style={{ background: stageColor }} />
          <span className="text-xs tracking-widest uppercase" style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
            {label}
          </span>
        </div>
        <span
          style={{
            color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: "12px",
            display: "inline-block", transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s",
          }}
        >
          ›
        </span>
      </button>

      <div style={{ maxHeight: open ? "240px" : "0", overflow: "hidden", transition: "max-height 0.3s ease" }}>
        <div className="px-4 pb-4" style={{ maxHeight: "240px", overflowY: "auto" }}>
          <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
            {content.slice(0, 1500)}{content.length > 1500 && "…"}
          </p>
        </div>
      </div>
    </div>
  );
}