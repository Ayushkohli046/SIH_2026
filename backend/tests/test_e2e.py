"""
End-to-End Integration Tests for Smart Passive Shelter Designer.
Maintained by Person 4 (Optimization, Integration & E2E Testing).
"""

import requests

BASE_URL = "http://localhost:8000"

def run_all_tests():
    print("=" * 60)
    print("STARTING SIH 2026 DRDO END-TO-END INTEGRATION TEST")
    print("=" * 60)

    # 1. Health check
    print("\n[1/5] Testing GET /health...")
    r = requests.get(f"{BASE_URL}/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    print(f"  --> PASS: {r.json()}")

    # 2. Materials catalog check
    print("\n[2/5] Testing GET /materials...")
    r = requests.get(f"{BASE_URL}/materials")
    assert r.status_code == 200, f"Materials check failed: {r.text}"
    materials_list = r.json().get("materials", [])
    assert len(materials_list) > 0, "No materials returned"
    material_names = [m["name"] for m in materials_list]
    print(f"  --> PASS: Retrieved {len(materials_list)} materials: {material_names}")

    # 3. Climate forecast check (Leh, Ladakh: 34.15 N, 77.58 E)
    print("\n[3/5] Testing GET /climate (Leh, Ladakh)...")
    r = requests.get(f"{BASE_URL}/climate?latitude=34.15&longitude=77.58&hours=24")
    assert r.status_code == 200, f"Climate check failed: {r.text}"
    climate_data = r.json()
    assert "outdoor_temperature" in climate_data, "No outdoor_temperature in climate data"
    print(f"  --> PASS: Climate fetched for {len(climate_data['outdoor_temperature'])} hours.")

    # 4. Simulation check (Person 3's Physics Engine)
    print("\n[4/5] Testing POST /simulate...")
    shelter_payload = {
        "location": {"latitude": 34.15, "longitude": 77.58},
        "shelter": {
            "length": 10.0,
            "width": 8.0,
            "height": 3.0,
            "orientation": 180,
            "occupants": 4,
            "ach": 1.0
        },
        "materials": {
            "wall": "burnt_brick",
            "roof": "concrete",
            "floor": "concrete",
            "insulation": "eps"
        },
        "insulation_thickness": 0.05,
        "openings": {
            "window_area": 5.0,
            "door_area": 2.0
        }
    }

    r = requests.post(f"{BASE_URL}/simulate", json=shelter_payload)
    assert r.status_code == 200, f"Simulation failed: {r.text}"
    sim_res = r.json()["simulation"]
    summary = sim_res["summary"]
    print(f"  --> PASS: Physics simulation complete.")
    print(f"      Heating Req: {summary['heating_requirement_kwh']} kWh")
    print(f"      Cooling Req: {summary['cooling_requirement_kwh']} kWh")
    print(f"      Passive Comfort Hours: {summary['passive_comfort_hours']} / {summary['total_hours']}")

    # 5. Optimization & Design Comparison check (Person 4's Module)
    print("\n[5/5] Testing POST /optimize...")
    optimization_payload = dict(shelter_payload)
    optimization_payload["insulation_options"] = [0.05, 0.10, 0.15]
    optimization_payload["orientations"] = [0, 90, 180, 270]

    r = requests.post(f"{BASE_URL}/optimize", json=optimization_payload)
    assert r.status_code == 200, f"Optimization failed: {r.text}"
    opt_res = r.json()
    comparison = opt_res["comparison"]
    recommended = opt_res["recommended_design"]

    print(f"  --> PASS: Optimization completed successfully!")
    print(f"      Baseline Total Energy: {comparison['baseline_total_kwh']} kWh")
    print(f"      Recommended Design Total Energy: {comparison['recommended_total_kwh']} kWh")
    print(f"      Recommended Insulation: {recommended['insulation_thickness_m']} m")
    print(f"      Recommended Orientation: {recommended['orientation_degrees']} deg")
    print(f"      Passive Energy Saved: {comparison['energy_saved_percentage']}%")

    print("\n" + "=" * 60)
    print("ALL 5 END-TO-END PIPELINE CHECKS PASSED PERFECTLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_all_tests()
