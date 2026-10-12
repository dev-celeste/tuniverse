from fastapi import APIRouter
from fastapi.responses import RedirectResponse

from core.token_store import TokenSet, token_store
from services import spotify_auth

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/login")
def spotify_login():
    return RedirectResponse(spotify_auth.build_authorize_url())


@router.get("/callback")
def spotify_callback(code: str):
    token_data = spotify_auth.exchange_code_for_tokens(code)

    # ✅ Store tokens
    token_store.save(TokenSet.from_spotify(token_data))

    return {
        "access_token_received": "access_token" in token_data,
        "refresh_token_received": "refresh_token" in token_data,
        "token_type": token_data.get("token_type"),
        "expires_in": token_data.get("expires_in"),
        "scopes": token_data.get("scope"),
    }
