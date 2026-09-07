import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

type SuggestionCategory = "feature" | "improvement" | "bug" | "other";

export function SuggestionsPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [category, setCategory] = useState<SuggestionCategory>("feature");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmed = title.trim();
    if (!trimmed) {
      setError("Title is required.");
      return;
    }
    if (details.trim().length < 5) {
      setError("Please add a bit more detail (at least 5 characters).");
      return;
    }

    setBusy(true);
    try {
      await apiFetch("/api/suggestions", {
        method: "POST",
        body: JSON.stringify({
          title: trimmed,
          details: details.trim(),
          category,
        }),
      });
      setSuccess("Thanks — your suggestion was saved.");
      setTitle("");
      setDetails("");
      setCategory("feature");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save suggestion");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="form-page">
      <h1>Suggestions</h1>
      <p className="muted">
        Share a feature idea, improvement, or bug note. This page teaches a controlled React form
        that POSTs to Express.
      </p>

      <form className="stack-form card-form" onSubmit={onSubmit}>
        <label>
          Title <span className="req">*</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
            placeholder="e.g. Add sound when a Pomodoro ends"
          />
        </label>

        <label>
          Details <span className="req">*</span>
          <textarea
            rows={5}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={2000}
            required
            placeholder="Describe your suggestion…"
          />
        </label>

        <label>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as SuggestionCategory)}
          >
            <option value="feature">Feature</option>
            <option value="improvement">Improvement</option>
            <option value="bug">Bug</option>
            <option value="other">Other</option>
          </select>
        </label>

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}

        <div className="button-row">
          <button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Submit suggestion"}
          </button>
          <button type="button" className="secondary" onClick={() => navigate("/")}>
            Back to Tracker
          </button>
        </div>
      </form>
    </div>
  );
}
