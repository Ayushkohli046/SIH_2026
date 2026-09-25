<div align="center">

<img src="https://img.shields.io/badge/-%20-FF9933?style=flat" width="33%" height="6"><img src="https://img.shields.io/badge/-%20-FFFFFF?style=flat" width="34%" height="6"><img src="https://img.shields.io/badge/-%20-138808?style=flat" width="33%" height="6">

# 🏔️ Smart Passive Shelter

### Climate-Responsive Shelter Design & Thermal Simulation for India's Extreme Frontiers

<br>

[![SIH 2026](https://img.shields.io/badge/🇮🇳_Smart_India_Hackathon-2026-FF9933?style=for-the-badge)](https://github.com/Ayushkohli046/SIH_2026)
[![Problem Domain](https://img.shields.io/badge/Domain-Defence_%26_Border_Infrastructure-138808?style=for-the-badge)](#-about-the-project)
[![Status](https://img.shields.io/badge/Status-In_Development-blue?style=for-the-badge)](#-project-status)

**[📂 View Repository](https://github.com/Ayushkohli046/SIH_2026)** &nbsp;•&nbsp; **[⚙️ Quick Start](#-quick-start)** &nbsp;•&nbsp; **[📡 API Contract](docs/api-contract.md)** &nbsp;•&nbsp; **[👥 Team](#-team)**

<img src="https://img.shields.io/badge/-%20-FF9933?style=flat" width="33%" height="6"><img src="https://img.shields.io/badge/-%20-FFFFFF?style=flat" width="34%" height="6"><img src="https://img.shields.io/badge/-%20-138808?style=flat" width="33%" height="6">

</div>

<br>

## 🎯 Problem Statement

Personnel stationed at India's most hostile frontiers — the **sub-zero glaciers of Siachen**, the **high-altitude cold desert of Ladakh**, and the **scorching Thar Desert** — depend heavily on power-intensive active heating and cooling to survive. Fuel and power logistics to these forward posts are costly, risky, and often unreliable.

**Smart Passive Shelter** is a decision-support platform that designs and validates **passive thermal shelters** — structures that use architecture and material science, not machinery, to stay livable in extreme climates. It models proven passive strategies (Trombe walls, arctic pods, badgir wind-catchers, qanat cooling) and runs a physics-based thermal simulation to predict real-world performance before a single structure is built.

<br>

## ✨ Key Features

<table>
<tr>
<td width="50%">

**🗺️ Strategic Location Database**
Real preset outposts across Siachen, Ladakh, Thar and Eastern Command sectors with accurate coordinates, elevation and terrain data.

**🌡️ Physics-Based Thermal Engine**
Custom simulation modelling conduction, ventilation, solar gain and internal heat loads.

**🧱 Material & Archetype Sweep**
Compare wall, roof and insulation materials against multiple shelter archetypes side by side.

**🎯 Design Optimization**
Auto-tunes insulation thickness and orientation to minimize conditioning energy demand.

</td>
<td width="50%">

**🧊 Interactive 3D Viewer**
Three.js-powered shelter visualization for design review before construction.

**📊 Thermal Performance Charts**
Hour-by-hour indoor temperature and comfort-band visualizations.

**🌍 Live Climate Integration**
Pulls real hourly forecast data (Open-Meteo) for the selected coordinates.

**📄 Mission Report Export**
One-click exportable design & performance report for field decision-makers.

</td>
</tr>
</table>

<br>

## 🏕️ Shelter Archetypes by Theatre

| Theatre | Climate Challenge | Archetypes |
|:---|:---|:---|
| ❄️ **Siachen Glacier** | Sub-zero, permafrost, katabatic winds | Arctic Pod · Quonset Vault · AeroRidge |
| 🏔️ **Ladakh** | High-altitude cold desert, extreme diurnal swing | Trombe Wall · Solarium Sunspace · Fortress |
| 🏜️ **Thar Desert** | Extreme daytime heat (50°C+) | Badgir Wind-Catcher · Qanat Cooling · Canopy Shade |

<br>

## 🧰 Tech Stack

<div align="center">

![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![NumPy](https://img.shields.io/badge/NumPy-013243?style=for-the-badge&logo=numpy&logoColor=white)

</div>

```
┌────────────────────────┐        HTTP         ┌──────────────────────────┐
│   Frontend              │ ───────────────────▶│   Backend (FastAPI)      │
│   React + Three.js      │◀─────────────────── │   Thermal Simulation     │
│   3D Viewer · Charts    │                      │   Climate & Material Svc │
└────────────────────────┘                      └──────────────────────────┘
```

<br>

## ⚙️ Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+

### 1️⃣ Clone the repository
```bash
git clone https://github.com/Ayushkohli046/SIH_2026.git
cd SIH_2026
```

### 2️⃣ Run the backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Verify it's running at `http://localhost:8000/health`

### 3️⃣ Run the frontend
```bash
cd frontend
npm install
npm run dev
```
App will be live at `http://localhost:5173`

<br>

## 📡 API Overview

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/health` | Service health check |
| `GET` | `/materials` | List available material identifiers |
| `GET` | `/climate` | Hourly climate forecast for a lat/lon |
| `POST` | `/simulate` | Run a 24-hour passive thermal simulation |
| `POST` | `/optimize` | Optimize insulation & orientation for minimum energy |

📖 Full request/response schemas: **[docs/api-contract.md](docs/api-contract.md)**

<br>

## 📂 Project Structure

```
SIH_2026/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # climate, material, area-design services
│   │   ├── models/        # request/response schemas
│   │   └── thermal/       # core physics simulation engine
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/    # 3D viewer, thermal chart, report export
│   │   └── index.css
│   └── assets/            # shelter reference imagery
└── docs/
    └── api-contract.md
```

<br>

## 🚧 Project Status

> Actively being developed for **Smart India Hackathon 2026**. Core thermal simulation engine, location database and 3D viewer are functional; deployment and judge-facing live demo are in progress.

<br>

## 👥 Team

<div align="center">

*Add your team name and members here*

| Name | Role |
|:---|:---|
| — | — |
| — | — |

</div>

<br>

## 🤝 Contributing

Issues and PRs are welcome. Please open an issue to discuss any major change before submitting a pull request.

## 📜 License

MIT — see `LICENSE` for details.

<br>

<div align="center">

<img src="https://img.shields.io/badge/-%20-FF9933?style=flat" width="33%" height="6"><img src="https://img.shields.io/badge/-%20-FFFFFF?style=flat" width="34%" height="6"><img src="https://img.shields.io/badge/-%20-138808?style=flat" width="33%" height="6">

**Built for Smart India Hackathon 2026 🇮🇳**

[⬆ Back to top](#-smart-passive-shelter)

</div>
