"""Open-Meteo forecast adapter using only Python's standard library."""

from __future__ import annotations

import json
import time
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import numpy as np

from app.thermal.models import ClimateHourlyData

HOURLY_FIELDS = (
    "temperature_2m,relative_humidity_2m,dew_point_2m,"
    "surface_pressure,cloud_cover,wind_speed_10m,wind_direction_10m,"
    "shortwave_radiation,direct_normal_irradiance,diffuse_radiation"
)


def fetch_forecast(latitude: float, longitude: float, hours: int = 24) -> ClimateHourlyData:
    """Fetch the next hourly forecast from Open-Meteo and normalize units."""
    query = urlencode({"latitude": latitude, "longitude": longitude, "hourly": HOURLY_FIELDS,
                       "forecast_days": max(1, min(7, (hours + 23) // 24)), "timezone": "GMT"})
    url = f"https://api.open-meteo.com/v1/forecast?{query}"
    req = Request(url, headers={"User-Agent": "DRDO-SPSD-Thermal-Engine/1.0"})
    last_exc = None
    payload = None
    for attempt in range(3):
        try:
            with urlopen(req, timeout=15) as response:
                payload = json.load(response)
                break
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_exc = exc
            time.sleep(0.8)
    if payload is None:
        raise RuntimeError("Open-Meteo climate data could not be retrieved") from last_exc

    hourly = payload.get("hourly", {})
    def values(field: str) -> np.ndarray:
        series = hourly.get(field)
        if not isinstance(series, list) or len(series) < hours:
            raise RuntimeError(f"Open-Meteo response is missing usable {field} data")
        return np.asarray(series[:hours], dtype=float)

    return ClimateHourlyData(
        outdoor_temperature=values("temperature_2m"), ghi=values("shortwave_radiation"),
        dni=values("direct_normal_irradiance"), dhi=values("diffuse_radiation"),
        wind_speed=values("wind_speed_10m"), wind_direction=values("wind_direction_10m"),
        relative_humidity=values("relative_humidity_2m"), cloud_cover=values("cloud_cover"),
        surface_pressure=values("surface_pressure"), dew_point=values("dew_point_2m"),
        latitude=latitude, longitude=longitude,
    )


def climate_payload(climate: ClimateHourlyData) -> dict:
    return {"latitude": climate.latitude, "longitude": climate.longitude,
            "hours": climate.n_hours, "outdoor_temperature": climate.outdoor_temperature.tolist(),
            "ghi": climate.ghi.tolist(), "dni": climate.dni.tolist(), "dhi": climate.dhi.tolist(),
            "wind_speed": climate.wind_speed.tolist()}
