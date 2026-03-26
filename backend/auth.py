"""JWT authentication & role-based authorization middleware."""
from __future__ import annotations

from typing import Any

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt
from supabase import create_client

from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET

# Service-role client — NEVER expose to frontend
_sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


class CurrentUser:
    """Authenticated user with roles."""

    def __init__(self, user_id: str, roles: list[str]) -> None:
        self.id = user_id
        self.roles = roles

    def has_role(self, role: str) -> bool:
        return role in self.roles

    def has_any_role(self, *roles: str) -> bool:
        return any(r in self.roles for r in roles)


async def get_current_user(
    authorization: str = Header(..., description="Bearer <supabase-jwt>"),
) -> CurrentUser:
    """Validate Supabase JWT and return user with roles."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing Bearer token")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except JWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Invalid token: {exc}")

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token missing sub claim")

    # Fetch roles from database using service-role client (bypasses RLS)
    resp = _sb.table("cs_user_roles").select("role").eq("user_id", user_id).execute()
    roles = [row["role"] for row in (resp.data or [])]

    return CurrentUser(user_id, roles)


def require_roles(*allowed_roles: str):
    """Dependency that checks the user has at least one of the allowed roles."""

    async def _check(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not user.has_any_role(*allowed_roles):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Requires one of: {', '.join(allowed_roles)}",
            )
        return user

    return _check
