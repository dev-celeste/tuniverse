from fastapi import FastAPI
from dotenv import load_dotenv

from routers import health, auth

load_dotenv()

app = FastAPI(title="Tuniverse API")

app.include_router(health.router)
app.include_router(auth.router)