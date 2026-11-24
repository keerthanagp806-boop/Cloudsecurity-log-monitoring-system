# CloudSentinel: Cloud Security Log Monitoring & SIEM Platform

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/keerthanagp806-boop/Cloudsecurity-log-monitoring-system)

CloudSentinel is an enterprise-grade, web-based Cloud Security Information and Event Management (SIEM) platform designed for SOC teams, security analysts, and cloud administrators. It delivers real-time security log ingestion, automated detection rules, threat analytics, incident response workflows, and AI-powered security analysis.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│           CloudSentinel React + Vite SPA               │
│     (Dashboard, Alerts, Incidents, Analytics, AI)       │
└───────────────────────────┬────────────────────────────┘
                            │ REST / JSON (JWT Auth)
┌───────────────────────────▼────────────────────────────┐
│              FastAPI Asynchronous Engine               │
│   ├── Ingestion Service (AWS CloudTrail, Syslog, Auth) │
│   ├── SIEM Detection & Correlation Rules Engine        │
│   ├── AI Security Assistant & Summarizer               │
│   └── ReportLab PDF & CSV Export Service               │
└───────────────────────────┬────────────────────────────┘
                            │ SQLAlchemy ORM
┌───────────────────────────▼────────────────────────────┐
│           SQLite (Default) / PostgreSQL                │
└────────────────────────────────────────────────────────┘
```

---

## Key Features

- **Multi-Source Log Ingestion**: Ingest AWS CloudTrail, Linux Syslog, Windows Security Events, and custom JSON/CSV security logs.
- **Rule-Based Threat Detection**: Pre-configured & custom SIEM correlation rules (Brute-force attack, Privilege Escalation, API Tampering, Unauthorized Access).
- **Incident Management**: Triage security alerts into tracked incidents with severity ratings, status workflows, and analyst notes.
- **Threat Analytics**: Real-time IP address threat ranking, geographic insights, and authentication failure rate tracking.
- **AI Security Analyst**: Interactive AI assistance for incident explanation, root cause analysis, and remediation playbooks.
- **Export & Compliance Reporting**: Instant PDF executive summaries and CSV log dumps for compliance audits.
- **Role-Based Access Control (RBAC)**: Distinct permissions for `admin`, `analyst`, and `viewer` roles.

---

## Default Demo Accounts

Upon initial startup, the database auto-seeds with pre-configured accounts:

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@cloudsentinel.io` | `Admin@123456` | Full system, rules, and user management |
| **Analyst** | `analyst@cloudsentinel.io` | `Analyst@123456` | Alert triage, incident response, log ingestion |
| **Viewer** | `viewer@cloudsentinel.io` | `Viewer@123456` | Read-only analytics, reports, and audit logs |

---

## Deployment on Render

### Method 1: Render Blueprint (Recommended)
1. Push this repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** $\rightarrow$ **Blueprint**.
3. Select your repository. Render reads `render.yaml` and provisions both the FastAPI Backend and the React Frontend automatically.

### Method 2: Manual Dashboard Setup

#### 1. Backend Web Service
- **Environment**: Python 3
- **Root Directory**: `backend`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables**:
  - `SECRET_KEY`: `<your-random-secret>`
  - `DATABASE_URL`: `sqlite:///./cloudsentinel.db` (or a Render PostgreSQL connection string)

#### 2. Frontend Static Site
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_URL`: `<your-backend-web-service-url>`
- **Rewrite Rule**:
  - Source: `/*` $\rightarrow$ Destination: `/index.html` (Action: `Rewrite`)

---

## Local Development

### Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
- API Health check: `http://localhost:8000/api/health`
- Interactive API Docs: `http://localhost:8000/docs`

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
- Open `http://localhost:5173`
