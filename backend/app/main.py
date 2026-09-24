"""FastAPI entry point for Smart Passive Shelter Designer."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import area_design, climate, geocode, material_sweep, materials, optimization, simulation

app = FastAPI(title="Smart Passive Shelter Designer API", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(area_design.router)
app.include_router(climate.router)
app.include_router(geocode.router)
app.include_router(materials.router)
app.include_router(material_sweep.router)
app.include_router(simulation.router)
app.include_router(optimization.router)


@app.get("/health", tags=["system"])
def health():
    return {"status": "ok", "service": "smart-passive-shelter-api", "version": "0.2.0"}
