"""Curated MVP material catalogue.

Values are initial engineering inputs, not product certifications.  Each entry
keeps its source note visible to callers so it can be replaced by project- or
manufacturer-specific data before final design use.
"""

from copy import deepcopy

from app.thermal.models import MaterialLayer


MATERIALS = {
    "burnt_brick": {
        "name": "Common burnt clay brick", "conductivity": 0.72, "density": 1700,
        "specific_heat": 840, "source": "CIBSE Guide A, typical masonry values",
    },
    "concrete": {
        "name": "Dense concrete", "conductivity": 1.7, "density": 2300,
        "specific_heat": 880, "source": "CIBSE Guide A, typical concrete values",
    },
    "aac_block": {
        "name": "Autoclaved aerated concrete block", "conductivity": 0.16, "density": 600,
        "specific_heat": 1000, "source": "EN 1745 tabulated design values",
    },
    "eps": {
        "name": "Expanded polystyrene insulation", "conductivity": 0.036, "density": 20,
        "specific_heat": 1450, "source": "EN 13163 declared-property range; verify product datasheet",
    },
    "mineral_wool": {
        "name": "Mineral wool insulation", "conductivity": 0.037, "density": 40,
        "specific_heat": 840, "source": "EN 13162 declared-property range; verify product datasheet",
    },
}


def list_materials() -> list[dict]:
    return [{"id": key, **deepcopy(value)} for key, value in MATERIALS.items()]


def make_layer(material_id: str, thickness: float, *, absorptivity: float = 0.6) -> MaterialLayer:
    try:
        material = MATERIALS[material_id]
    except KeyError as exc:
        raise ValueError(f"Unknown material id: {material_id}") from exc
    return MaterialLayer(
        name=material["name"], thermal_conductivity=material["conductivity"],
        density=material["density"], specific_heat=material["specific_heat"],
        thickness=thickness, solar_absorptivity=absorptivity,
    )
