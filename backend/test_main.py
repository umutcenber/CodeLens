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
