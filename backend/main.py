"""City Solid Backend — FastAPI service layer for sensitive operations."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import CORS_ORIGINS
from routers import sensitive, files, audit

app = FastAPI(
    title="City Solid API",
    description="Service layer for Zone B (sensitive data) and Zone C (verification documents)",
    version="1.0.0",
)

# CORS — allow frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(sensitive.router)
app.include_router(files.router)
app.include_router(audit.router)


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "city-solid-api"}
