from fastapi import FastAPI
from dotenv import load_dotenv
from routers import spotify
from fastapi.middleware.cors import CORSMiddleware


from routers import health, auth

load_dotenv()

app = FastAPI(title="Tuniverse API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "ts running"}

@app.get("/api/v1")
def api_root():
    return {"message": "API v1 is liveee"}

@app.get("/api/v1/health")
def health_check():
    return {"status": "ok"}

app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(spotify.router, prefix="/api/v1")
