import pytest
from fastapi.testclient import TestClient
from app.main import app, seed_initial_database
from app.core.database import Base, engine, SessionLocal

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    seed_initial_database()
    yield

def test_health_check():
    with TestClient(app) as client:
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

def test_auth_login_success():
    with TestClient(app) as client:
        response = client.post("/api/auth/login", json={
            "email": "admin@cloudsentinel.io",
            "password": "Admin@123456"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"

def test_auth_login_invalid_password():
    with TestClient(app) as client:
        response = client.post("/api/auth/login", json={
            "email": "admin@cloudsentinel.io",
            "password": "WrongPassword123"
        })
        assert response.status_code == 401

def test_dashboard_summary():
    with TestClient(app) as client:
        response = client.get("/api/dashboard/summary")
        assert response.status_code == 200
        data = response.json()
        assert "total_events" in data
        assert "critical_alerts" in data
        assert "open_incidents" in data

def test_rules_list():
    with TestClient(app) as client:
        response = client.get("/api/rules")
        assert response.status_code == 200
        rules = response.json()
        assert len(rules) >= 6
        rule_types = [r["rule_type"] for r in rules]
        assert "brute_force" in rule_types
        assert "privilege_change" in rule_types
        assert "admin_tampering" in rule_types

def test_log_ingestion_and_brute_force_detection():
    with TestClient(app) as client:
        # Login as admin to get token
        login_res = client.post("/api/auth/login", json={
            "email": "admin@cloudsentinel.io",
            "password": "Admin@123456"
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Ingest brute force sample
        response = client.post("/api/logs/load-sample/brute_force", headers=headers)
        assert response.status_code == 200
        job = response.json()
        assert job["accepted_records"] > 0

        # Verify that alerts exist
        alerts_res = client.get("/api/alerts", headers=headers)
        assert alerts_res.status_code == 200
        alerts = alerts_res.json()
        assert len(alerts) > 0

def test_incident_lifecycle():
    with TestClient(app) as client:
        login_res = client.post("/api/auth/login", json={
            "email": "analyst@cloudsentinel.io",
            "password": "Analyst@123456"
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create incident
        create_res = client.post("/api/incidents", json={
            "title": "Investigate Unauthorized Egress and Brute Force",
            "description": "Suspicious pattern detected across external IPs.",
            "severity": "high"
        }, headers=headers)
        assert create_res.status_code == 200
        inc = create_res.json()
        inc_id = inc["id"]

        # Add note
        note_res = client.post(f"/api/incidents/{inc_id}/notes", json={
            "note": "IP 198.51.100.45 has been temporarily isolated in security group."
        }, headers=headers)
        assert note_res.status_code == 200

        # Update status to investigating
        update_res = client.patch(f"/api/incidents/{inc_id}", json={
            "status": "investigating"
        }, headers=headers)
        assert update_res.status_code == 200
        assert update_res.json()["status"] == "investigating"

def test_pdf_report_generation():
    with TestClient(app) as client:
        response = client.get("/api/reports/pdf")
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert len(response.content) > 1000
