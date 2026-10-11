import { useState } from "react";
import { askFloodSenseAI } from "../services/api";
import ReactMarkdown from "react-markdown";
import { Bot, Send, Sparkles, AlertTriangle, LoaderCircle } from "lucide-react";

export default function AIIntelligence({ selectedZone }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const suggestedQuestions = selectedZone
  ? [
      `Explain the calculated flood risk for ${selectedZone.zone_name}.`,
      `Prioritize interventions for ${selectedZone.zone_name}.`,
      `Explain the main risk factors for ${selectedZone.zone_name}.`,
    ]
  : [
      "Which zones should receive priority attention?",
      "How does FloodSense calculate risk scores?",
      "What interventions should be considered first?",
    ];

  async function handleAsk(value = question) {
    const cleanedQuestion = value.trim();

    if (cleanedQuestion.length < 5 || loading) return;

    setMessages((previous) => [
      ...previous,
      { role: "user", content: cleanedQuestion },
    ]);

    setQuestion("");
    setError("");
    setLoading(true);

    try {
      const result = await askFloodSenseAI(cleanedQuestion);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: result.answer,
          model: result.model,
        },
      ]);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ai-panel" id="ai-intelligence">
      <div className="ai-panel-header">
        <div className="ai-heading">
          <div className="ai-icon">
            <Bot size={23} />
          </div>

          <div>
            <h2>FloodSense Intelligence</h2>
            <p>AI-powered risk explanations and intervention planning</p>
          </div>
        </div>

        <span className="ai-model-badge">
          <span className="ai-status-dot" />
          Local AI · Qwen 2.5
        </span>
      </div>

      <div className="ai-demo-warning">
        <AlertTriangle size={17} />
        <span>
          AI analysis uses simulated demonstration data, not live weather,
          sensor readings, or verified incidents.
        </span>
      </div>

      <div className="ai-chat">
        {messages.length === 0 ? (
          <div className="ai-empty-state">
            <Sparkles size={30} />

            <h3>Understand the risk. Plan the response.</h3>

            <p>
              Ask FloodSense to explain calculated risk scores and explore
              possible interventions using the available demonstration data.
            </p>

            <div className="ai-suggestions">
              {suggestedQuestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleAsk(suggestion)}
                  disabled={loading}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="ai-messages" aria-live="polite">
            {messages.map((message, index) => (
              <article
                key={`${message.role}-${index}`}
                className={`ai-message ${message.role}`}
              >
                <div className="ai-message-role">
                  {message.role === "assistant" ? (
                    <Bot size={16} />
                  ) : (
                    "YOU"
                  )}

                  <span>
                    {message.role === "assistant"
                      ? `FloodSense AI${message.model ? ` · ${message.model}` : ""}`
                      : "You"}
                  </span>
                </div>

               <div className="ai-message-content">
  {message.role === "assistant" ? (
    <ReactMarkdown>{message.content}</ReactMarkdown>
  ) : (
    message.content
  )}
</div>
              </article>
            ))}

            {loading && (
              <div className="ai-loading">
                <LoaderCircle size={18} className="ai-spinner" />
                <span>Analyzing the available demonstration data...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="ai-error" role="alert">
          {error}
        </div>
      )}

      <form
        className="ai-input-form"
        onSubmit={(event) => {
          event.preventDefault();
          handleAsk();
        }}
      >
        <input
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={
  selectedZone
    ? `Ask about ${selectedZone.zone_name}...`
    : "Ask about zones, risk factors, or interventions..."
}
          maxLength={1000}
          minLength={5}
          aria-label="Ask FloodSense AI a question"
          disabled={loading}
        />

        <button
          type="submit"
          disabled={loading || question.trim().length < 5}
          aria-label="Send question"
        >
          {loading ? (
            <LoaderCircle size={18} className="ai-spinner" />
          ) : (
            <Send size={18} />
          )}
          <span>Ask AI</span>
        </button>
      </form>

      <p className="ai-footer-note">
        Decision-support prototype · Verify actual conditions with qualified
        local authorities before taking action.
      </p>
    </section>
  );
}