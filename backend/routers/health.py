from fastapi import APIRouter
from fastapi.responses import JSONResponse

from core.sessions import get_session_store

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check():
    """
    Also checks the session store: if Redis is unreachable nobody can log in, so the host's
    health check should see the service as down.
    """
    if not get_session_store().ping():
        return JSONResponse(status_code=503, content={"status": "error", "sessions": "unreachable"})
    return {"status": "ok"}
