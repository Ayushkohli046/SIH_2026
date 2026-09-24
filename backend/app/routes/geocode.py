"""
City and Military Post Geocoding Service.

Combines a rich curated catalogue of Indian Armed Forces Strategic Posts, LAC Forward Outposts,
and High-Altitude Bases with Open-Meteo Global Geocoding.
"""

from __future__ import annotations

import json
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import APIRouter, HTTPException, Query

router = APIRouter(tags=["geocode"])

# Curated Indian Military & Strategic Outposts Database
MILITARY_POSTS = [
    # Northern Glacial / Siachen & Karakoram
    {"name": "Siachen Base Camp", "display": "Siachen Base Camp (102 Brigade // Nubra Valley)", "sector": "Northern Glacial", "country": "IN", "country_name": "India", "latitude": 35.20, "longitude": 77.15, "elevation": 3650.0},
    {"name": "Kumar Post", "display": "Kumar Post / Saltoro Ridge (Siachen Glacier)", "sector": "Northern Glacial", "country": "IN", "country_name": "India", "latitude": 35.35, "longitude": 77.10, "elevation": 4880.0},
    {"name": "Bana Top", "display": "Bana Top / Point 21153 (Siachen Ridge)", "sector": "Northern Glacial", "country": "IN", "country_name": "India", "latitude": 35.45, "longitude": 77.05, "elevation": 6700.0},
    {"name": "Indira Col", "display": "Indira Col Post (Northernmost Territory)", "sector": "Northern Glacial", "country": "IN", "country_name": "India", "latitude": 35.67, "longitude": 76.83, "elevation": 5764.0},
    {"name": "Daulat Beg Oldie", "display": "Daulat Beg Oldie (DBO) Airfield / Sub-Sector North", "sector": "Northern Glacial", "country": "IN", "country_name": "India", "latitude": 35.42, "longitude": 77.92, "elevation": 5065.0},
    {"name": "Galwan Valley Post", "display": "Galwan Valley Post (Sub-Sector North // LAC)", "sector": "Eastern Ladakh", "country": "IN", "country_name": "India", "latitude": 34.75, "longitude": 78.20, "elevation": 4200.0},
    {"name": "Rezang La Post", "display": "Rezang La Post (13 Kumaon Memorial // Chushul)", "sector": "Eastern Ladakh", "country": "IN", "country_name": "India", "latitude": 33.43, "longitude": 78.85, "elevation": 4876.0},
    {"name": "Chushul Outpost", "display": "Chushul Border Post & Airfield (Eastern Ladakh)", "sector": "Eastern Ladakh", "country": "IN", "country_name": "India", "latitude": 33.58, "longitude": 78.65, "elevation": 4350.0},
    {"name": "Nyoma Airbase", "display": "Nyoma Advance Landing Ground (Indus Valley // LAC)", "sector": "Eastern Ladakh", "country": "IN", "country_name": "India", "latitude": 33.20, "longitude": 78.66, "elevation": 4180.0},
    {"name": "Pangong Tso Outpost", "display": "Pangong Tso Forward Post / Finger 4 (Eastern Ladakh)", "sector": "Eastern Ladakh", "country": "IN", "country_name": "India", "latitude": 33.75, "longitude": 78.70, "elevation": 4225.0},
    {"name": "Dras Outpost", "display": "Dras Base (Second Coldest Inhabited Place // Kargil)", "sector": "Kargil Sector", "country": "IN", "country_name": "India", "latitude": 34.43, "longitude": 75.76, "elevation": 3280.0},
    {"name": "Tiger Hill Post", "display": "Tiger Hill / Point 5060 (Dras // Kargil Sector)", "sector": "Kargil Sector", "country": "IN", "country_name": "India", "latitude": 34.48, "longitude": 75.80, "elevation": 5060.0},
    {"name": "Point 4875 Batra Top", "display": "Point 4875 / Batra Top (13 JAK RIF Memorial // Dras)", "sector": "Kargil Sector", "country": "IN", "country_name": "India", "latitude": 34.46, "longitude": 75.82, "elevation": 4875.0},
    {"name": "Tololing Ridge", "display": "Tololing Ridge (2 Rajputana Rifles // Dras Sector)", "sector": "Kargil Sector", "country": "IN", "country_name": "India", "latitude": 34.44, "longitude": 75.78, "elevation": 4590.0},
    {"name": "Kargil Forward Sector", "display": "Kargil Forward Outpost (Suru Valley // Ladakh)", "sector": "Kargil Sector", "country": "IN", "country_name": "India", "latitude": 34.55, "longitude": 76.13, "elevation": 2676.0},
    {"name": "Leh Military Station", "display": "Leh Military Station (14 Corps Fire & Fury HQ)", "sector": "Ladakh Main", "country": "IN", "country_name": "India", "latitude": 34.15, "longitude": 77.58, "elevation": 3520.0},
    {"name": "Kaza Spiti Outpost", "display": "Kaza / Spiti Valley Cold Desert Outpost (Himachal)", "sector": "Himalayan High Pass", "country": "IN", "country_name": "India", "latitude": 32.22, "longitude": 78.07, "elevation": 3800.0},

    # Eastern Command / LAC & Arunachal Passes
    {"name": "Bum La Pass", "display": "Bum La Pass Post (Tawang LAC Sector // 4 Corps)", "sector": "Eastern LAC", "country": "IN", "country_name": "India", "latitude": 27.72, "longitude": 91.88, "elevation": 4633.0},
    {"name": "Sela Pass Tunnel", "display": "Sela Pass & Tunnel Post (Tawang // Arunachal)", "sector": "Eastern LAC", "country": "IN", "country_name": "India", "latitude": 27.50, "longitude": 92.10, "elevation": 4170.0},
    {"name": "Tawang Outpost", "display": "Tawang Forward Outpost (Spear Corps // Arunachal)", "sector": "Eastern LAC", "country": "IN", "country_name": "India", "latitude": 27.58, "longitude": 91.86, "elevation": 3048.0},
    {"name": "Kibithu Post", "display": "Kibithu LAC Post (Easternmost Indian Post // Lohit Valley)", "sector": "Eastern LAC", "country": "IN", "country_name": "India", "latitude": 28.24, "longitude": 97.01, "elevation": 1305.0},
    {"name": "Walong Sector", "display": "Walong Forward Bastion (64 Mountain Brigade // Lohit)", "sector": "Eastern LAC", "country": "IN", "country_name": "India", "latitude": 28.13, "longitude": 97.00, "elevation": 1094.0},
    {"name": "Nathu La Pass", "display": "Nathu La Pass Post (Black Cat Division // Sikkim)", "sector": "Sikkim LAC", "country": "IN", "country_name": "India", "latitude": 27.38, "longitude": 88.83, "elevation": 4310.0},
    {"name": "Doklam Plateau", "display": "Doklam Plateau Outpost (Sikkim Tri-junction)", "sector": "Sikkim LAC", "country": "IN", "country_name": "India", "latitude": 27.28, "longitude": 88.98, "elevation": 4100.0},
    {"name": "Bomdila Base", "display": "Bomdila Pass Post (West Kameng // Arunachal)", "sector": "Eastern LAC", "country": "IN", "country_name": "India", "latitude": 27.26, "longitude": 92.42, "elevation": 2415.0},

    # Western Command / Desert & Border Outposts
    {"name": "Longewala Outpost", "display": "Longewala Border Post (23 Punjab // Thar Desert)", "sector": "Thar Desert", "country": "IN", "country_name": "India", "latitude": 27.52, "longitude": 70.15, "elevation": 180.0},
    {"name": "Tanot Mata Post", "display": "Tanot Border Outpost (12 Corps // Jaisalmer)", "sector": "Thar Desert", "country": "IN", "country_name": "India", "latitude": 27.80, "longitude": 70.35, "elevation": 170.0},
    {"name": "Munabao Post", "display": "Munabao Forward Border Outpost (Barmer Sector)", "sector": "Thar Desert", "country": "IN", "country_name": "India", "latitude": 25.71, "longitude": 70.25, "elevation": 160.0},
    {"name": "Bikaner Mahajan", "display": "Mahajan Field Firing Range / Outpost (Bikaner)", "sector": "Thar Desert", "country": "IN", "country_name": "India", "latitude": 28.02, "longitude": 73.31, "elevation": 242.0},
    {"name": "Khavda Outpost", "display": "Khavda Border Post (Rann of Kutch Sector)", "sector": "Rann of Kutch", "country": "IN", "country_name": "India", "latitude": 23.85, "longitude": 69.75, "elevation": 20.0},
    {"name": "Sir Creek Post", "display": "Sir Creek Border Outpost (Creek Crocodile Commandos)", "sector": "Rann of Kutch", "country": "IN", "country_name": "India", "latitude": 23.63, "longitude": 68.17, "elevation": 5.0},

    # Central, Valleys & Headquarters
    {"name": "Shimla Ridge", "display": "Shimla (ARTRAC Army Training Command HQ)", "sector": "Himalayan Ridge", "country": "IN", "country_name": "India", "latitude": 31.10, "longitude": 77.17, "elevation": 2276.0},
    {"name": "Srinagar Cantt", "display": "Srinagar Badami Bagh Cantt (15 Corps Chinar HQ)", "sector": "Kashmir Valley", "country": "IN", "country_name": "India", "latitude": 34.08, "longitude": 74.79, "elevation": 1585.0},
    {"name": "Manali Base", "display": "Manali High Altitude Base & SASE Station", "sector": "Himalayan Ridge", "country": "IN", "country_name": "India", "latitude": 32.24, "longitude": 77.18, "elevation": 2050.0},
    {"name": "New Delhi HQ", "display": "New Delhi Integrated Defence Staff (Sena Bhawan)", "sector": "Central Command", "country": "IN", "country_name": "India", "latitude": 28.61, "longitude": 77.20, "elevation": 216.0},
]


@router.get("/geocode")
def geocode(
    q: str = Query(..., min_length=1, max_length=100, description="City or Military Post name"),
    count: int = Query(default=10, ge=1, le=25),
):
    """
    Search for military bases, defence outposts, or global cities by name.
    Matches curated Indian Army outposts first, then queries Open-Meteo Global Geocoding API.
    """
    query_clean = q.strip().lower()
    results = []

    # 1. Search Curated Indian Military Outpost database
    for post in MILITARY_POSTS:
        score = 0
        name_lower = post["name"].lower()
        disp_lower = post["display"].lower()
        sec_lower = post["sector"].lower()

        if query_clean in name_lower or query_clean in disp_lower or query_clean in sec_lower:
            score += 20
        if any(word in name_lower or word in disp_lower for word in query_clean.split()):
            score += 10

        if score > 0:
            results.append({
                "name": post["name"],
                "admin1": post["sector"],
                "country": post["country"],
                "country_name": post["country_name"],
                "latitude": post["latitude"],
                "longitude": post["longitude"],
                "elevation": post["elevation"],
                "timezone": "Asia/Kolkata",
                "display": f"🇮🇳 {post['display']} · {int(post['elevation'])}m",
                "is_military": True,
            })

    # 2. Query Open-Meteo Global Geocoding for civilian / global locations
    query_params = urlencode({"name": q, "count": count, "language": "en", "format": "json"})
    url = f"https://geocoding-api.open-meteo.com/v1/search?{query_params}"
    req = Request(url, headers={"User-Agent": "DRDO-SPSD-Thermal-Engine/1.0"})

    try:
        with urlopen(req, timeout=4) as response:
            payload = json.load(response)
            raw = payload.get("results") or []
            for r in raw:
                name = r.get("name", "")
                admin1 = r.get("admin1", "")
                country = r.get("country", "")
                parts = [p for p in [name, admin1, country] if p]
                display = ", ".join(parts)
                elev = r.get("elevation", 0)
                if elev:
                    display += f" · {int(elev)}m"

                # Avoid duplicate coordinates
                if not any(abs(res["latitude"] - r.get("latitude", 0)) < 0.05 and abs(res["longitude"] - r.get("longitude", 0)) < 0.05 for res in results):
                    results.append({
                        "name": name,
                        "admin1": admin1,
                        "country": r.get("country_code", ""),
                        "country_name": country,
                        "latitude": r.get("latitude"),
                        "longitude": r.get("longitude"),
                        "elevation": elev,
                        "timezone": r.get("timezone", ""),
                        "display": f"📍 {display}",
                        "is_military": False,
                    })
    except (URLError, TimeoutError, json.JSONDecodeError):
        pass  # Fallback to curated military posts

    return {"query": q, "count": len(results[:count]), "results": results[:count]}
