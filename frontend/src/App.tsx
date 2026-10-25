import { useState, type ChangeEvent } from "react";
import "./App.css";

type Issue = {
  tool: string;
  code?: string | null;
  severity: string;
  message: string;
  line?: number | null;
  column?: number | null;
  symbol?: string;
  confidence?: string | null;
};

type AnalysisResult = {
  issues: Issue[];
  metrics: {
    average_complexity: number | null;
    maintainability_index: number | null;
    functions: {
      name: string;
      line: number;
      complexity: number;
    }[];
  };
  summary: {
    total_issues: number;
  };
};

// Local development uses localhost; deployment sets VITE_API_URL.
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

function getRecommendation(issue: Issue): string | null {
  if (
    issue.tool === "Pylint" &&
    issue.symbol === "missing-module-docstring"
  ) {
    return "Add a short description at the top of this file explaining its purpose.";
  }

  if (
    issue.tool === "Pylint" &&
    issue.symbol === "missing-function-docstring"
  ) {
    return "Add a docstring explaining what the function does, its parameters, and its return value.";
  }

  if (issue.tool === "Bandit") {
    return "Review the flagged operation and check the relevant secure coding practices before changing the code.";
  }

  return null;
}

function severityClass(severity: string): string {
  const value = severity.toLowerCase();

  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }

  return "unknown";
}

const initialCode = `def add(a, b):
    return a + b
`;

function App() {
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyzeCode() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const data = (await response.json()) as AnalysisResult & {
        detail?: unknown;
      };

      if (!response.ok) {
        const message =
          typeof data.detail === "string"
            ? data.detail
            : "The server could not analyze this request.";

        throw new Error(message);
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} Check that the Python server is running.`
          : "Could not connect to the analysis server.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".py")) {
      setError("Please choose a Python .py file.");
      event.target.value = "";
      return;
    }

    if (file.size > 50_000) {
      setError("The file is too large. The maximum size is 50 KB.");
      event.target.value = "";
      return;
    }

    try {
      const contents = await file.text();

      setCode(contents);
      setResult(null);
      setError("");
    } catch {
      setError("The selected file could not be read.");
    }

    event.target.value = "";
  }

  function downloadReport() {
    if (!result) return;

    const report = {
      application: "CodeLens",
      generatedAt: new Date().toISOString(),
      metrics: result.metrics,
      summary: result.summary,
      issues: result.issues,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "codelens-report.json";
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const issueCount = result?.issues.length ?? 0;
  const highCount =
    result?.issues.filter((issue) => issue.severity.toLowerCase() === "high")
      .length ?? 0;
  const mediumCount =
    result?.issues.filter((issue) => issue.severity.toLowerCase() === "medium")
      .length ?? 0;
  const lowCount =
    result?.issues.filter((issue) => issue.severity.toLowerCase() === "low")
      .length ?? 0;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="CodeLens home">
          <span className="brand-mark">C</span>
          <span className="brand-name">
            CodeLens<span className="brand-period">.</span>
          </span>
        </a>

        <div className="topbar-right">
          <span className="topbar-label">
            <span className="topbar-indicator" />
            PYTHON WORKSPACE
          </span>
          <span className="version-label">V1.0</span>
        </div>
      </header>

      <main className="main-content">
        <section className="hero">
          <div className="hero-copy-block">
            <div className="eyebrow">
              <span className="eyebrow-line" />
              CODE QUALITY, IN FOCUS
            </div>

            <h1>
              Understand your code.
              <br />
              <span>Improve what matters.</span>
            </h1>

            <p className="hero-copy">
              Analyze complexity, inspect potential issues, and discover
              practical ways to make your Python code easier to maintain.
            </p>
          </div>

          <div className="hero-note">
            <div className="hero-note-icon">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 3 19 6V11C19 15.5 16.1 19.2 12 21C7.9 19.2 5 15.5 5 11V6L12 3Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="m9 12 2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <strong>Static analysis</strong>
              <span>Your submitted code is inspected, not executed.</span>
            </div>
          </div>
        </section>

        <section className="workspace" aria-label="Code analysis workspace">
          <div className="panel editor-panel">
            <div className="panel-heading">
              <div className="heading-copy">
                <div className="section-kicker">
                  <span className="section-number">01</span>
                  SOURCE
                </div>
                <h2>Code editor</h2>
                <p>Paste your Python code or upload a file.</p>
              </div>

              <label className="upload-button">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 15V4M8 8l4-4 4 4M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Upload file
                <input
                  type="file"
                  accept=".py"
                  onChange={(event) => void handleFileChange(event)}
                />
              </label>
            </div>

            <div className="editor">
              <div className="editor-toolbar">
                <div className="file-tab">
                  <span className="file-type-icon">Py</span>
                  <span>main.py</span>
                  <span className="file-state-dot" />
                </div>
                <span className="language-label">PYTHON 3</span>
              </div>

              <textarea
                aria-label="Python source code"
                className="code-input"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                value={code}
                maxLength={50000}
                onChange={(event) => {
                  setCode(event.target.value);
                  setResult(null);
                  setError("");
                }}
                placeholder="Paste your Python code here..."
              />

              <div className="editor-statusbar">
                <span>
                  <span className="status-dot-green" />
                  Ready to analyze
                </span>
                <span>{code.length.toLocaleString()} / 50,000 chars</span>
              </div>
            </div>

            <div className="editor-actions">
              <div className="editor-hint">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M12 11v5M12 8h.01"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                Max file size: 50 KB
              </div>

              <button
                className="analyze-button"
                onClick={() => void analyzeCode()}
                disabled={loading || !code.trim()}
              >
                {loading ? (
                  <>
                    <span className="button-spinner" />
                    Analyzing
                  </>
                ) : (
                  <>
                    Analyze code
                    <span className="button-arrow">→</span>
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="error-box" role="alert">
                <span className="error-icon">!</span>
                <div>
                  <strong>Analysis could not be completed</strong>
                  <p>{error}</p>
                </div>
              </div>
            )}
          </div>

          <div className="panel report-panel">
            <div className="panel-heading report-heading">
              <div className="heading-copy">
                <div className="section-kicker">
                  <span className="section-number">02</span>
                  INSIGHTS
                </div>
                <h2>Analysis report</h2>
                <p>
                  {result
                    ? "Review the findings from your latest analysis."
                    : "Your code quality overview will appear here."}
                </p>
              </div>

              <button
                className="export-button"
                onClick={downloadReport}
                disabled={!result}
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 4v11m-4-4 4 4 4-4M5 16v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Export JSON
              </button>
            </div>

            {!result && !error && (
              <div className="empty-state">
                <div className="empty-visual">
                  <div className="empty-visual-ring ring-one" />
                  <div className="empty-visual-ring ring-two" />
                  <div className="empty-visual-center">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M8 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3M16 3h5v5M21 3l-9 9"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M8 15h3M8 11h3"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>

                <h3>Your insights start here</h3>
                <p>
                  Run an analysis to discover code issues, measure
                  complexity, and review improvement suggestions.
                </p>

                <div className="engine-list">
                  <span>
                    <span className="engine-dot pylint-dot" />
                    Pylint
                  </span>
                  <span>
                    <span className="engine-dot radon-dot" />
                    Radon
                  </span>
                  <span>
                    <span className="engine-dot bandit-dot" />
                    Bandit
                  </span>
                </div>
              </div>
            )}

            {result && (
              <div className="report-content">
                <div className="report-status">
                  <div className="report-status-icon">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="m5 12 4 4L19 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <strong>Analysis complete</strong>
                    <span>Results generated successfully</span>
                  </div>
                  <span className="report-status-badge">COMPLETE</span>
                </div>

                <div className="metric-grid">
                  <div className="metric-card">
                    <span className="metric-label">Total findings</span>
                    <div className="metric-value-row">
                      <strong>{issueCount}</strong>
                      <span className="metric-symbol">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path
                            d="M12 3 20 7.5V16.5L12 21 4 16.5V7.5L12 3Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                        </svg>
                      </span>
                    </div>
                    <span className="metric-caption">Reported by tools</span>
                  </div>

                  <div className="metric-card">
                    <span className="metric-label">Avg. complexity</span>
                    <div className="metric-value-row">
                      <strong>{result.metrics.average_complexity ?? "—"}</strong>
                      <span className="metric-symbol">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path
                            d="M4 18V6M4 18H21M8 15l3-4 3 2 5-7"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </div>
                    <span className="metric-caption">Radon complexity</span>
                  </div>

                  <div className="metric-card">
                    <span className="metric-label">Maintainability</span>
                    <div className="metric-value-row">
                      <strong>
                        {result.metrics.maintainability_index ?? "—"}
                      </strong>
                      <span className="metric-symbol">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path
                            d="M12 3 19 6V11C19 15.5 16.1 19.2 12 21C7.9 19.2 5 15.5 5 11V6L12 3Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="m9 12 2 2 4-4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </div>
                    <span className="metric-caption">Radon index / 100</span>
                  </div>
                </div>

                <div className="finding-section">
                  <div className="section-title-row">
                    <div>
                      <h3>Code findings</h3>
                      <p>Review each reported issue and its suggested next step.</p>
                    </div>
                    <span className="finding-count">{issueCount} total</span>
                  </div>

                  {issueCount === 0 ? (
                    <div className="success-box">
                      <span className="success-icon">✓</span>
                      <div>
                        <strong>No reported findings</strong>
                        <p>
                          The enabled tools did not report any issues.
                          This does not guarantee that the code is bug-free.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="severity-summary">
                        <span>
                          <i className="severity-indicator high-indicator" />
                          High <strong>{highCount}</strong>
                        </span>
                        <span>
                          <i className="severity-indicator medium-indicator" />
                          Medium <strong>{mediumCount}</strong>
                        </span>
                        <span>
                          <i className="severity-indicator low-indicator" />
                          Low <strong>{lowCount}</strong>
                        </span>
                      </div>

                      <div className="issue-list">
                        {result.issues.map((issue, index) => {
                          const recommendation = getRecommendation(issue);

                          return (
                            <article
                              className="issue-item"
                              key={`${issue.tool}-${issue.code}-${issue.line}-${index}`}
                            >
                              <span
                                className={`severity-badge severity-${severityClass(issue.severity)}`}
                              >
                                <span className="severity-dot" />
                                {issue.severity}
                              </span>

                              <div className="issue-content">
                                <p className="issue-message">{issue.message}</p>

                                <div className="issue-meta">
                                  <span>{issue.tool}</span>
                                  {issue.code && (
                                    <span className="issue-code">{issue.code}</span>
                                  )}
                                  {issue.line != null && (
                                    <span>Line {issue.line}</span>
                                  )}
                                </div>

                                {recommendation && (
                                  <div className="recommendation">
                                    <span className="recommendation-icon">↗</span>
                                    <div>
                                      <strong>Suggested improvement</strong>
                                      <p>{recommendation}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {result.metrics.functions.length > 0 && (
                  <div className="function-section">
                    <div className="section-title-row">
                      <div>
                        <h3>Function breakdown</h3>
                        <p>Complexity reported for each measured block.</p>
                      </div>
                      <span className="finding-count">
                        {result.metrics.functions.length} functions
                      </span>
                    </div>

                    <div className="function-list">
                      {result.metrics.functions.map((fn, index) => (
                        <div
                          className="function-row"
                          key={`${fn.name}-${index}`}
                        >
                          <div className="function-identity">
                            <span className="function-icon">ƒ</span>
                            <div>
                              <strong>{fn.name}()</strong>
                              <span>Line {fn.line}</span>
                            </div>
                          </div>

                          <div className="complexity-pill">
                            <span>Complexity</span>
                            <strong>{fn.complexity}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="report-error" role="alert">
                <span className="error-icon">!</span>
                <div>
                  <strong>Analysis failed</strong>
                  <p>{error}</p>
                  <button
                    className="retry-button"
                    onClick={() => void analyzeCode()}
                  >
                    Try again →
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <footer className="footer">
          <div className="footer-brand">
            <span className="footer-mark">C</span>
            <span>CodeLens</span>
          </div>
          <span>Understand complexity. Improve code quality.</span>
          <span className="footer-version">EARLY ACCESS · V1</span>
        </footer>
      </main>
    </div>
  );
}

export default App;