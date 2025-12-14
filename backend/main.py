from fastapi import FastAPI
from dotenv import load_dotenv

from routers import health

load_dotenv()

app = FastAPI(title="My Music Universe API")

app.include_router(health.router)