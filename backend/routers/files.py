"""Zone C endpoints — ID-scan & verification document management."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, status
from supabase import create_client

from auth import CurrentUser, require_roles
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

router = APIRouter(prefix="/api/files", tags=["files"])

_sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

BUCKET = "kandidaat-verificatie"
SIGNED_URL_EXPIRY = 5 * 60  # 5 minutes
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}


def _log_access(user_id: str, kandidaat_id: str, action: str, request: Request) -> None:
    ip = request.client.host if request.client else None
    _sb.table("cs_sensitive_access_log").insert({
        "user_id": user_id,
        "kandidaat_id": kandidaat_id,
        "action": action,
        "ip_adres": ip,
    }).execute()


@router.post("/verification/{kandidaat_id}/upload")
async def upload_verification_file(
    kandidaat_id: str,
    request: Request,
    file: UploadFile = File(...),
    user: CurrentUser = Depends(require_roles("admin", "intaker")),
):
    """Upload an ID-scan or verification document. Admin/intaker only."""
    # Validate content type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Bestandstype {file.content_type} niet toegestaan. "
            f"Toegestaan: {', '.join(ALLOWED_TYPES)}",
        )

    # Read and validate size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Bestand te groot (max {MAX_FILE_SIZE // 1024 // 1024} MB)",
        )

    # Generate safe path (UUID only, no PII)
    ext = (file.filename or "bin").rsplit(".", 1)[-1].lower()
    doc_id = str(uuid.uuid4())
    path = f"{kandidaat_id}/{doc_id}.{ext}"

    # Upload via service-role client
    _sb.storage.from_(BUCKET).upload(path, content, {"content-type": file.content_type})

    # Log the upload
    _log_access(user.id, kandidaat_id, "UPLOAD_ID_SCAN", request)

    # Generate short-lived signed URL
    signed = _sb.storage.from_(BUCKET).create_signed_url(path, SIGNED_URL_EXPIRY)

    return {
        "path": f"verification:{path}",
        "signed_url": signed.get("signedURL") or signed.get("signedUrl"),
        "expires_in": SIGNED_URL_EXPIRY,
    }


@router.get("/verification/{kandidaat_id}/url")
async def get_verification_url(
    kandidaat_id: str,
    path: str,
    request: Request,
    user: CurrentUser = Depends(require_roles("admin", "intaker")),
):
    """Generate a short-lived signed URL for a verification document."""
    clean_path = path.removeprefix("verification:")

    signed = _sb.storage.from_(BUCKET).create_signed_url(clean_path, SIGNED_URL_EXPIRY)

    _log_access(user.id, kandidaat_id, "DOWNLOAD_ID_SCAN", request)

    return {
        "signed_url": signed.get("signedURL") or signed.get("signedUrl"),
        "expires_in": SIGNED_URL_EXPIRY,
    }


@router.delete("/verification/{kandidaat_id}")
async def delete_verification_file(
    kandidaat_id: str,
    path: str,
    request: Request,
    user: CurrentUser = Depends(require_roles("admin")),
):
    """Delete a verification document. Admin only."""
    clean_path = path.removeprefix("verification:")

    _sb.storage.from_(BUCKET).remove([clean_path])

    _log_access(user.id, kandidaat_id, "DELETE_ID_SCAN", request)

    return {"ok": True}
