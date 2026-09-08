"""FastAPI entry point for Smart Passive Shelter Designer."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import climate, materials, optimization, simulation

app = FastAPI(title="Smart Passive Shelter Designer API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
app.include_router(climate.router)
app.include_router(materials.router)
app.include_router(simulation.router)
app.include_router(optimization.router)


@app.get("/health", tags=["system"])
def health():
    return {"status": "ok", "service": "smart-passive-shelter-api"}
