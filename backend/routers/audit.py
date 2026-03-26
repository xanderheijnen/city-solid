"""Audit log endpoints — server-side logging & viewing."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from supabase import create_client

from auth import CurrentUser, get_current_user, require_roles
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

router = APIRouter(prefix="/api/audit", tags=["audit"])

_sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


class AuditLogEntry(BaseModel):
    actie: str
    object_type: str
    object_id: str | None = None
    omschrijving: str | None = None
    oude_waarden: dict | None = None
    nieuwe_waarden: dict | None = None


@router.post("/log")
async def create_audit_entry(
    body: AuditLogEntry,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    """Create an audit log entry. Any authenticated user can log actions."""
    ip = request.client.host if request.client else None

    _sb.table("cs_audit_log").insert({
        "user_id": user.id,
        "actie": body.actie,
        "object_type": body.object_type,
        "object_id": body.object_id,
        "omschrijving": body.omschrijving,
        "oude_waarden": body.oude_waarden,
        "nieuwe_waarden": body.nieuwe_waarden,
        "ip_adres": ip,
    }).execute()

    return {"ok": True}


@router.get("/log")
async def get_audit_log(
    search: str | None = None,
    actie: str | None = None,
    limit: int = 200,
    user: CurrentUser = Depends(require_roles("admin", "manager")),
):
    """Fetch audit log entries. Admin/manager only."""
    query = (
        _sb.table("cs_audit_log")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
    )

    if actie:
        query = query.eq("actie", actie)
    if search:
        query = query.or_(
            f"omschrijving.ilike.%{search}%,object_type.ilike.%{search}%"
        )

    resp = query.execute()
    return resp.data or []
