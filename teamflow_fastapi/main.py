from fastapi import FastAPI

from .api import router as api_router

app = FastAPI(title="TeamFlow AI", version="0.1.0")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


app.include_router(api_router)
