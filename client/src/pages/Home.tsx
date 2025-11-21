import React, { useState } from "react";

type Mode = "template" | "agent" | "media";

type FieldConfig = {
  name: string;
  label: string;
  type: "text" | "textarea" | "select";
  placeholder?: string;
  options?: string[]; // for select fields
};

type FormData = Record<string, string>;

type ApiResult = {
  ok: boolean;
  promptText?: string;
  trustScore?: number;
  trustBadgeEligible?: boolean;
  error?: string;
};

// ---------- FIELD SCHEMAS ----------

// A) Prompt Template Mode
const templateFields: FieldConfig[] = [
  { name: "title", label: "Title", type: "text", placeholder: "Short name for this prompt template" },
  { name: "goal", label: "Goal", type: "textarea", placeholder: "What should this prompt accomplish?" },
  { name: "task", label: "Task", type: "textarea", placeholder: "What should the AI actually do?" },
  { name: "context", label: "Context", type: "textarea", placeholder: "Any background, audience, or constraints?" },
  { name: "constraints", label: "Constraints", type: "textarea", placeholder: "Rules, limits, or things to avoid" },
  { name: "outputFormat", label: "Output Format", type: "text", placeholder: "e.g. bullets, steps, table, script" },
  { name: "successCriteria", label: "Success Criteria", type: "textarea", placeholder: "How do you know the output is good?" }
];

// B) Prompt Engineer Agent Mode
const agentFields: FieldConfig[] = [
  { name: "agentName", label: "Agent Name", type: "text", placeholder: "e.g. Clarity Architect, Launch Strategist" },
  { name: "personality", label: "Personality & Role Style", type: "textarea", placeholder: "Tone, attitude, role (coach, analyst, etc.)" },
  { name: "domainSpecialty", label: "Domain Specialty", type: "textarea", placeholder: "e.g. YouTube scripts, SaaS onboarding, ecommerce emails" },
  { name: "inputExpectations", label: "Input Expectations", type: "textarea", placeholder: "What the agent expects from the user each time" },
  { name: "outputStyle", label: "Output Style", type: "textarea", placeholder: "Length, structure, formatting preferences" },
  { name: "constraints", label: "Constraints / Guardrails", type: "textarea", placeholder: "Rules, boundaries, do / don’t" },
  { name: "successConditions", label: "Success Conditions", type: "textarea", placeholder: "How this agent knows a response is good" }
];

// C) Media Prompt Blueprint Mode
const mediaFields: FieldConfig[] = [
  {
    name: "mediaType",
    label: "Media Type",
    type: "select",
    options: ["video", "image", "music", "soundfx"],
    placeholder: "Select media type"
  },
  { name: "style", label: "Style / Aesthetic", type: "textarea", placeholder: "Visual / audio style, mood, vibe" },
  { name: "purpose", label: "Purpose / Intent", type: "textarea", placeholder: "What this media is trying to achieve" },
  { name: "platform", label: "Target Platform", type: "text", placeholder: "e.g. TikTok, YouTube, Instagram, podcast, ad network" },
  { name: "duration", label: "Duration / Length", type: "text", placeholder: "e.g. 15s, 60s, 5 min, 3 scenes" },
  { name: "composition", label: "Composition / Structure Details", type: "textarea", placeholder: "Scene / shot / beat breakdown, sections, layers" },
  { name: "constraints", label: "Constraints", type: "textarea", placeholder: "e.g. no gore, no copyrighted music, brand-safe only" },
  { name: "outputFormat", label: "Output Format", type: "text", placeholder: "e.g. shot list, storyboard, edit script, sound design notes" }
];

const modeLabels: Record<Mode, string> = {
  template: "Prompt Template",
  agent: "Prompt Engineer Agent",
  media: "Media Prompt Blueprint"
};

const modeFields: Record<Mode, FieldConfig[]> = {
  template: templateFields,
  agent: agentFields,
  media: mediaFields
};

// ---------- HELPERS ----------

function createInitialFormData(fields: FieldConfig[]): FormData {
  const entries = fields.map((f) => [f.name, ""] as const);
  return Object.fromEntries(entries) as FormData;
}

// ---------- MAIN PAGE COMPONENT ----------

export default function Home() {
  const [mode, setMode] = useState<Mode>("template");
  const [formData, setFormData] = useState<FormData>(() =>
    createInitialFormData(modeFields["template"])
  );
  const [result, setResult] = useState<ApiResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fields = modeFields[mode];

  function handleModeChange(nextMode: Mode) {
    setMode(nextMode);
    setFormData(createInitialFormData(modeFields[nextMode]));
    setResult(null); // clear previous output when switching modes
  }

  function handleFieldChange(name: string, value: string) {
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          formData,
          trustSettings: {
            rubric: "strict"
          }
        })
      });

      const json = (await response.json()) as any;

      if (!response.ok || !json.ok) {
        setResult({
          ok: false,
          error: json.error || "Generate failed"
        });
      } else {
        setResult({
          ok: true,
          promptText: json.promptText,
          trustScore: json.trustScore,
          trustBadgeEligible: json.trustBadgeEligible
        });
      }
    } catch (err: any) {
      setResult({
        ok: false,
        error: err?.message || "Network error"
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "1.5rem",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        backgroundColor: "#0b1120",
        color: "#e5e7eb",
      }}
    >
      <div
        style={{
          maxWidth: "960px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <header
          style={{
            marginBottom: "1.5rem",
            paddingBottom: "1rem",
            borderBottom: "1px solid rgba(148, 163, 184, 0.4)",
          }}
        >
          <h1
            style={{
              fontSize: "1.8rem",
              fontWeight: 700,
              margin: 0,
              color: "#f9fafb",
            }}
          >
            PromptMakerPro
          </h1>
          <p
            style={{
              marginTop: "0.4rem",
              marginBottom: "0.8rem",
              color: "#9ca3af",
            }}
          >
            Single-page builder for Prompt Templates, Agent Prompts, and Media Blueprints.
          </p>
        </header>

        {/* Mode Switcher */}
        <section
          style={{
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              borderRadius: "999px",
              border: "1px solid rgba(148, 163, 184, 0.6)",
              overflow: "hidden",
              backgroundColor: "rgba(15, 23, 42, 0.8)",
            }}
          >
            {(["template", "agent", "media"] as Mode[]).map((m) => {
              const isActive = m === mode;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleModeChange(m)}
                  style={{
                    padding: "0.45rem 0.9rem",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: isActive ? 600 : 400,
                    backgroundColor: isActive ? "#38bdf8" : "transparent",
                    color: isActive ? "#0f172a" : "#e5e7eb",
                    transition: "background-color 0.15s ease, color 0.15s ease",
                  }}
                >
                  {modeLabels[m]}
                </button>
              );
            })}
          </div>
        </section>

        {/* Form + Output layout */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)",
            gap: "1.25rem",
            alignItems: "flex-start",
          }}
        >
          {/* Form Panel */}
          <form
            onSubmit={handleSubmit}
            style={{
              padding: "1rem",
              borderRadius: "0.75rem",
              backgroundColor: "#020617",
              border: "1px solid rgba(15, 23, 42, 0.9)",
              boxShadow: "0 10px 40px rgba(15, 23, 42, 0.7)",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                marginBottom: "0.75rem",
                fontSize: "1.1rem",
                fontWeight: 600,
                color: "#f9fafb",
              }}
            >
              {modeLabels[mode]} — Input
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {fields.map((field) => {
                const value = formData[field.name] ?? "";

                return (
                  <div key={field.name} style={{ display: "flex", flexDirection: "column" }}>
                    <label
                      htmlFor={field.name}
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 500,
                        marginBottom: "0.25rem",
                        color: "#e5e7eb",
                      }}
                    >
                      {field.label}
                    </label>

                    {field.type === "select" && field.options ? (
                      <select
                        id={field.name}
                        name={field.name}
                        value={value}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        style={{
                          padding: "0.4rem 0.5rem",
                          borderRadius: "0.4rem",
                          border: "1px solid rgba(55, 65, 81, 0.9)",
                          backgroundColor: "#020617",
                          color: "#e5e7eb",
                          fontSize: "0.85rem",
                        }}
                      >
                        <option value="">{field.placeholder || "Select an option"}</option>
                        {field.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "textarea" ? (
                      <textarea
                        id={field.name}
                        name={field.name}
                        value={value}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        rows={3}
                        placeholder={field.placeholder}
                        style={{
                          padding: "0.45rem 0.55rem",
                          borderRadius: "0.4rem",
                          border: "1px solid rgba(55, 65, 81, 0.9)",
                          backgroundColor: "#020617",
                          color: "#e5e7eb",
                          fontSize: "0.85rem",
                          resize: "vertical",
                          minHeight: "3.5rem",
                        }}
                      />
                    ) : (
                      <input
                        id={field.name}
                        name={field.name}
                        type="text"
                        value={value}
                        placeholder={field.placeholder}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        style={{
                          padding: "0.4rem 0.5rem",
                          borderRadius: "0.4rem",
                          border: "1px solid rgba(55, 65, 81, 0.9)",
                          backgroundColor: "#020617",
                          color: "#e5e7eb",
                          fontSize: "0.85rem",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Submit button + status */}
            <div
              style={{
                marginTop: "0.9rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "999px",
                  border: "none",
                  cursor: isLoading ? "default" : "pointer",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  backgroundColor: isLoading ? "#0ea5e9" : "#38bdf8",
                  color: "#0f172a",
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                {isLoading ? "Generating..." : "Generate Prompt"}
              </button>

              {isLoading && (
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "#9ca3af",
                  }}
                >
                  Calling /api/generate…
                </span>
              )}
            </div>
          </form>

          {/* Output Panel */}
          <section
            style={{
              padding: "1rem",
              borderRadius: "0.75rem",
              backgroundColor: "#020617",
              border: "1px solid rgba(15, 23, 42, 0.9)",
              boxShadow: "0 10px 40px rgba(15, 23, 42, 0.7)",
              minHeight: "180px",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                marginBottom: "0.75rem",
                fontSize: "1.05rem",
                fontWeight: 600,
                color: "#f9fafb",
              }}
            >
              Generated Output
            </h2>

            {!result && (
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "#6b7280",
                }}
              >
                Fill in the fields on the left and click{" "}
                <strong>Generate Prompt</strong> to see your result here.
              </p>
            )}

            {result && !result.ok && (
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "#fecaca",
                  backgroundColor: "rgba(127, 29, 29, 0.4)",
                  borderRadius: "0.4rem",
                  padding: "0.6rem 0.7rem",
                }}
              >
                <strong>Error:</strong> {result.error || "Something went wrong."}
              </div>
            )}

            {result && result.ok && (
              <div
                style={{
                  fontSize: "0.86rem",
                  color: "#e5e7eb",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                }}
              >
                {typeof result.trustScore === "number" && (
                  <div
                    style={{
                      marginBottom: "0.5rem",
                      fontSize: "0.8rem",
                      color: "#93c5fd",
                    }}
                  >
                    Trust score: <strong>{result.trustScore}</strong>
                    {result.trustBadgeEligible ? " (badge eligible)" : ""}
                  </div>
                )}
                {result.promptText}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
