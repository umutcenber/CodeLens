from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_valid_python_code_returns_report():
    response = client.post(
        "/api/analyze",
        json={"code": "def add(a, b):\n    return a + b\n"},
    )

    assert response.status_code == 200

    data = response.json()

    assert "issues" in data
    assert "metrics" in data
    assert "summary" in data
    assert data["summary"]["total_issues"] == len(data["issues"])
    assert data["metrics"]["functions"][0]["name"] == "add"
    assert data["metrics"]["functions"][0]["complexity"] == 1


def test_invalid_python_syntax_is_reported():
    response = client.post(
        "/api/analyze",
        json={"code": "def add(:\n    return 1\n"},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["issues"][0]["code"] == "SYNTAX_ERROR"
    assert data["metrics"]["average_complexity"] is None


def test_empty_code_is_rejected():
    response = client.post(
        "/api/analyze",
        json={"code": ""},
    )

    assert response.status_code == 422


def test_whitespace_only_code_is_rejected():
    response = client.post(
        "/api/analyze",
        json={"code": "   \n  "},
    )

    assert response.status_code == 422


def test_code_over_size_limit_is_rejected():
    response = client.post(
        "/api/analyze",
        json={"code": "x" * 50001},
    )

    assert response.status_code == 422


def test_multiple_functions_are_measured():
    source = (
        "def simple():\n"
        "    return 1\n"
        "\n"
        "def choose(value):\n"
        "    if value:\n"
        "        return 1\n"
        "    return 0\n"
    )

    response = client.post(
        "/api/analyze",
        json={"code": source},
    )

    assert response.status_code == 200

    data = response.json()
    functions = data["metrics"]["functions"]

    assert len(functions) == 2

    function_names = {function["name"] for function in functions}
    assert function_names == {"simple", "choose"}

    complexities = {
        function["name"]: function["complexity"]
        for function in functions
    }

    assert complexities["simple"] == 1
    assert complexities["choose"] == 2


def test_bandit_security_finding_is_included():
    source = (
        "def parse_value(value):\n"
        "    return eval(value)\n"
    )

    response = client.post(
        "/api/analyze",
        json={"code": source},
    )

    assert response.status_code == 200

    data = response.json()

    security_findings = [
        issue
        for issue in data["issues"]
        if issue["tool"] == "Bandit"
    ]

    assert any(
        issue["code"] == "B307"
        for issue in security_findings
    )

    assert data["summary"]["total_issues"] == len(data["issues"])