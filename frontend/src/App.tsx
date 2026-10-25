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

function getRecommendation(issue: Issue): string | null {
  if (
    issue.tool === "Pylint" &&
    issue.symbol === "missing-module-docstring"
  ) {
    return "Add a short description at the top of the file explaining its purpose.";
  }

  if (
    issue.tool === "Pylint" &&
    issue.symbol === "missing-function-docstring"
  ) {
    return "Add a docstring inside the function explaining what it does, its parameters, and its return value.";
  }

  if (issue.tool === "Bandit") {
    return "Review this security finding carefully. Check the flagged operation and follow the recommended secure coding practices for that type of issue.";
  }

  return null;
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
      const response = await fetch(
        "http://127.0.0.1:8000/api/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        },
      );

      const data = (await response.json()) as AnalysisResult & {
        detail?: string | { msg?: string }[];
      };

      if (!response.ok) {
        const detail =
          typeof data.detail === "string"
            ? data.detail
            : "Analysis failed. Please check your code and try again.";

        throw new Error(detail);
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} Make sure the Python analysis server is running.`
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

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".py")) {
      setError("Please choose a Python .py file.");
      event.target.value = "";
      return;
    }

    if (file.size > 50_000) {
      setError("This file is too large. The limit is 50 KB.");
      event.target.value = "";
      return;
    }

    try {
      const fileContents = await file.text();

      setCode(fileContents);
      setResult(null);
      setError("");
    } catch {
      setError("The selected file could not be read.");
    }

    event.target.value = "";
  }

  function downloadReport() {
    if (!result) {
      return;
    }

    const report = {
      application: "CodeLens",
      generatedAt: new Date().toISOString(),
      metrics: result.metrics,
      summary: result.summary,
      issues: result.issues,
    };

    const blob = new Blob(
      [JSON.stringify(report, null, 2)],
      { type: "application/json" },
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "codelens-report.json";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  const issueCount = result?.issues.length ?? 0;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#">
          <span className="brand-mark">C</span>
          <span>
            CodeLens<span className="brand-dot">.</span>
          </span>
        </a>

        <span className="status-pill">
          <span className="status-dot" />
          Python static analysis
        </span>
      </header>

      <main className="main-content">
        <section className="hero">
          <p className="eyebrow">YOUR CODE, UNDERSTOOD</p>

          <h1>
            Write better code.
            <br />
            <span>See what matters.</span>
          </h1>

          <p className="hero-copy">
            Understand complexity, discover potential issues, and
            make your Python code easier to maintain.
          </p>
        </section>

        <section className="workspace">
          <div className="panel editor-panel">
            <div className="panel-header">
              <div>
                <span className="step-label">01 / INPUT</span>
                <h2>Your Python code</h2>
              </div>

              <label className="upload-button">
                Upload .py
                <input
                  type="file"
                  accept=".py"
                  onChange={(event) =>
                    void handleFileChange(event)
                  }
                />
              </label>
            </div>

            <div className="editor">
              <div className="editor-toolbar">
                <span className="file-dot" />
                <span>main.py</span>
                <span className="language-label">PYTHON</span>
              </div>

              <textarea
                aria-label="Python source code"
                className="code-input"
                spellCheck={false}
                value={code}
                maxLength={50000}
                onChange={(event) => {
                  setCode(event.target.value);
                  setError("");
                  setResult(null);
                }}
                placeholder="Paste your Python code here..."
              />
            </div>

            <div className="editor-footer">
              <span>
                {code.length.toLocaleString()} characters
              </span>

              <button
                className="analyze-button"
                onClick={() => void analyzeCode()}
                disabled={loading || !code.trim()}
              >
                {loading ? "Analyzing..." : "Analyze code"}
                {!loading && (
                  <span aria-hidden="true">→</span>
                )}
              </button>
            </div>
          </div>

          <div className="panel report-panel">
            <div className="panel-header report-header">
              <div>
                <span className="step-label">02 / RESULTS</span>
                <h2>Analysis report</h2>
              </div>

              <button
                className="download-button"
                onClick={downloadReport}
                disabled={!result}
              >
                ↓ Export JSON
              </button>
            </div>

            {error && (
              <div className="error-box" role="alert">
                <strong>Something went wrong</strong>
                <p>{error}</p>
              </div>
            )}

            {!result && !error && (
              <div className="empty-state">
                <div className="empty-icon">
                  {loading ? "…" : "⌁"}
                </div>

                <h3>
                  {loading
                    ? "Reviewing your code"
                    : "Your report starts here"}
                </h3>

                <p>
                  {loading
                    ? "Checking your code with the analysis tools."
                    : "Run an analysis to discover issues and explore your code metrics."}
                </p>

                <div className="tool-tags">
                  <span>Pylint</span>
                  <span>Radon</span>
                  <span>Bandit</span>
                </div>
              </div>
            )}

            {result && (
              <div className="results">
                <div className="metric-grid">
                  <div className="metric-card">
                    <span>Total issues</span>
                    <strong>{issueCount}</strong>
                    <small>Reported findings</small>
                  </div>

                  <div className="metric-card">
                    <span>Avg. complexity</span>
                    <strong>
                      {result.metrics.average_complexity ?? "—"}
                    </strong>
                    <small>Radon measurement</small>
                  </div>

                  <div className="metric-card">
                    <span>Maintainability</span>
                    <strong>
                      {result.metrics.maintainability_index ?? "—"}
                    </strong>
                    <small>Index out of 100</small>
                  </div>
                </div>

                <div className="issues-section">
                  <div className="section-heading">
                    <h3>Findings</h3>
                    <span>{issueCount} reported</span>
                  </div>

                  {issueCount === 0 ? (
                    <div className="success-box">
                      No issues were reported by the enabled tools.
                      This does not guarantee that the code is
                      bug-free.
                    </div>
                  ) : (
                    <div className="issue-list">
                      {result.issues.map((issue, index) => {
                        const recommendation =
                          getRecommendation(issue);

                        return (
                          <article
                            className="issue-item"
                            key={`${issue.tool}-${issue.code}-${issue.line}-${index}`}
                          >
                            <span
                              className={`severity severity-${issue.severity.toLowerCase()}`}
                            >
                              {issue.severity}
                            </span>

                            <div className="issue-content">
                              <p>{issue.message}</p>

                              <span className="issue-meta">
                                {issue.tool}
                                {issue.code
                                  ? ` · ${issue.code}`
                                  : ""}
                                {issue.line
                                  ? ` · Line ${issue.line}`
                                  : ""}
                              </span>

                              {recommendation && (
                                <p className="issue-recommendation">
                                  <strong>Suggestion:</strong>{" "}
                                  {recommendation}
                                </p>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>

                {result.metrics.functions.length > 0 && (
                  <div className="issues-section">
                    <div className="section-heading">
                      <h3>Functions</h3>
                      <span>
                        {result.metrics.functions.length} found
                      </span>
                    </div>

                    <div className="function-list">
                      {result.metrics.functions.map(
                        (fn, index) => (
                          <div
                            className="function-row"
                            key={`${fn.name}-${index}`}
                          >
                            <div>
                              <strong>{fn.name}()</strong>
                              <span>Line {fn.line}</span>
                            </div>

                            <span className="complexity-value">
                              Complexity: {fn.complexity}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <footer className="footer">
          <span>
            CodeLens · Python code quality, made clearer.
          </span>
          <span>Powered by open-source analysis tools</span>
        </footer>
      </main>
    </div>
  );
}

export default App;