from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import init_db
from .routers import health, device, telemetry, analytics, demand, alerts, ai, loads, ac_telemetry

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database schema and seed defaults
    init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_TITLE,
    description="Backend REST API for AI & IoT Smart PV Plant with Maximum Demand Loss Analysis",
    version=settings.VERSION,
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(health.router)
app.include_router(device.router)
app.include_router(telemetry.router)
app.include_router(analytics.router)
app.include_router(demand.router)
app.include_router(alerts.router)
app.include_router(ai.router)
# Load shedding routers (current semester)
app.include_router(loads.router)
app.include_router(ac_telemetry.router)

@app.get("/", tags=["Root"])
def root():
    return {
        "title": settings.PROJECT_TITLE,
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "health_check": "/api/health",
    }
