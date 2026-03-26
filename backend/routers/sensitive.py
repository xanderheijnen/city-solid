"""Zone B endpoints — sensitive candidate data (BSN, medical, justice, debt)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from supabase import create_client

from auth import CurrentUser, require_roles
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

router = APIRouter(prefix="/api/sensitive", tags=["sensitive"])

_sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


# ── Models ───────────────────────────────────────────────────────────────────

class SensitiveData(BaseModel):
    kandidaat_id: str
    bsn_last4: str | None = None
    bsn_encrypted: str | None = None
    medische_bijzonderheden: str | None = None
    middelengebruik: str | None = None
    aanraking_politie_justitie: bool = False
    aanraking_reden: str | None = None
    veroordeeld_detentie: str | None = None
    lopende_zaken: str | None = None
    heeft_schulden: bool = False
    schulden_reden_bedrag: str | None = None
    schulden_afspraken: str | None = None


class SensitiveUpdate(BaseModel):
    medische_bijzonderheden: str | None = None
    middelengebruik: str | None = None
    aanraking_politie_justitie: bool | None = None
    aanraking_reden: str | None = None
    veroordeeld_detentie: str | None = None
    lopende_zaken: str | None = None
    heeft_schulden: bool | None = None
    schulden_reden_bedrag: str | None = None
    schulden_afspraken: str | None = None


# ── Helpers ──────────────────────────────────────────────────────────────────

def _log_access(user_id: str, kandidaat_id: str, action: str, request: Request) -> None:
    """Log access to sensitive data (server-side, not bypassable)."""
    ip = request.client.host if request.client else None
    _sb.table("cs_sensitive_access_log").insert({
        "user_id": user_id,
        "kandidaat_id": kandidaat_id,
        "action": action,
        "ip_adres": ip,
    }).execute()


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/{kandidaat_id}", response_model=SensitiveData)
async def get_sensitive_data(
    kandidaat_id: str,
    request: Request,
    user: CurrentUser = Depends(require_roles("admin", "intaker")),
):
    """Fetch sensitive data for a candidate. Logs access automatically."""
    resp = (
        _sb.table("cs_kandidaten_sensitive")
        .select("*")
        .eq("kandidaat_id", kandidaat_id)
        .maybe_single()
        .execute()
    )

    if not resp.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No sensitive data found")

    # Log this access server-side
    _log_access(user.id, kandidaat_id, "VIEW_SENSITIVE", request)

    return resp.data


@router.put("/{kandidaat_id}")
async def update_sensitive_data(
    kandidaat_id: str,
    body: SensitiveUpdate,
    request: Request,
    user: CurrentUser = Depends(require_roles("admin", "intaker")),
):
    """Update sensitive data for a candidate. Logs the change."""
    updates = body.model_dump(exclude_none=True)
    if not updates:
        return {"ok": True, "message": "Nothing to update"}

    resp = (
        _sb.table("cs_kandidaten_sensitive")
        .update(updates)
        .eq("kandidaat_id", kandidaat_id)
        .execute()
    )

    _log_access(user.id, kandidaat_id, "UPDATE_SENSITIVE", request)

    return {"ok": True, "updated_fields": list(updates.keys())}


@router.get("/{kandidaat_id}/bsn")
async def get_bsn(
    kandidaat_id: str,
    request: Request,
    user: CurrentUser = Depends(require_roles("admin")),
):
    """Decrypt and return full BSN. Admin only. Logged."""
    resp = (
        _sb.table("cs_kandidaten_sensitive")
        .select("bsn_encrypted, bsn_last4")
        .eq("kandidaat_id", kandidaat_id)
        .maybe_single()
        .execute()
    )

    if not resp.data or not resp.data.get("bsn_encrypted"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No BSN found")

    _log_access(user.id, kandidaat_id, "VIEW_BSN", request)

    # TODO: Replace with actual decryption when encryption is implemented
    return {
        "bsn_full": resp.data["bsn_encrypted"],
        "bsn_last4": resp.data["bsn_last4"],
    }
