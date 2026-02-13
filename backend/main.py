from fastapi import FastAPI
from dotenv import load_dotenv
from routers import spotify


from routers import health, auth

load_dotenv()

app = FastAPI(title="Tuniverse API")
@app.get("/")
def root():
    return {"message": "ts running"}


app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(spotify.router, prefix="/api/v1")
