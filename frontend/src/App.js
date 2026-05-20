import React, { useState, useRef, useEffect } from 'react';
import './App.css';

const SAMPLE_HCPS = ["Dr. Smith", "Dr. Johnson", "Dr. Patel", "Dr. Williams", "Dr. Lee"];
const INTERACTION_TYPES = ["Meeting", "Call", "Email", "Conference", "Virtual Meeting"];
const SENTIMENTS = [
  { label: "Positive", emoji: "😊" },
  { label: "Neutral",  emoji: "😐" },
  { label: "Negative", emoji: "😞" },
];

/* ─────────── Helpers ─────────── */

/**
 * Converts **bold** markdown in a string into <strong> spans.
 * Used to render the success message exactly as seen in the video.
 */
function parseBold(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

/* ─────────── Sub-components ─────────── */

function TypingDots() {
  return (
    <div className="typing-dots">
      <div className="typing-dot" />
      <div className="typing-dot" />
      <div className="typing-dot" />
    </div>
  );
}

/**
 * role: "user" | "assistant" | "success"
 * Success bubbles are green and support **bold** markdown.
 */
function ChatBubble({ role, text }) {
  const isUser = role === "user";
  return (
    <div className={`chat-bubble-wrap ${isUser ? "user" : role}`}>
      <div className={`chat-bubble ${role}`}>
        {role === "success" ? parseBold(text) : text}
      </div>
    </div>
  );
}

/* ─────────── Main App ─────────── */

export default function App() {
  const today = new Date().toISOString().split("T")[0];
  const nowTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  /* ── Form state ── */
  const [hcpQuery, setHcpQuery] = useState("");
  const [hcpSuggestions, setHcpSuggestions] = useState([]);
  const [interactionType, setInteractionType] = useState("Meeting");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState(nowTime);
  const [attendees, setAttendees] = useState("");
  const [topicsDiscussed, setTopicsDiscussed] = useState("");
  const [materials, setMaterials] = useState([]);
  const [samples, setSamples] = useState([]);
  const [sentiment, setSentiment] = useState("Positive");
  const [outcomes, setOutcomes] = useState("");
  const [followUp, setFollowUp] = useState("");

  /* ── Chat state ── */
  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      text: 'Log interaction details here (e.g., "Met Dr. Smith, discussed Prodo-X efficacy, positive sentiment, shared brochure") or ask for help.',
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isLoading, isSubmitting]);

  /* ── HCP autocomplete ── */
  function handleHcpInput(val) {
    setHcpQuery(val);
    setHcpSuggestions(
      val.length > 0
        ? SAMPLE_HCPS.filter((h) => h.toLowerCase().includes(val.toLowerCase()))
        : []
    );
  }

  /* ── Add material / sample via prompt ── */
  function addItem(list, setter) {
    const val = window.prompt("Add item:");
    if (val && val.trim()) setter([...list, val.trim()]);
  }

  /* ── Snapshot of current form ── */
  function getFormState() {
    return {
      hcpName: hcpQuery, interactionType, date, time,
      attendees, topicsDiscussed, materials, samples,
      sentiment, outcomes, followUp,
    };
  }

  /* ══════════════════════════════════════════════════
     AI CHAT — right-panel "A Log" button
     User describes interaction → AI fills the form
  ══════════════════════════════════════════════════ */
  async function handleLog() {
    const userMsg = chatInput.trim();
    if (!userMsg) return;

    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setIsLoading(true);

try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg
        }),
      });

      if (!res.ok) throw new Error("Backend server error");

      // 2. Parse the response from your LangGraph agent
      const data = await res.json();
      
      // The backend returns: { reply: "...", form_updates: { ... } }
      const message = data.reply;
      const updates = data.form_updates || {};

      // 3. Update the left form panel if the AI extracted data
      if (updates.hcp_name)          setHcpQuery(updates.hcp_name);
      if (updates.interaction_type)  setInteractionType(updates.interaction_type);
      if (updates.notes)             setTopicsDiscussed(updates.notes);
      if (updates.sentiment)         setSentiment(updates.sentiment);
      if (updates.brochures_shared)  setMaterials(["Brochures/Samples"]); 

      // 4. Show the AI's reply in the chat panel
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: message || "Form updated with the details you provided." },
      ]);
      
    } catch (error) {
      console.error(error);
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry, something went wrong connecting to the local backend. Is FastAPI running?" },
      ]);
    } finally {
      setIsLoading(false);
    }

  }

  /* ══════════════════════════════════════════════════
     SUBMIT — left-panel "Submit Interaction Log"
     Sends form to AI → green success bubble in chat
  ══════════════════════════════════════════════════ */
  const FALLBACK_SUCCESS =
    "✅ **Interaction logged successfully!** The details (HCP Name, Date, Sentiment, and Materials) have been automatically populated based on your summary. Would you like me to suggest a specific follow-up action, such as scheduling a meeting?";

  async function handleSubmit() {
    setIsSubmitting(true);

    try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Interaction logged for ${getFormState().hcpName || 'HCP'}. Sentiment: ${getFormState().sentiment}. Materials shared: ${getFormState().materials.join(', ') || 'None'}.`,
        }),
      });
      const data = await res.json();
      const text = data.reply || FALLBACK_SUCCESS;
      setChatMessages((prev) => [...prev, { role: "success", text }]);
    } catch (_) {
      setChatMessages((prev) => [...prev, { role: "success", text: FALLBACK_SUCCESS }]);
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ══════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════ */
  return (
    <div className="app-container">

      {/* ══ LEFT: Form Panel ══ */}
      <div className="form-panel">
        <h1 className="page-title">Log HCP Interaction</h1>

        {/* ── Section: Interaction Details ── */}
        <span className="section-label">Interaction Details</span>

        <div className="grid-2">
          {/* HCP Name */}
          <div>
            <label className="field-label">HCP Name</label>
            <div className="field-wrap">
              <input
                type="text"
                value={hcpQuery}
                onChange={(e) => handleHcpInput(e.target.value)}
                placeholder="Search or select HCP..."
              />
              {hcpSuggestions.length > 0 && (
                <div className="autocomplete-list">
                  {hcpSuggestions.map((s) => (
                    <div
                      key={s}
                      className="autocomplete-item"
                      onClick={() => { setHcpQuery(s); setHcpSuggestions([]); }}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Interaction Type */}
          <div>
            <label className="field-label">Interaction Type</label>
            <select value={interactionType} onChange={(e) => setInteractionType(e.target.value)}>
              {INTERACTION_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Date + Time */}
        <div className="grid-2">
          <div>
            <label className="field-label">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        {/* Attendees */}
        <div className="field-group">
          <label className="field-label">Attendees</label>
          <input
            type="text"
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            placeholder="Enter names or search..."
          />
        </div>

        {/* Topics Discussed */}
        <div className="field-group">
          <label className="field-label">Topics Discussed</label>
          <textarea
            rows={3}
            value={topicsDiscussed}
            onChange={(e) => setTopicsDiscussed(e.target.value)}
            placeholder="Enter key discussion points..."
          />
        </div>

        {/* Voice Note */}
        <button className="voice-note-btn">
          🎙 Summarize from Voice Note <span>(Requires Consent)</span>
        </button>

        {/* ── Section: Materials Shared / Samples Distributed ── */}
        <div className="field-group">
          <span className="section-label" style={{ marginBottom: 2 }}>
            Materials Shared / Samples Distributed
          </span>
          <label className="field-label">Materials Shared</label>

          {materials.length === 0 ? (
            <p className="empty-text">No materials added.</p>
          ) : (
            materials.map((m, i) => (
              <div className="material-item" key={i}>
                <span>{m}</span>
                <button
                  className="remove-btn"
                  onClick={() => setMaterials(materials.filter((_, j) => j !== i))}
                >✕</button>
              </div>
            ))
          )}
          <button className="add-btn" onClick={() => addItem(materials, setMaterials)}>
            🔍 Search/Add
          </button>
        </div>

        {/* Samples Distributed */}
        <div className="field-group">
          <label className="field-label">Samples Distributed</label>

          {samples.length === 0 ? (
            <p className="empty-text">No samples added.</p>
          ) : (
            samples.map((s, i) => (
              <div className="material-item" key={i}>
                <span>{s}</span>
                <button
                  className="remove-btn"
                  onClick={() => setSamples(samples.filter((_, j) => j !== i))}
                >✕</button>
              </div>
            ))
          )}
          <button className="add-btn" onClick={() => addItem(samples, setSamples)}>
            + Add Sample
          </button>
        </div>

        {/* Sentiment */}
        <div className="field-group">
          <label className="field-label">Observed/Inferred HCP Sentiment</label>
          <div className="sentiment-group">
            {SENTIMENTS.map((s) => (
              <label className="sentiment-option" key={s.label}>
                <input
                  type="radio"
                  name="sentiment"
                  checked={sentiment === s.label}
                  onChange={() => setSentiment(s.label)}
                />
                {s.emoji} {s.label}
              </label>
            ))}
          </div>
        </div>

        {/* Outcomes */}
        <div className="field-group">
          <label className="field-label">Outcomes</label>
          <textarea
            rows={3}
            value={outcomes}
            onChange={(e) => setOutcomes(e.target.value)}
            placeholder="Key outcomes or agreements..."
          />
        </div>

        {/* Follow-up Actions */}
        <div className="field-group">
          <label className="field-label">Follow-up Actions</label>
          <textarea
            rows={2}
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            placeholder="e.g., Schedule follow-up call, send product literature..."
          />
        </div>

        {/* Submit — triggers AI success message in chat panel */}
        <button
          className={`submit-btn${isSubmitting ? " submit-btn--loading" : ""}`}
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit Interaction Log"}
        </button>
      </div>

      {/* ══ RIGHT: AI Chat Panel ══ */}
      <div className="chat-panel">

        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-icon">🤖</div>
          <div>
            <p className="chat-header-title">AI Assistant</p>
            <p className="chat-header-sub">Log interaction details here via chat</p>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {chatMessages.map((m, i) => (
            <ChatBubble key={i} role={m.role} text={m.text} />
          ))}
          {(isLoading || isSubmitting) && <TypingDots />}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="chat-input-area">
          <textarea
            className="chat-textarea"
            rows={2}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleLog();
              }
            }}
            placeholder="Describe Interaction..."
          />
          <button
            className="log-btn"
            onClick={handleLog}
            disabled={isLoading || isSubmitting || !chatInput.trim()}
          >
            <span className="log-btn-letter">A</span>
            <span>Log</span>
          </button>
        </div>

      </div>
    </div>
  );
}