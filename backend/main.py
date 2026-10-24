import ast
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from radon.complexity import cc_visit
from radon.metrics import mi_visit

app = FastAPI(title="CodeLens API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    code: str = Field(min_length=1, max_length=50000)


def run_tool(arguments: list[str]) -> subprocess.CompletedProcess:
    try:
        return subprocess.run(
            [sys.executable, *arguments],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=20,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(
            status_code=504,
            detail="Analiz zaman aşımına uğradı.",
        ) from exc
    except OSError as exc:
        raise HTTPException(
            status_code=500,
            detail="Analiz aracı başlatılamadı.",
        ) from exc


@app.get("/")
def home():
    return {"message": "Welcome to CodeLens!"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/analyze")
def analyze(request: AnalyzeRequest):
    source = request.code

    if not source.strip():
        raise HTTPException(status_code=422, detail="Kod boş olamaz.")

    try:
        ast.parse(source)
    except SyntaxError as exc:
        return {
            "issues": [{
                "tool": "Python",
                "code": "SYNTAX_ERROR",
                "severity": "high",
                "message": exc.msg,
                "line": exc.lineno,
                "column": exc.offset,
            }],
            "metrics": {
                "average_complexity": None,
                "maintainability_index": None,
                "functions": [],
            },
            "summary": {"total_issues": 1},
        }

    try:
        blocks = cc_visit(source)
        functions = [
            {
                "name": block.name,
                "line": block.lineno,
                "complexity": block.complexity,
            }
            for block in blocks
        ]
        average_complexity = (
            round(sum(item["complexity"] for item in functions)
                  / len(functions), 2)
            if functions else 0
        )
        maintainability = round(mi_visit(source, multi=True), 2)
    except (SyntaxError, ValueError) as exc:
        raise HTTPException(
            status_code=422,
            detail="Kod metrikleri hesaplanamadı.",
        ) from exc

    issues = []

    with tempfile.TemporaryDirectory(prefix="codelens_") as temp_dir:
        file_path = Path(temp_dir) / "submitted_code.py"
        file_path.write_text(source, encoding="utf-8")

        pylint_result = run_tool([
            "-m", "pylint",
            "--output-format=json",
            "--score=n",
            str(file_path),
        ])

        try:
            pylint_messages = json.loads(pylint_result.stdout or "[]")
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=502,
                detail="Pylint sonucu okunamadı.",
            ) from exc

        for message in pylint_messages:
            category = message.get("type", "")
            severity = (
                "high" if category in ("error", "fatal")
                else "medium" if category == "warning"
                else "low"
            )
            issues.append({
                "tool": "Pylint",
                "code": message.get("message-id"),
                "severity": severity,
                "message": message.get("message"),
                "line": message.get("line"),
                "column": message.get("column"),
                "symbol": message.get("symbol"),
            })

        bandit_result = run_tool([
            "-m", "bandit",
            "-f", "json",
            str(file_path),
        ])

        try:
            bandit_data = json.loads(bandit_result.stdout or "{}")
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=502,
                detail="Bandit sonucu okunamadı.",
            ) from exc

        for finding in bandit_data.get("results", []):
            issues.append({
                "tool": "Bandit",
                "code": finding.get("test_id"),
                "severity": finding.get("issue_severity", "LOW").lower(),
                "message": finding.get("issue_text"),
                "line": finding.get("line_number"),
                "confidence": finding.get("issue_confidence"),
            })

    severity_order = {"high": 0, "medium": 1, "low": 2}
    issues.sort(
        key=lambda item: severity_order.get(item["severity"], 3)
    )

    return {
        "issues": issues,
        "metrics": {
            "average_complexity": average_complexity,
            "maintainability_index": maintainability,
            "functions": functions,
        },
        "summary": {"total_issues": len(issues)},
    }
