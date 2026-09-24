"""
End-to-End Integration Tests for Smart Passive Shelter Designer.
Tests all endpoints using Python standard library (urllib).
"""

import json
import unittest
import urllib.request
import urllib.error

BASE_URL = "http://localhost:8000"


class TestSPSDBackend(unittest.TestCase):

    def get_json(self, path):
        req = urllib.request.Request(f"{BASE_URL}{path}", headers={"User-Agent": "DRDO-Test/1.0"})
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))

    def post_json(self, path, payload):
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            f"{BASE_URL}{path}",
            data=data,
            headers={"Content-Type": "application/json", "User-Agent": "DRDO-Test/1.0"},
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            return json.loads(response.read().decode("utf-8"))

    def test_01_health(self):
        data = self.get_json("/health")
        self.assertEqual(data.get("status"), "ok")

    def test_02_materials(self):
        data = self.get_json("/materials")
        self.assertIn("materials", data)
        self.assertGreater(len(data["materials"]), 0)

    def test_03_climate(self):
        data = self.get_json("/climate?latitude=34.15&longitude=77.58&hours=24")
        self.assertIn("outdoor_temperature", data)
        self.assertEqual(len(data["outdoor_temperature"]), 24)

    def test_04_area_design(self):
        payload = {
            "latitude": 34.15,
            "longitude": 77.58,
            "elevation": 3520.0,
            "occupants": 8,
            "hours": 24,
        }
        data = self.post_json("/area-design", payload)
        self.assertIn("classification", data)
        self.assertIn("recommended_design", data)
        self.assertIn("performance_comparison", data)
        self.assertGreater(data["performance_comparison"]["energy_reduction_percent"], 0)

    def test_05_simulation(self):
        payload = {
            "location": {"latitude": 34.15, "longitude": 77.58},
            "shelter": {"length": 10.0, "width": 8.0, "height": 3.0, "orientation": 180, "occupants": 8, "ach": 0.6},
            "materials": {"wall": "burnt_brick", "roof": "concrete", "floor": "concrete", "insulation": "eps"},
            "insulation_thickness": 0.08,
            "openings": {"window_area": 5.0, "door_area": 2.0},
            "hours": 24,
        }
        data = self.post_json("/simulate", payload)
        sim = data.get("simulation", data)
        self.assertIn("summary", sim)
        self.assertIn("hourly", sim)
        self.assertIn("physics", sim)


if __name__ == "__main__":
    unittest.main()
