# API contract — MVP

The backend serves `http://localhost:8000`. Temperatures are °C, dimensions
are m, areas are m², energy is kWh and thermal loads are W unless a field name
states otherwise.

- `GET /health` reports service availability.
- `GET /materials` returns material identifiers accepted in a simulation.
- `GET /climate?latitude=34.15&longitude=77.58&hours=24` proxies the upcoming
  hourly Open-Meteo forecast. A climate-service failure is returned as `503`.
- `POST /simulate` accepts the shared request shape from the development guide
  and returns a 24-hour physics-engine result.
- `POST /optimize` evaluates insulation thickness and cardinal orientations,
  minimizing 24-hour external conditioning energy.

`/simulate` request example:

```json
{
  "location": { "latitude": 34.15, "longitude": 77.58 },
  "shelter": { "length": 10, "width": 8, "height": 3, "orientation": 180, "occupants": 4, "ach": 1 },
  "materials": { "wall": "burnt_brick", "roof": "concrete", "floor": "concrete", "insulation": "eps" },
  "insulation_thickness": 0.1,
  "openings": { "window_area": 5, "door_area": 2 }
}
```

The `hourly` response fields are aligned arrays; index `i` represents the same
simulation hour in every array. The reported indoor temperature is free-running
(passive); heating/cooling demand estimates the energy needed to restore the
configured comfort range after each hour.
