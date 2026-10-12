import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from routers import spotify, health, auth
from fastapi.middleware.cors import CORSMiddleware
from core.config import cors_origins
from core.exceptions import NotAuthenticatedError, SpotifyAPIError, SpotifyAuthError, SpotifyConfigError



load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

app = FastAPI(title="Tuniverse API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Services raise domain errors; this is the one place they become HTTP responses
@app.exception_handler(NotAuthenticatedError)
def handle_not_authenticated(request: Request, exc: NotAuthenticatedError):
    return JSONResponse(status_code=401, content={"detail": str(exc)})


@app.exception_handler(SpotifyAuthError)
def handle_spotify_auth_error(request: Request, exc: SpotifyAuthError):
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.exception_handler(SpotifyConfigError)
def handle_spotify_config_error(request: Request, exc: SpotifyConfigError):
    return JSONResponse(status_code=500, content={"detail": str(exc)})


@app.exception_handler(SpotifyAPIError)
def handle_spotify_api_error(request: Request, exc: SpotifyAPIError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.get("/")
def root():
    return {"message": "ts running"}

@app.get("/api/v1")
def api_root():
    return {"message": "API v1 is liveee"}


app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(spotify.router, prefix="/api/v1")
