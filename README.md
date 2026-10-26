\# CodeLens



CodeLens is a Python code quality analyzer that helps developers understand, evaluate, and improve their code.



\## Live Demo



Try CodeLens here: https://codelens-analyzer-jm7x.onrender.com/



\## Features



\- Analyze Python code directly in the editor.

\- Upload Python files for analysis.

\- Measure cyclomatic complexity and maintainability.

\- Identify potential code issues with Pylint.

\- Detect selected security-related issues with Bandit.

\- Review findings by severity.

\- Get suggestions for improving code quality.

\- Download analysis reports as JSON files.



\## Technology Stack



\*\*Frontend\*\*

\- React

\- TypeScript

\- Vite

\- CSS



\*\*Backend\*\*

\- Python

\- FastAPI

\- Pylint

\- Radon

\- Bandit



\## How It Works



1\. The user enters Python code or uploads a Python file.

2\. The frontend sends the code to the backend.

3\. The backend analyzes the code and calculates quality metrics.

4\. The frontend displays the results and recommendations.

5\. The user can download the analysis report.



\*\*Security:\*\* CodeLens uses static analysis and does not execute submitted Python code.



\## Run Locally



\### Requirements

\- Python

\- Node.js and npm



\### 1. Clone the repository



```bash

git clone https://github.com/umutcenber/CodeLens.git

cd CodeLens

```



\### 2. Start the backend



```powershell

cd backend

python -m venv .venv

.\\.venv\\Scripts\\Activate.ps1

pip install -r requirements.txt

uvicorn main:app --reload

```



The backend runs at `http://127.0.0.1:8000`.



API documentation: `http://127.0.0.1:8000/docs`



\### 3. Start the frontend



Open a second terminal in the project directory:



```powershell

cd frontend

npm install

npm run dev

```



Open the local URL displayed by Vite.



If needed, configure the backend address in `frontend/.env`:



```env

VITE\_API\_URL=http://127.0.0.1:8000

```



Restart the frontend after changing environment variables.



\## API Endpoints



\- `GET /health` — Checks whether the backend is running.

\- `POST /api/analyze` — Analyzes submitted Python source code.



\## Limitations



\- Static analysis cannot guarantee that code is correct in every situation.

\- Results depend on the analysis tools and their rules.

\- CodeLens currently supports Python.

\- Security checks cannot guarantee that all vulnerabilities will be detected.



\## Author



Created by \[umutcenber](https://github.com/umutcenber).

