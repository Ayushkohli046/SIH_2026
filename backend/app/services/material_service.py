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
        "category": "structural",
    },
    "concrete": {
        "name": "Dense concrete", "conductivity": 1.7, "density": 2300,
        "specific_heat": 880, "source": "CIBSE Guide A, typical concrete values",
        "category": "structural",
    },
    "aac_block": {
        "name": "Autoclaved aerated concrete block", "conductivity": 0.16, "density": 600,
        "specific_heat": 1000, "source": "EN 1745 tabulated design values",
        "category": "structural",
    },
    "eps": {
        "name": "Expanded polystyrene insulation", "conductivity": 0.036, "density": 20,
        "specific_heat": 1450, "source": "EN 13163 declared-property range; verify product datasheet",
        "category": "insulation",
    },
    "mineral_wool": {
        "name": "Mineral wool insulation", "conductivity": 0.037, "density": 40,
        "specific_heat": 840, "source": "EN 13162 declared-property range; verify product datasheet",
        "category": "insulation",
    },
    "aerogel": {
        "name": "Nanoporous aerogel insulation blanket", "conductivity": 0.015, "density": 150,
        "specific_heat": 1000, "source": "DRDO Extreme Cold Habitat Standard",
        "category": "insulation",
    },
    "pu_sandwich": {
        "name": "Polyurethane Foam (PUF) SIP composite", "conductivity": 0.022, "density": 45,
        "specific_heat": 1400, "source": "Military Modular Shelter Specification",
        "category": "structural",
    },
}


def list_materials() -> list[dict]:
    return [{"id": key, **deepcopy(value)} for key, value in MATERIALS.items()]


def make_layer(material_id: str, thickness: float, *, absorptivity: float = 0.6) -> MaterialLayer:
    try:
        material = MATERIALS[material_id]
    except KeyError as exc:
        raise ValueError(f"Unknown material id: {material_id!r}. Valid ids: {list(MATERIALS)}") from exc
    return MaterialLayer(
        name=material["name"], thermal_conductivity=material["conductivity"],
        density=material["density"], specific_heat=material["specific_heat"],
        thickness=thickness, solar_absorptivity=absorptivity,
    )


def make_custom_layer(spec: "CustomMaterialSpec") -> MaterialLayer:  # type: ignore[name-defined]
    """
    Create a MaterialLayer from a user-supplied CustomMaterialSpec.

    Allows DRDO engineers to simulate proprietary or experimental materials
    without modifying the catalogue.
    """
    return MaterialLayer(
        name=spec.name,
        thermal_conductivity=spec.conductivity,
        density=spec.density,
        specific_heat=spec.specific_heat,
        thickness=spec.thickness,
        solar_absorptivity=spec.solar_absorptivity,
    )
