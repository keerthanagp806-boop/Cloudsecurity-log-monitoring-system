import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.core.security import get_password_hash
from app.models.models import User
from app.services.detection_engine import ensure_default_rules
from app.services.ingestion_service import process_log_content

# Routers
from app.api import auth, dashboard, logs, events, rules, alerts, incidents, analytics, reports, audit, ai_assistant

def seed_initial_database():
    db = SessionLocal()
    try:
        # 1. Create default users if not present
        default_users = [
            {
                "email": "admin@cloudsentinel.io",
                "name": "Alex Vance (SecOps Lead)",
                "password_hash": get_password_hash("Admin@123456"),
                "role": "admin"
            },
            {
                "email": "analyst@cloudsentinel.io",
                "name": "Sarah Connor (SOC Tier-2)",
                "password_hash": get_password_hash("Analyst@123456"),
                "role": "analyst"
            },
            {
                "email": "viewer@cloudsentinel.io",
                "name": "Morgan Reed (Auditor)",
                "password_hash": get_password_hash("Viewer@123456"),
                "role": "viewer"
            }
        ]

        for u_data in default_users:
            existing = db.query(User).filter(User.email == u_data["email"]).first()
            if not existing:
                user = User(**u_data)
                db.add(user)
        db.commit()

        # 2. Seed detection rules
        ensure_default_rules(db)

        # 3. Seed initial sample events if database has 0 events
        from app.models.models import SecurityEvent
        if db.query(SecurityEvent).count() == 0:
            sample_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sample_data", "enterprise_siem_mix.json")
            if os.path.exists(sample_file):
                with open(sample_file, "r", encoding="utf-8") as f:
                    content = f.read()
                process_log_content(
                    db=db,
                    content=content,
                    file_name="enterprise_siem_mix.json",
                    source_name="Seed: Initial Enterprise Mix"
                )
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schemas and seeds on startup
    Base.metadata.create_all(bind=engine)
    seed_initial_database()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="CloudSentinel: Web-Based Cloud Security Information and Event Management (SIEM) Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(logs.router, prefix=settings.API_V1_STR)
app.include_router(events.router, prefix=settings.API_V1_STR)
app.include_router(rules.router, prefix=settings.API_V1_STR)
app.include_router(alerts.router, prefix=settings.API_V1_STR)
app.include_router(incidents.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)
app.include_router(ai_assistant.router, prefix=settings.API_V1_STR)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "CloudSentinel SIEM Engine",
        "version": "1.0.0"
    }

# Serve frontend build assets if frontend/dist exists
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    from fastapi.staticfiles import StaticFiles
    from starlette.responses import FileResponse

    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        return {"status": "ok", "message": "CloudSentinel API"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
