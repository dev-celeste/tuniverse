from fastapi import FastAPI
from routers import health

app = FastAPI(title="My Music Universe API")


app.include_router(health.router)