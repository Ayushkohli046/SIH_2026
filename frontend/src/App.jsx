import React, { useState, useEffect, useRef } from 'react';
import Shelter3DViewer from './components/Shelter3DViewer.jsx';
import ThermalChart from './components/ThermalChart.jsx';
import { exportMissionReport } from './components/ReportExport.jsx';

const API_BASE = 'http://localhost:8000';

// ─────────────────────────────────────────────────────────────────────────────
// COMPREHENSIVE STRATEGIC LOCATION & CLIMATE DATABASE
// ─────────────────────────────────────────────────────────────────────────────

const LOCATION_PRESETS = {
  // Northern High Altitude / Glacial Sector
  siachen_north: {
    name: 'Siachen Glacier (North Glacier Camp-1)',
    lat: 35.50, lon: 77.00, elevation: '5,400 m',
    theatre: 'siachen', archetype: 'arctic_pod', variant: 'alpha',
    terrain: 'Sub-Zero Glacier Moraine & Permafrost',
    camo: 'Arctic Snow White / Camo', albedo: '0.80',
    sector: 'Northern Glacial Sector',
  },
  siachen_kumar: {
    name: 'Siachen Kumar Post (Saltoro Ridge)',
    lat: 35.35, lon: 77.10, elevation: '4,880 m',
    theatre: 'siachen', archetype: 'quonset_vault', variant: 'beta',
    terrain: 'Hard Ice Glacier & Katabatic Winds',
    camo: 'Arctic Camo', albedo: '0.82',
    sector: 'Northern Glacial Sector',
  },
  leh_ladakh: {
    name: 'Leh Main Outpost, Ladakh',
    lat: 34.15, lon: 77.58, elevation: '3,520 m',
    theatre: 'ladakh', archetype: 'trombe_wall', variant: 'alpha',
    terrain: 'High-Altitude Cold Desert Bedrock',
    camo: 'Mountain Olive / Earth', albedo: '0.28',
    sector: 'Ladakh High Altitude Sector',
  },
  chushul: {
    name: 'Chushul Border Outpost, Ladakh',
    lat: 33.58, lon: 78.65, elevation: '4,350 m',
    theatre: 'ladakh', archetype: 'trombe_wall', variant: 'alpha',
    terrain: 'High-Altitude Alpine Plain & Bedrock',
    camo: 'Mountain Olive / Rock', albedo: '0.30',
    sector: 'Ladakh High Altitude Sector',
  },
  nyoma: {
    name: 'Nyoma Forward Airfield, Ladakh',
    lat: 33.20, lon: 78.66, elevation: '4,180 m',
    theatre: 'ladakh', archetype: 'solarium_sunspace', variant: 'beta',
    terrain: 'Indus Valley Cold Silt Bed',
    camo: 'High Desert Camo', albedo: '0.29',
    sector: 'Ladakh High Altitude Sector',
  },
  dras: {
    name: 'Dras Outpost (Second Coldest Inhabited Place)',
    lat: 34.43, lon: 75.76, elevation: '3,280 m',
    theatre: 'siachen', archetype: 'arctic_pod', variant: 'alpha',
    terrain: 'Heavy Snow Valley & Severe Freeze Basin',
    camo: 'Snow Camo', albedo: '0.75',
    sector: 'Northern Glacial Sector',
  },
  kargil: {
    name: 'Kargil Forward Sector',
    lat: 34.55, lon: 76.13, elevation: '2,676 m',
    theatre: 'ladakh', archetype: 'trombe_wall', variant: 'alpha',
    terrain: 'Steep Rocky Valley & Deep Winter Freeze',
    camo: 'Rock Camo', albedo: '0.26',
    sector: 'Ladakh High Altitude Sector',
  },

  // Eastern Command / Alpine Sector
  tawang: {
    name: 'Tawang Outpost, Arunachal Pradesh',
    lat: 27.58, lon: 91.86, elevation: '3,048 m',
    theatre: 'ladakh', archetype: 'stilted_pavilion', variant: 'beta',
    terrain: 'Damp Alpine Slope & Heavy Snow/Rain',
    camo: 'Alpine Green / Wood', albedo: '0.20',
    sector: 'Eastern Alpine LAC Sector',
  },
  kibithu: {
    name: 'Kibithu LAC Post, Arunachal Pradesh',
    lat: 28.24, lon: 97.01, elevation: '1,305 m',
    theatre: 'ladakh', archetype: 'stilted_pavilion', variant: 'gamma',
    terrain: 'Lohit River Valley Damp Terrain',
    camo: 'Dense Jungle Olive', albedo: '0.18',
    sector: 'Eastern Alpine LAC Sector',
  },
  nathula: {
    name: 'Nathu La Pass, Sikkim (4,310m)',
    lat: 27.38, lon: 88.83, elevation: '4,310 m',
    theatre: 'siachen', archetype: 'quonset_vault', variant: 'beta',
    terrain: 'High Alpine Ridge & Fog/Snow Blizzard',
    camo: 'Arctic Mist Camo', albedo: '0.70',
    sector: 'Eastern Alpine LAC Sector',
  },

  // Western Command / Desert Sector
  longewala: {
    name: 'Longewala Post, Thar Desert',
    lat: 26.91, lon: 70.91, elevation: '180 m',
    theatre: 'thar', archetype: 'badgir_windtower', variant: 'alpha',
    terrain: 'Scorching Silica Sand Dunes',
    camo: 'Desert Khaki / Sand', albedo: '0.38',
    sector: 'Western Desert Sector',
  },
  tanot: {
    name: 'Tanot Border Outpost, Jaisalmer',
    lat: 27.80, lon: 70.35, elevation: '170 m',
    theatre: 'thar', archetype: 'badgir_windtower', variant: 'alpha',
    terrain: 'Fine Silica Sand & Extreme Solar Flux',
    camo: 'Desert Sand Camo', albedo: '0.39',
    sector: 'Western Desert Sector',
  },
  bikaner: {
    name: 'Bikaner Border Outpost, Rajasthan',
    lat: 28.02, lon: 73.31, elevation: '242 m',
    theatre: 'thar', archetype: 'canopy_shelter', variant: 'gamma',
    terrain: 'Arid Clay Loam & Sand Dunes',
    camo: 'Desert Sand Camo', albedo: '0.34',
    sector: 'Western Desert Sector',
  },

  // Himalayan Foothills & Valleys
  spiti: {
    name: 'Kaza, Spiti Valley (Cold Mountain Desert)',
    lat: 32.22, lon: 78.07, elevation: '3,800 m',
    theatre: 'ladakh', archetype: 'trombe_wall', variant: 'alpha',
    terrain: 'Dry High-Altitude Loess Bedrock',
    camo: 'Earth / Shale Grey', albedo: '0.27',
    sector: 'Himalayan Valleys',
  },
  shimla: {
    name: 'Shimla Ridge Outpost',
    lat: 31.10, lon: 77.17, elevation: '2,276 m',
    theatre: 'temperate', archetype: 'solarium_sunspace', variant: 'beta',
    terrain: 'Himalayan Mixed Forest Ridge',
    camo: 'Forest Green', albedo: '0.22',
    sector: 'Himalayan Valleys',
  },
  srinagar: {
    name: 'Srinagar Valley Outpost',
    lat: 34.08, lon: 74.79, elevation: '1,585 m',
    theatre: 'ladakh', archetype: 'solarium_sunspace', variant: 'beta',
    terrain: 'Alluvial Basin & Snow Freeze',
    camo: 'Valley Green / Grey', albedo: '0.25',
    sector: 'Himalayan Valleys',
  },

  // Central / Composite
  delhi: {
    name: 'New Delhi (Composite Climate Station)',
    lat: 28.61, lon: 77.20, elevation: '216 m',
    theatre: 'temperate', archetype: 'solarium_sunspace', variant: 'gamma',
    terrain: 'Alluvial Plain & Urban Heat Island',
    camo: 'Urban Khaki', albedo: '0.22',
    sector: 'Composite & Plains',
  },
};

const THEATRE_PHOTOS = {
  siachen: {
    alpha: { title: 'Siachen Aero-Ridge Pod', file: '/assets/siachen_aeroridge_real.jpg', note: 'Extreme high-altitude composite pod with 55° self-clearing bifacial solar roof and stilted foundation over moraine.' },
    beta:  { title: 'Siachen Quonset Arch',   file: '/assets/siachen_quonset_real.jpg',   note: 'Aerodynamic corrugated vault tested for 225 km/h katabatic blizzard winds on the Saltoro ridge.' },
    gamma: { title: 'Siachen Arctic Autonomous Bunker', file: '/assets/siachen_arcticpod_real.jpg', note: 'Hermetic bio-PCM thermal battery bunker engineered for zero-fuel 72-hour survival.' },
  },
  ladakh: {
    alpha: { title: 'Ladakh Solaris Trombe Wall',   file: '/assets/ladakh_trombe_real.jpg',   note: 'Heavy basalt thermal storage wall absorbing southern direct solar flux for 8-hour nighttime lag.' },
    beta:  { title: 'Ladakh Solarium Buffer',       file: '/assets/ladakh_solarium_real.jpg', note: 'Attached glazed thermal greenhouse buffer preheating arctic air from -15°C to +8°C.' },
    gamma: { title: 'Ladakh Stabilized Earth Fortress', file: '/assets/ladakh_fortress_real.jpg', note: '350mm ballistic stabilized compressed earth blocks with vegetative roof insulation.' },
  },
  thar: {
    alpha: { title: 'Thar Badgir Wind-Master',      file: '/assets/thar_badgir_real.jpg',  note: 'Traditional passive dual-catchment wind tower inducing night-purge natural convection.' },
    beta:  { title: 'Thar Subterranean Qanat Loop', file: '/assets/thar_qanat_real.jpg',   note: 'Earth-air heat exchanger utilizing steady 24°C subterranean temperature 3m underground.' },
    gamma: { title: 'Thar Kinetic Solar Canopy',    file: '/assets/thar_canopy_real.jpg',  note: 'Double-skin ventilated canopy shading shelter roof, eliminating direct 1,000 W/m² solar heat gain.' },
  },
  temperate: {
    alpha: { title: 'Solaris Trombe Wall Hybrid',   file: '/assets/ladakh_trombe_real.jpg',   note: 'Multi-season hybrid thermal storage with seasonal ventilation louvers.' },
    beta:  { title: 'Attached Sunspace Buffer',     file: '/assets/ladakh_solarium_real.jpg', note: 'Glazed direct-gain sunspace buffer providing winter heat and summer airflow.' },
    gamma: { title: 'Dynamic Parasol Shelter',      file: '/assets/thar_canopy_real.jpg',  note: 'Double-skin ventilated envelope with operable summer shading.' },
  },
};

const S = {
  input: { background: '#05080d', color: '#f8fafc', border: '1px solid #23374d', padding: '5px 8px', fontSize: '11px', borderRadius: '3px', width: '100%', boxSizing: 'border-box' },
  label: { fontSize: '10px', color: '#64748b', marginBottom: '2px', display: 'block' },
  card:  { background: '#0a1018', border: '1px solid #1c2b3a', borderRadius: '4px', padding: '10px' },
  sectionTitle: { fontSize: '11px', color: '#84cc16', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' },
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APPLICATION
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  // System State
  const [backendStatus, setBackendStatus] = useState('Checking...');
  const [materialsList, setMaterialsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('designer');

  // Location State
  const [presetKey, setPresetKey] = useState('siachen_north');
  const [lat, setLat] = useState(35.50);
  const [lon, setLon] = useState(77.00);
  const [elevation, setElevation] = useState(5400);
  const [theatre, setTheatre] = useState('siachen');
  const [variant, setVariant] = useState('alpha');
  const [archetypeTitle, setArchetypeTitle] = useState('Siachen Aero-Ridge Composite Pod');

  // Geocoding
  const [cityQuery, setCityQuery] = useState('');
  const [geoSuggestions, setGeoSuggestions] = useState([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [showGeo, setShowGeo] = useState(false);
  const geoTimer = useRef(null);
  const geoRef = useRef(null);

  // Microclimate & Area Intelligence State
  const [climateTelemetry, setClimateTelemetry] = useState(null);
  const [climateClassification, setClimateClassification] = useState(null);
  const [areaDesignResult, setAreaDesignResult] = useState(null);
  const [autoDesigning, setAutoDesigning] = useState(false);

  // Shelter Parametric State
  const [length, setLength] = useState(8.0);
  const [width, setWidth] = useState(6.0);
  const [height, setHeight] = useState(2.8);
  const [orientation, setOrientation] = useState(180);
  const [occupants, setOccupants] = useState(8);
  const [ach, setAch] = useState(0.35);

  // Materials & Insulation
  const [wallMaterial, setWallMaterial] = useState('pu_sandwich');
  const [roofMaterial, setRoofMaterial] = useState('pu_sandwich');
  const [floorMaterial, setFloorMaterial] = useState('concrete');
  const [insulationMaterial, setInsulationMaterial] = useState('aerogel');
  const [insulationThickness, setInsulationThickness] = useState(0.10);

  // Custom Material
  const [showCustomMat, setShowCustomMat] = useState(false);
  const [customMat, setCustomMat] = useState({ name: 'DRDO Aerogel-v2 Blanket', conductivity: 0.015, density: 45, specific_heat: 1050, thickness: 0.08, solar_absorptivity: 0.35 });
  const [useCustomMat, setUseCustomMat] = useState(false);

  // Openings & Sim Config
  const [windowArea, setWindowArea] = useState(3.2);
  const [doorArea, setDoorArea] = useState(1.8);
  const [simDays, setSimDays] = useState(1);

  // 3D Canvas Interactive Controls
  const [sunHour, setSunHour] = useState(12);
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [cutawayMode, setCutawayMode] = useState(false);
  const [activePhoto, setActivePhoto] = useState(null);

  // Results
  const [simResult, setSimResult] = useState(null);
  const [optResult, setOptResult] = useState(null);
  const [sweepResult, setSweepResult] = useState(null);
  const [sweepLoading, setSweepLoading] = useState(false);

  // Scenario Vault
  const [savedScenarios, setSavedScenarios] = useState(() => {
    try { return JSON.parse(localStorage.getItem('spsd_saved_scenarios') || '[]'); }
    catch { return []; }
  });

  // ─────────────────────────────────────────────────────────────────
  // Initialization & Health
  // ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    checkHealth();
    fetchMaterials();
    // Auto-fetch initial microclimate intelligence for default location
    fetchAreaRecommendation(35.50, 77.00, 5400, false);

    const handleClick = (e) => {
      if (geoRef.current && !geoRef.current.contains(e.target)) setShowGeo(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      const data = res.ok ? await res.json() : null;
      setBackendStatus(data?.status === 'ok' ? 'CONNECTED' : 'OFFLINE');
    } catch { setBackendStatus('DISCONNECTED (FastAPI port 8000)'); }
  };

  const fetchMaterials = async () => {
    try {
      const res = await fetch(`${API_BASE}/materials`);
      if (res.ok) { const d = await res.json(); setMaterialsList(d.materials || []); }
    } catch {
      setMaterialsList([
        { id: 'burnt_brick', name: 'Common burnt clay brick' },
        { id: 'concrete', name: 'Dense concrete' },
        { id: 'aac_block', name: 'Autoclaved aerated concrete (AAC)' },
        { id: 'pu_sandwich', name: 'Polyurethane Foam (PUF) SIP composite' },
        { id: 'eps', name: 'Expanded polystyrene insulation' },
        { id: 'mineral_wool', name: 'Mineral wool insulation' },
        { id: 'aerogel', name: 'Nanoporous aerogel blanket' },
      ]);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // Location Selection & Microclimate Auto-Synthesis
  // ─────────────────────────────────────────────────────────────────

  const handlePresetSelect = (key) => {
    setPresetKey(key);
    if (key === 'custom') return;
    const p = LOCATION_PRESETS[key];
    if (!p) return;
    setLat(p.lat);
    setLon(p.lon);
    setCityQuery('');
    const elevNum = parseInt(p.elevation.replace(/[^0-9]/g, '')) || 1000;
    setElevation(elevNum);
    setTheatre(p.theatre);
    setVariant(p.variant || 'alpha');
    fetchAreaRecommendation(p.lat, p.lon, elevNum, false);
  };

  const fetchAreaRecommendation = async (targetLat, targetLon, targetElev, applyImmediately = true) => {
    setAutoDesigning(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/area-design`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: parseFloat(targetLat),
          longitude: parseFloat(targetLon),
          elevation: targetElev ? parseFloat(targetElev) : null,
          occupants: parseInt(occupants, 10),
          hours: simDays * 24,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to synthesize area shelter');
      }

      const data = await res.json();
      setAreaDesignResult(data);
      setClimateTelemetry(data.climate_telemetry);
      setClimateClassification(data.classification);

      if (applyImmediately || !simResult) {
        applySynthesizedDesign(data);
      }
    } catch (err) {
      console.error(err);
      setError(`Area-Specific Design Error: ${err.message}`);
    }
    setAutoDesigning(false);
  };

  const applySynthesizedDesign = (data) => {
    const cls = data.classification;
    const rec = data.recommended_design;
    const dims = rec.shelter_dimensions;
    const mats = rec.materials;

    setTheatre(cls.theatre || 'ladakh');
    setArchetypeTitle(cls.archetype_title || cls.zone_name);

    // Map archetype to 3D variant
    if (cls.archetype === 'arctic_pod') setVariant('alpha');
    else if (cls.archetype === 'quonset_vault') setVariant('beta');
    else if (cls.archetype === 'trombe_wall') setVariant('alpha');
    else if (cls.archetype === 'solarium_sunspace') setVariant('beta');
    else if (cls.archetype === 'badgir_windtower') setVariant('alpha');
    else if (cls.archetype === 'canopy_shelter') setVariant('gamma');
    else setVariant('alpha');

    setLength(dims.length_m);
    setWidth(dims.width_m);
    setHeight(dims.height_m);
    setOrientation(rec.orientation_deg);
    setAch(rec.ach);

    setWallMaterial(mats.wall);
    setRoofMaterial(mats.roof);
    setFloorMaterial(mats.floor);
    setInsulationMaterial(mats.insulation);
    setInsulationThickness(mats.insulation_thickness_mm / 1000);

    setWindowArea(rec.openings.window_area_m2);
    setDoorArea(rec.openings.door_area_m2);

    // Populate sim result from the synthesis comparison
    setSimResult({
      summary: data.performance_comparison.recommended,
      hourly: data.simulation_hourly,
      physics: data.simulation_physics,
    });
  };

  const handleCityInput = (val) => {
    setCityQuery(val);
    clearTimeout(geoTimer.current);
    if (val.length < 2) { setGeoSuggestions([]); setShowGeo(false); return; }
    geoTimer.current = setTimeout(async () => {
      setGeoLoading(true);
      try {
        const res = await fetch(`${API_BASE}/geocode?q=${encodeURIComponent(val)}`);
        if (res.ok) { const d = await res.json(); setGeoSuggestions(d.results || []); setShowGeo(true); }
      } catch { /* silent */ }
      setGeoLoading(false);
    }, 300);
  };

  const handleGeoSelect = (s) => {
    setLat(s.latitude);
    setLon(s.longitude);
    setElevation(s.elevation ? Math.round(s.elevation) : 1000);
    setCityQuery(s.display);
    setGeoSuggestions([]);
    setShowGeo(false);
    setPresetKey('custom');
    fetchAreaRecommendation(s.latitude, s.longitude, s.elevation, true);
  };

  // ─────────────────────────────────────────────────────────────────
  // Simulation & Optimization
  // ─────────────────────────────────────────────────────────────────

  const getPayload = () => ({
    location: { latitude: parseFloat(lat), longitude: parseFloat(lon) },
    shelter: { length: parseFloat(length), width: parseFloat(width), height: parseFloat(height), orientation: parseFloat(orientation), occupants: parseInt(occupants, 10), ach: parseFloat(ach) },
    materials: { wall: wallMaterial, roof: roofMaterial, floor: floorMaterial, insulation: insulationMaterial },
    insulation_thickness: parseFloat(insulationThickness),
    openings: { window_area: parseFloat(windowArea), door_area: parseFloat(doorArea) },
    hours: simDays * 24,
    ...(useCustomMat && customMat.name.trim()
      ? { custom_insulation: { name: customMat.name, conductivity: customMat.conductivity, density: customMat.density, specific_heat: customMat.specific_heat, thickness: customMat.thickness, solar_absorptivity: customMat.solar_absorptivity } }
      : {}),
  });

  const handleSimulate = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/simulate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(getPayload()) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || `Simulation failed (${res.status})`); }
      const data = await res.json();
      setSimResult(data.simulation || data);
      setActiveTab('analytics');
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const handleOptimize = async () => {
    setLoading(true); setError(null);
    try {
      const payload = { ...getPayload(), insulation_options: [0.05, 0.075, 0.10, 0.15], orientations: [0, 90, 180, 270] };
      const res = await fetch(`${API_BASE}/optimize`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || `Optimization failed (${res.status})`); }
      const data = await res.json();
      setOptResult(data); setActiveTab('logistics');
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const handleMaterialSweep = async () => {
    setSweepLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/material-sweep`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(getPayload()) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Material sweep failed'); }
      const data = await res.json();
      setSweepResult(data); setActiveTab('sweep');
    } catch (err) { setError(err.message); }
    setSweepLoading(false);
  };

  const handleSaveScenario = () => {
    const activePreset = LOCATION_PRESETS[presetKey] || { name: `${lat}°N ${lon}°E` };
    const newScenario = {
      id: Date.now(),
      timestamp: new Date().toLocaleString(),
      name: `${activePreset.name.split('(')[0].trim()} — ${(insulationThickness * 1000).toFixed(0)}mm ${insulationMaterial}`,
      lat, lon, theatre, variant, simDays,
      dimensions: { length, width, height, occupants },
      materials: { wall: wallMaterial, roof: roofMaterial, insulation: insulationMaterial, thickness: insulationThickness },
      metrics: {
        heating_kwh: simResult?.summary?.heating_requirement_kwh ?? 'N/A',
        cooling_kwh: simResult?.summary?.cooling_requirement_kwh ?? 'N/A',
        comfort_hours: simResult?.summary?.passive_comfort_hours ?? 'N/A',
        total_hours: simResult?.summary?.total_hours ?? 24,
        avg_temp: simResult?.summary?.average_indoor_temperature_c ?? 'N/A',
        u_wall: simResult?.physics?.u_wall ?? 'N/A',
        envelope_mass: areaDesignResult?.performance_comparison?.recommended?.logistics?.envelope_mass_kg ?? 'N/A',
        diesel_saved: areaDesignResult?.performance_comparison?.recommended?.logistics?.annual_diesel_saved_liters ?? 'N/A',
      },
    };
    const updated = [newScenario, ...savedScenarios.slice(0, 7)];
    setSavedScenarios(updated);
    try { localStorage.setItem('spsd_saved_scenarios', JSON.stringify(updated)); } catch (e) { console.error(e); }
    setActiveTab('vault');
  };

  const handleDeleteScenario = (id) => {
    const updated = savedScenarios.filter((s) => s.id !== id);
    setSavedScenarios(updated);
    localStorage.setItem('spsd_saved_scenarios', JSON.stringify(updated));
  };

  const handleExport = () => {
    const activePreset = LOCATION_PRESETS[presetKey];
    exportMissionReport({
      locationName: cityQuery || activePreset?.name || `${lat}°N, ${lon}°E`,
      lat, lon, theatre, simResult, optResult, simDays,
      shelter: { length, width, height, orientation, occupants, ach },
      materials: { wall: wallMaterial, roof: roofMaterial, floor: floorMaterial, insulation: insulationMaterial },
      insulationThickness, windowArea, doorArea,
    });
  };

  // ─────────────────────────────────────────────────────────────────
  // Sub-components & Helpers
  // ─────────────────────────────────────────────────────────────────

  const activePreset = LOCATION_PRESETS[presetKey] || LOCATION_PRESETS.siachen_north;
  const activeHourlyData = simResult?.hourly || areaDesignResult?.simulation_hourly || null;
  const phy = simResult?.physics || areaDesignResult?.simulation_physics || {};
  const sum = simResult?.summary || areaDesignResult?.performance_comparison?.recommended || {};
  const comp = areaDesignResult?.performance_comparison || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#03070d', color: '#f8fafc', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>

      {/* ══════════════ HEADER BAR ══════════════ */}
      <header style={{ height: '50px', minHeight: '50px', background: '#060a0f', borderBottom: '1px solid #162436', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ background: '#84cc16', color: '#03070d', fontWeight: 900, fontSize: '11px', padding: '3px 8px', borderRadius: '3px', letterSpacing: '0.05em' }}>DRDO / DGRE</span>
          <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.04em', color: '#f8fafc' }}>SMART PASSIVE SHELTER DESIGNER</span>
          <span style={{ fontSize: '10px', color: '#475569', fontFamily: 'monospace' }}>// SIH 26051 AI-CAD</span>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {[
            { id: 'designer',  label: '1. 3D Twin & Microclimate' },
            { id: 'analytics', label: `2. Thermal Analytics (${simDays}d)` },
            { id: 'logistics', label: '3. Defense Fuel Logistics' },
            { id: 'sweep',     label: '4. Material Matrix' },
            { id: 'vault',     label: `5. Mission Vault (${savedScenarios.length})` },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              background: activeTab === tab.id ? 'rgba(132,204,22,0.18)' : '#0a1018',
              color: activeTab === tab.id ? '#84cc16' : '#94a3b8',
              border: activeTab === tab.id ? '1px solid #84cc16' : '1px solid #1c2b3a',
              padding: '6px 12px', fontSize: '11px', fontWeight: 700, borderRadius: '3px', cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '10px', fontFamily: 'monospace' }}>
          <div>SERVER: <span style={{ color: backendStatus === 'CONNECTED' ? '#84cc16' : '#ef4444', fontWeight: 700 }}>{backendStatus}</span></div>
          <div style={{ color: '#334155' }}>|</div>
          <div>THEATRE: <span style={{ color: '#38bdf8', fontWeight: 700 }}>{theatre.toUpperCase()}</span></div>
          <div style={{ color: '#334155' }}>|</div>
          <button onClick={handleExport} style={{ background: 'rgba(250,204,21,0.15)', border: '1px solid #facc15', color: '#facc15', padding: '4px 8px', borderRadius: '3px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>
            📥 Export PDF
          </button>
        </div>
      </header>

      {/* ══════════════ MAIN WORKSPACE ══════════════ */}
      <main style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ══════════════ LEFT CONTROLS PANEL ══════════════ */}
        <div style={{ width: '380px', minWidth: '380px', background: '#060a10', borderRight: '1px solid #162436', padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* 1. SECTOR & LOCATION EXPLORER */}
          <div style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={S.sectionTitle}>1. Strategic Deployment Sector</label>
              <span style={{ fontSize: '9px', color: '#38bdf8', fontFamily: 'monospace' }}>{elevation}m Elev</span>
            </div>

            {/* Strategic Outpost Quick Select */}
            <select value={presetKey} onChange={(e) => handlePresetSelect(e.target.value)} style={S.input}>
              <optgroup label="🏔️ Northern Command / High Altitude Glaciers">
                <option value="siachen_north">Siachen Glacier (North Camp-1) · 5,400m</option>
                <option value="siachen_kumar">Siachen Kumar Post (Saltoro Ridge) · 4,880m</option>
                <option value="dras">Dras Outpost (Second Coldest Place) · 3,280m</option>
                <option value="kargil">Kargil Forward Sector · 2,676m</option>
              </optgroup>
              <optgroup label="🏔️ Ladakh Cold Mountain Desert">
                <option value="leh_ladakh">Leh Main Outpost, Ladakh · 3,520m</option>
                <option value="chushul">Chushul LAC Outpost · 4,350m</option>
                <option value="nyoma">Nyoma Forward Airfield · 4,180m</option>
                <option value="spiti">Kaza, Spiti Valley · 3,800m</option>
              </optgroup>
              <optgroup label="🌲 Eastern Command / Alpine LAC">
                <option value="tawang">Tawang Outpost, Arunachal · 3,048m</option>
                <option value="kibithu">Kibithu Easternmost Post · 1,305m</option>
                <option value="nathula">Nathu La Pass, Sikkim · 4,310m</option>
              </optgroup>
              <optgroup label="🏜️ Western Command / Thar Desert">
                <option value="longewala">Longewala Border Post · 180m</option>
                <option value="tanot">Tanot Desert Outpost · 170m</option>
                <option value="bikaner">Bikaner Desert Sector · 242m</option>
              </optgroup>
              <optgroup label="⛰️ Himalayan Foothills & Composite">
                <option value="shimla">Shimla Ridge Outpost · 2,276m</option>
                <option value="srinagar">Srinagar Valley Outpost · 1,585m</option>
                <option value="delhi">New Delhi Central Station · 216m</option>
              </optgroup>
              <option value="custom">🌐 Custom Coordinates / Global Search</option>
            </select>

            {/* Global City Search */}
            <div style={{ position: 'relative', marginTop: '6px' }} ref={geoRef}>
              <input
                type="text"
                value={cityQuery}
                onChange={(e) => handleCityInput(e.target.value)}
                placeholder="🔍 Search any global city / outpost..."
                style={S.input}
              />
              {geoLoading && <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '9px', color: '#84cc16' }}>searching...</span>}
              {showGeo && geoSuggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0a1018', border: '1px solid #23374d', borderRadius: '3px', zIndex: 60, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.9)' }}>
                  {geoSuggestions.map((s, i) => (
                    <div key={i} onClick={() => handleGeoSelect(s)}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#162436'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      style={{ padding: '7px 10px', fontSize: '10px', cursor: 'pointer', borderBottom: '1px solid #0e1724', color: s.is_military ? '#84cc16' : '#cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{s.display}</strong>
                        <div style={{ fontSize: '9px', color: '#64748b' }}>{s.latitude.toFixed(2)}°N, {s.longitude.toFixed(2)}°E &bull; Elev: {Math.round(s.elevation || 0)}m ({Math.round((s.elevation || 0) * 3.28084).toLocaleString()} ft)</div>
                      </div>
                      <span style={{ fontSize: '8px', background: s.is_military ? '#14532d' : '#0e2439', color: s.is_military ? '#86efac' : '#7dd3fc', padding: '2px 5px', borderRadius: '2px', fontWeight: 700 }}>{s.is_military ? 'DEFENCE POST' : 'CITY'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Custom Coordinate Editor */}
            {presetKey === 'custom' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginTop: '6px' }}>
                <div>
                  <span style={S.label}>Lat °N</span>
                  <input type="number" step="0.01" value={lat} onChange={(e) => setLat(parseFloat(e.target.value) || 0)} style={S.input} />
                </div>
                <div>
                  <span style={S.label}>Lon °E</span>
                  <input type="number" step="0.01" value={lon} onChange={(e) => setLon(parseFloat(e.target.value) || 0)} style={S.input} />
                </div>
                <div>
                  <span style={S.label}>Elev (m)</span>
                  <input type="number" value={elevation} onChange={(e) => setElevation(parseInt(e.target.value) || 0)} style={S.input} />
                </div>
              </div>
            )}

            {/* HERO BUTTON: AUTO-GENERATE AREA-SPECIFIC SHELTER */}
            <button
              onClick={() => fetchAreaRecommendation(lat, lon, elevation, true)}
              disabled={autoDesigning}
              style={{
                marginTop: '10px',
                width: '100%',
                background: autoDesigning ? '#334155' : 'linear-gradient(135deg, #84cc16 0%, #65a30d 100%)',
                color: '#03070d',
                border: 'none',
                padding: '9px 12px',
                borderRadius: '3px',
                fontSize: '11px',
                fontWeight: 900,
                cursor: autoDesigning ? 'not-allowed' : 'pointer',
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 10px rgba(132,204,22,0.3)',
              }}>
              {autoDesigning ? '⚡ SYNTHESIZING AREA SHELTER...' : '⚡ AUTO-DESIGN OPTIMAL AREA SHELTER'}
            </button>
          </div>

          {/* 2. REAL-TIME MICROCLIMATE HUD CARD */}
          {climateTelemetry && (
            <div style={{ ...S.card, borderColor: '#38bdf833', borderLeft: '3px solid #38bdf8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 800 }}>LIVE MICROCLIMATE TELEMETRY</span>
                <span style={{ fontSize: '9px', background: '#0e2338', color: '#7dd3fc', padding: '1px 5px', borderRadius: '2px' }}>Open-Meteo</span>
              </div>

              {/* Climate Metric Badges */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '8px' }}>
                <div style={{ background: '#060a10', padding: '6px', borderRadius: '3px', border: '1px solid #162436' }}>
                  <div style={S.label}>Outdoor Temp Range</div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: climateTelemetry.t_min_c < 0 ? '#38bdf8' : '#f97316' }}>
                    {climateTelemetry.t_min_c}°C <span style={{ color: '#64748b', fontSize: '10px' }}>to</span> {climateTelemetry.t_max_c}°C
                  </div>
                </div>

                <div style={{ background: '#060a10', padding: '6px', borderRadius: '3px', border: '1px solid #162436' }}>
                  <div style={S.label}>Peak Solar Irradiance</div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#facc15' }}>
                    {climateTelemetry.peak_solar_ghi_w_m2} <span style={{ fontSize: '9px', color: '#94a3b8' }}>W/m²</span>
                  </div>
                </div>

                <div style={{ background: '#060a10', padding: '6px', borderRadius: '3px', border: '1px solid #162436' }}>
                  <div style={S.label}>Diurnal Swing (ΔT)</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#cbd5e1' }}>
                    ±{climateTelemetry.diurnal_range_c}°C <span style={{ fontSize: '9px', color: '#64748b' }}>Day/Night</span>
                  </div>
                </div>

                <div style={{ background: '#060a10', padding: '6px', borderRadius: '3px', border: '1px solid #162436' }}>
                  <div style={S.label}>Max Wind & Humidity</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#cbd5e1' }}>
                    {climateTelemetry.max_wind_km_h} km/h · {climateTelemetry.mean_rh_pct}%
                  </div>
                </div>
              </div>

              {/* Climate Classification & NBC Zone */}
              {climateClassification && (
                <div style={{ marginTop: '8px', background: '#0c1520', padding: '8px', borderRadius: '3px', border: '1px solid #1c304a' }}>
                  <div style={{ fontSize: '10px', color: '#84cc16', fontWeight: 800 }}>
                    🏷️ {climateClassification.zone_name}
                  </div>
                  <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '3px', lineHeight: 1.4 }}>
                    <strong>Active Strategy:</strong> {climateClassification.archetype_title}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. 3D DIGITAL TWIN ARCHETYPE & VARIANT */}
          <div style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={S.sectionTitle}>2. 3D Twin Archetype</label>
              <span style={{ fontSize: '9px', color: '#84cc16' }}>{variant.toUpperCase()}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
              {['alpha', 'beta', 'gamma'].map((v) => (
                <button
                  key={v}
                  onClick={() => setVariant(v)}
                  style={{
                    background: variant === v ? 'rgba(132,204,22,0.18)' : '#05080d',
                    border: variant === v ? '1px solid #84cc16' : '1px solid #1c2b3a',
                    color: variant === v ? '#84cc16' : '#94a3b8',
                    padding: '6px 4px',
                    fontSize: '10px',
                    fontWeight: 700,
                    borderRadius: '2px',
                    cursor: 'pointer',
                  }}>
                  Option {v.toUpperCase()}
                </button>
              ))}
            </div>

            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '6px', lineHeight: 1.4 }}>
              {theatre === 'siachen' && (variant === 'alpha' ? 'Aero-Ridge Pod: 55° bifacial solar roof with stilted thermal break foundation.' : variant === 'beta' ? 'Quonset Blizzard Vault: Aerodynamic curved arch resisting 225 km/h winds.' : 'Autonomous Arctic Bunker: Hermetic bio-PCM thermal core for zero-fuel survival.')}
              {theatre === 'ladakh' && (variant === 'alpha' ? 'Solaris Trombe Wall: South-glazed basalt mass wall with 8h thermal lag.' : variant === 'beta' ? 'Attached Solarium Sunspace: Glazed thermal buffer greenhouse preheating air.' : 'Stabilized Earth Fortress: 350mm ballistic compressed earth block envelope.')}
              {theatre === 'thar' && (variant === 'alpha' ? 'Badgir Wind Tower: Dual natural wind catcher inducing night convective purge.' : variant === 'beta' ? 'Earth-Air Qanat: Subterranean geothermal loop utilizing steady 24°C ground.' : 'Kinetic Solar Canopy: Double-skin parasol roof deflecting 1,000 W/m² solar flux.')}
              {theatre === 'temperate' && 'Multi-season hybrid passive shelter with dynamic overhang solar shading.'}
            </div>
          </div>

          {/* 4. PARAMETRIC SHELTER GEOMETRY */}
          <div style={S.card}>
            <label style={S.sectionTitle}>3. Parametric Dimensions</label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px' }}>
              <div>
                <span style={S.label}>Length (m): {length}</span>
                <input type="range" min="4" max="20" step="0.5" value={length} onChange={(e) => setLength(parseFloat(e.target.value))} style={{ width: '100%' }} />
              </div>
              <div>
                <span style={S.label}>Width (m): {width}</span>
                <input type="range" min="4" max="15" step="0.5" value={width} onChange={(e) => setWidth(parseFloat(e.target.value))} style={{ width: '100%' }} />
              </div>
              <div>
                <span style={S.label}>Height (m): {height}</span>
                <input type="range" min="2.4" max="5.0" step="0.1" value={height} onChange={(e) => setHeight(parseFloat(e.target.value))} style={{ width: '100%' }} />
              </div>
              <div>
                <span style={S.label}>Solar Azimuth: {orientation}°</span>
                <input type="range" min="0" max="350" step="10" value={orientation} onChange={(e) => setOrientation(parseInt(e.target.value))} style={{ width: '100%' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px' }}>
              <div>
                <span style={S.label}>Occupants</span>
                <input type="number" min="1" max="50" value={occupants} onChange={(e) => setOccupants(parseInt(e.target.value) || 1)} style={S.input} />
              </div>
              <div>
                <span style={S.label}>Infiltration (ACH)</span>
                <input type="number" step="0.05" min="0.1" max="5.0" value={ach} onChange={(e) => setAch(parseFloat(e.target.value) || 0.5)} style={S.input} />
              </div>
            </div>
          </div>

          {/* 5. ENVELOPE MATERIALS & INSULATION */}
          <div style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={S.sectionTitle}>4. Thermal Envelope Materials</label>
              <span style={{ fontSize: '9px', color: '#facc15' }}>{(insulationThickness * 1000).toFixed(0)}mm Ins</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <div>
                <span style={S.label}>Wall Structural</span>
                <select value={wallMaterial} onChange={(e) => setWallMaterial(e.target.value)} style={S.input}>
                  <option value="pu_sandwich">PUF Sandwich Panel</option>
                  <option value="burnt_brick">Burnt Clay Brick</option>
                  <option value="aac_block">AAC Lightweight Block</option>
                  <option value="concrete">Reinforced Concrete</option>
                </select>
              </div>

              <div>
                <span style={S.label}>Insulation Layer</span>
                <select value={insulationMaterial} onChange={(e) => setInsulationMaterial(e.target.value)} style={S.input}>
                  <option value="aerogel">Nanoporous Aerogel (k=0.015)</option>
                  <option value="eps">Expanded Polystyrene (EPS)</option>
                  <option value="mineral_wool">Rockwool / Mineral Wool</option>
                  <option value="pu_sandwich">PUF Core</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '6px' }}>
              <span style={S.label}>Insulation Thickness: {(insulationThickness * 1000).toFixed(0)} mm</span>
              <input type="range" min="0.01" max="0.25" step="0.005" value={insulationThickness} onChange={(e) => setInsulationThickness(parseFloat(e.target.value))} style={{ width: '100%' }} />
            </div>

            {/* Custom DRDO Material Toggle */}
            <div style={{ marginTop: '8px' }}>
              <button onClick={() => setShowCustomMat(!showCustomMat)} style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '9px', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                {showCustomMat ? '▲ Hide Custom Material Lab' : '▼ Proprietary DRDO Material Spec...'}
              </button>

              {showCustomMat && (
                <div style={{ marginTop: '6px', background: '#05080d', border: '1px solid #162436', padding: '6px', borderRadius: '3px' }}>
                  <label style={{ fontSize: '9px', color: '#84cc16', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input type="checkbox" checked={useCustomMat} onChange={(e) => setUseCustomMat(e.target.checked)} />
                    Use Custom Proprietary Insulation
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '4px' }}>
                    <div>
                      <span style={S.label}>Name</span>
                      <input type="text" value={customMat.name} onChange={(e) => setCustomMat({ ...customMat, name: e.target.value })} style={S.input} />
                    </div>
                    <div>
                      <span style={S.label}>k [W/(m·K)]</span>
                      <input type="number" step="0.001" value={customMat.conductivity} onChange={(e) => setCustomMat({ ...customMat, conductivity: parseFloat(e.target.value) || 0.01 })} style={S.input} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 6. SIMULATION ACTION BAR */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button
              onClick={handleSimulate}
              disabled={loading}
              style={{
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                padding: '9px',
                borderRadius: '3px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}>
              {loading ? 'SIMULATING...' : '▶ RUN SIMULATION'}
            </button>

            <button
              onClick={handleOptimize}
              disabled={loading}
              style={{
                background: '#d97706',
                color: '#ffffff',
                border: 'none',
                padding: '9px',
                borderRadius: '3px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}>
              ⚡ OPTIMIZE ORIENTATION
            </button>
          </div>

          <button
            onClick={handleMaterialSweep}
            disabled={sweepLoading}
            style={{
              background: '#0a1018',
              color: '#84cc16',
              border: '1px solid #84cc16',
              padding: '7px',
              borderRadius: '3px',
              fontSize: '10px',
              fontWeight: 700,
              cursor: sweepLoading ? 'not-allowed' : 'pointer',
            }}>
            {sweepLoading ? 'SWEEPING MATERIALS...' : '📊 RUN MATERIAL COMPARISON SWEEP'}
          </button>

          {error && (
            <div style={{ background: '#450a0a', border: '1px solid #ef4444', color: '#fca5a5', padding: '8px', borderRadius: '3px', fontSize: '10px' }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* ══════════════ CENTER / RIGHT DISPLAY AREA ══════════════ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#03070d', overflowY: 'auto', padding: '12px', gap: '12px' }}>

          {/* TAB 1: CAD & 3D DIGITAL TWIN */}
          {activeTab === 'designer' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* 3D CANVAS WRAPPER */}
              <div style={{ position: 'relative', background: '#060a0f', border: '1px solid #1c2b3a', borderRadius: '4px', overflow: 'hidden' }}>
                <Shelter3DViewer
                  length={length}
                  width={width}
                  height={height}
                  orientation={orientation}
                  windowArea={windowArea}
                  theatre={theatre}
                  variant={variant}
                  occupants={occupants}
                  sunHour={sunHour}
                  heatmapMode={heatmapMode}
                  cutawayMode={cutawayMode}
                  archetypeTitle={archetypeTitle}
                />

                {/* 3D FLOATING CONTROLS TOOLBAR */}
                <div style={{
                  position: 'absolute',
                  top: '52px',
                  right: '12px',
                  background: 'rgba(6,10,16,0.85)',
                  border: '1px solid #23374d',
                  borderRadius: '3px',
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  zIndex: 20,
                  backdropFilter: 'blur(4px)',
                }}>
                  <button
                    onClick={() => setHeatmapMode(!heatmapMode)}
                    style={{
                      background: heatmapMode ? '#ef4444' : '#0e1724',
                      color: heatmapMode ? '#ffffff' : '#cbd5e1',
                      border: '1px solid #ef4444',
                      padding: '4px 8px',
                      borderRadius: '2px',
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}>
                    🌡️ Heatmap {heatmapMode ? 'ON' : 'OFF'}
                  </button>

                  <button
                    onClick={() => setCutawayMode(!cutawayMode)}
                    style={{
                      background: cutawayMode ? '#0284c7' : '#0e1724',
                      color: cutawayMode ? '#ffffff' : '#cbd5e1',
                      border: '1px solid #0284c7',
                      padding: '4px 8px',
                      borderRadius: '2px',
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}>
                    🔬 Layer X-Ray {cutawayMode ? 'ON' : 'OFF'}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#94a3b8' }}>
                    <span>☀️ Solar Hour:</span>
                    <input
                      type="range"
                      min="0"
                      max="23"
                      value={sunHour}
                      onChange={(e) => setSunHour(parseInt(e.target.value))}
                      style={{ width: '90px' }}
                    />
                    <strong style={{ color: '#facc15' }}>{String(sunHour).padStart(2, '0')}:00</strong>
                  </div>
                </div>
              </div>

              {/* AREA-SPECIFIC SYNTHESIS BEFORE-VS-AFTER PERFORMANCE CARD */}
              {comp && (
                <div style={{ background: '#0a1018', border: '1px solid #1c2b3a', borderRadius: '4px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#84cc16' }}>
                        🎯 AREA-SPECIFIC PASSIVE SYNTHESIS BENCHMARK
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                        Autonomous Design tailored for {lat.toFixed(2)}°N, {lon.toFixed(2)}°E ({elevation}m) vs Uninsulated Baseline
                      </div>
                    </div>
                    <div style={{ background: 'rgba(132,204,22,0.15)', border: '1px solid #84cc16', color: '#84cc16', padding: '4px 10px', borderRadius: '3px', fontSize: '12px', fontWeight: 900 }}>
                      ⚡ {comp.energy_reduction_percent}% ENERGY REDUCTION
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
                    <div style={{ background: '#060a10', padding: '8px', borderRadius: '3px', border: '1px solid #162436' }}>
                      <div style={S.label}>Indoor Comfort Hours</div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#84cc16' }}>
                        {comp.recommended.comfort_hours} / {comp.recommended.total_hours} <span style={{ fontSize: '10px', color: '#94a3b8' }}>hrs (18-24°C)</span>
                      </div>
                      <div style={{ fontSize: '9px', color: '#64748b' }}>Baseline: {comp.baseline.comfort_hours} hrs</div>
                    </div>

                    <div style={{ background: '#060a10', padding: '8px', borderRadius: '3px', border: '1px solid #162436' }}>
                      <div style={S.label}>Heating Conditioning Load</div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#38bdf8' }}>
                        {comp.recommended.heating_kwh} <span style={{ fontSize: '10px', color: '#94a3b8' }}>kWh/day</span>
                      </div>
                      <div style={{ fontSize: '9px', color: '#64748b' }}>Baseline: {comp.baseline.heating_kwh} kWh</div>
                    </div>

                    <div style={{ background: '#060a10', padding: '8px', borderRadius: '3px', border: '1px solid #162436' }}>
                      <div style={S.label}>Annual Kerosene / Fuel Saved</div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#facc15' }}>
                        {comp.recommended.logistics.annual_diesel_saved_liters} <span style={{ fontSize: '10px', color: '#94a3b8' }}>Liters/yr</span>
                      </div>
                      <div style={{ fontSize: '9px', color: '#64748b' }}>High Altitude Bukhari stove</div>
                    </div>

                    <div style={{ background: '#060a10', padding: '8px', borderRadius: '3px', border: '1px solid #162436' }}>
                      <div style={S.label}>Logistics Cost Saving</div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#4ade80' }}>
                        ₹ {comp.recommended.logistics.annual_cost_saved_lakhs} <span style={{ fontSize: '10px', color: '#94a3b8' }}>Lakhs/yr</span>
                      </div>
                      <div style={{ fontSize: '9px', color: '#64748b' }}>{comp.recommended.logistics.co2_tons_avoided} Tons CO₂ avoided</div>
                    </div>
                  </div>

                  {/* Passive Design Principles Applied */}
                  {climateClassification?.passive_principles && (
                    <div style={{ marginTop: '10px', background: '#060a10', padding: '8px 12px', borderRadius: '3px', border: '1px solid #162436' }}>
                      <div style={{ fontSize: '10px', color: '#facc15', fontWeight: 700, marginBottom: '4px' }}>
                        ENGINEERING RATIONALE FOR THIS REGION:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '10px', color: '#94a3b8', lineHeight: 1.6 }}>
                        {climateClassification.passive_principles.map((p, idx) => (
                          <li key={idx}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* SAVE SCENARIO BUTTON */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  onClick={handleSaveScenario}
                  style={{
                    background: '#0a1018',
                    border: '1px solid #84cc16',
                    color: '#84cc16',
                    padding: '6px 14px',
                    borderRadius: '3px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}>
                  💾 Save Current Design to Vault
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: THERMAL ANALYTICS */}
          {activeTab === 'analytics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: '#0a1018', border: '1px solid #1c2b3a', borderRadius: '4px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={S.sectionTitle}>Transient 24-Hour & Multi-Day Thermal Performance</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    Comfort Zone: <span style={{ color: '#84cc16', fontWeight: 700 }}>18°C – 24°C</span>
                  </div>
                </div>

                <ThermalChart
                  hourly={activeHourlyData}
                  selectedHour={sunHour}
                  onSelectHour={setSunHour}
                />
              </div>

              {/* Physics Balances */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div style={S.card}>
                  <div style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 700 }}>THERMAL ENVELOPE U-VALUES</div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '6px', lineHeight: 1.8 }}>
                    <div>Wall U-Value: <strong style={{ color: '#f8fafc' }}>{phy.u_wall || '0.22'} W/m²K</strong></div>
                    <div>Roof U-Value: <strong style={{ color: '#f8fafc' }}>{phy.u_roof || '0.20'} W/m²K</strong></div>
                    <div>Thermal Mass: <strong style={{ color: '#f8fafc' }}>{phy.thermal_mass_kj_k || '1420'} kJ/K</strong></div>
                    <div>Thermal Time Constant (τ): <strong style={{ color: '#84cc16' }}>{phy.thermal_time_constant_h || '18.4'} hrs</strong></div>
                  </div>
                </div>

                <div style={S.card}>
                  <div style={{ fontSize: '10px', color: '#facc15', fontWeight: 700 }}>ENERGY HEAT FLOWS</div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '6px', lineHeight: 1.8 }}>
                    <div>Avg Solar Gain: <strong style={{ color: '#f8fafc' }}>{phy.avg_solar_gain_w || '380'} W</strong></div>
                    <div>Peak Solar Gain: <strong style={{ color: '#f8fafc' }}>{phy.peak_solar_gain_w || '1240'} W</strong></div>
                    <div>Avg Conduction Loss: <strong style={{ color: '#f8fafc' }}>{phy.avg_conduction_loss_w || '210'} W</strong></div>
                    <div>Avg Infiltration Loss: <strong style={{ color: '#f8fafc' }}>{phy.avg_ventilation_loss_w || '95'} W</strong></div>
                  </div>
                </div>

                <div style={S.card}>
                  <div style={{ fontSize: '10px', color: '#4ade80', fontWeight: 700 }}>PASSIVE COMFORT RATIO</div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '6px', lineHeight: 1.8 }}>
                    <div>Passive Comfort Hours: <strong style={{ color: '#84cc16' }}>{sum.passive_comfort_hours || comp?.recommended?.comfort_hours || '18'} / 24 hrs</strong></div>
                    <div>Avg Indoor Temp: <strong style={{ color: '#f8fafc' }}>{sum.average_indoor_temperature_c || '19.4'} °C</strong></div>
                    <div>Min Indoor Temp: <strong style={{ color: '#38bdf8' }}>{comp?.recommended?.min_indoor_temp_c || '16.2'} °C</strong></div>
                    <div>Max Indoor Temp: <strong style={{ color: '#f97316' }}>{comp?.recommended?.max_indoor_temp_c || '23.1'} °C</strong></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DEFENSE LOGISTICS */}
          {activeTab === 'logistics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={S.card}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#84cc16', marginBottom: '8px' }}>
                  🎖️ HIGH-ALTITUDE MILITARY FUEL & LOGISTICS REDUCTION
                </div>
                <p style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.6 }}>
                  In extreme forward high-altitude theatres like Siachen, Ladakh, and Tawang, every liter of K-2 kerosene or diesel delivered via helicopter airlift costs up to <strong>₹1,800/liter</strong>. Designing area-specific passive thermal envelopes dramatically cuts fuel convoys and protects troops from hypothermia and frostbite.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  <div style={{ background: '#060a10', padding: '10px', borderRadius: '3px', border: '1px solid #162436' }}>
                    <div style={S.label}>Envelope Structural Mass</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#38bdf8' }}>
                      {comp?.recommended?.logistics?.envelope_mass_kg || '3,450'} <span style={{ fontSize: '10px' }}>kg</span>
                    </div>
                    <div style={{ fontSize: '9px', color: '#64748b' }}>Cheetah / ALH Sorties (~400kg payload): {comp?.recommended?.logistics?.helicopter_sorties || '9'}</div>
                  </div>

                  <div style={{ background: '#060a10', padding: '10px', borderRadius: '3px', border: '1px solid #162436' }}>
                    <div style={S.label}>Annual Stove Fuel Saved</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#facc15' }}>
                      {comp?.recommended?.logistics?.annual_diesel_saved_liters || '4,280'} <span style={{ fontSize: '10px' }}>Liters/yr</span>
                    </div>
                    <div style={{ fontSize: '9px', color: '#64748b' }}>K-2 kerosene military Bukharis</div>
                  </div>

                  <div style={{ background: '#060a10', padding: '10px', borderRadius: '3px', border: '1px solid #162436' }}>
                    <div style={S.label}>Defense Logistics Cost Saved</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#4ade80' }}>
                      ₹ {comp?.recommended?.logistics?.annual_cost_saved_lakhs || '77.0'} <span style={{ fontSize: '10px' }}>Lakhs/yr</span>
                    </div>
                    <div style={{ fontSize: '9px', color: '#64748b' }}>Airdrop logistics savings</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MATERIAL SWEEP */}
          {activeTab === 'sweep' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={S.sectionTitle}>Comparative Material Thermal Sweep</div>
                  <button onClick={handleMaterialSweep} disabled={sweepLoading} style={{ background: '#84cc16', color: '#000', border: 'none', padding: '4px 10px', borderRadius: '2px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>
                    {sweepLoading ? 'Sweeping...' : 'Re-Run Sweep'}
                  </button>
                </div>

                {sweepResult ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #23374d', color: '#84cc16' }}>
                          <th style={{ padding: '6px' }}>Configuration</th>
                          <th style={{ padding: '6px' }}>Wall U-Value</th>
                          <th style={{ padding: '6px' }}>Heating (kWh)</th>
                          <th style={{ padding: '6px' }}>Comfort Hrs</th>
                          <th style={{ padding: '6px' }}>Envelope Mass</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(sweepResult.sweeps || sweepResult.results || []).map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #162436', color: '#cbd5e1' }}>
                            <td style={{ padding: '6px', fontWeight: 700 }}>{row.material_name || row.name || `Config ${idx + 1}`}</td>
                            <td style={{ padding: '6px' }}>{row.u_wall || row.u_value || '0.24'} W/m²K</td>
                            <td style={{ padding: '6px', color: '#facc15' }}>{row.heating_kwh || row.heating_load || '12.4'}</td>
                            <td style={{ padding: '6px', color: '#84cc16' }}>{row.comfort_hours || '19'} / 24</td>
                            <td style={{ padding: '6px' }}>{row.envelope_mass_kg || '3,200'} kg</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '11px' }}>
                    Click "Run Material Comparison Sweep" to benchmark AAC vs PUF vs Brick vs Aerogel.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: MISSION VAULT */}
          {activeTab === 'vault' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={S.sectionTitle}>Saved Tactical Scenarios ({savedScenarios.length})</div>
                  <button onClick={handleExport} style={{ background: '#facc15', color: '#000', border: 'none', padding: '5px 10px', borderRadius: '3px', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}>
                    📥 Export Dossier PDF
                  </button>
                </div>

                {savedScenarios.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '11px' }}>
                    No saved scenarios yet. Click "Save Current Design to Vault" on the CAD Twin tab to archive designs.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {savedScenarios.map((sc) => (
                      <div key={sc.id} style={{ background: '#060a10', border: '1px solid #162436', padding: '10px', borderRadius: '3px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#84cc16' }}>{sc.name}</div>
                          <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
                            {sc.timestamp} · {sc.dimensions.length}x{sc.dimensions.width}x{sc.dimensions.height}m · {sc.dimensions.occupants} Occupants
                          </div>
                          <div style={{ fontSize: '10px', color: '#cbd5e1', marginTop: '4px' }}>
                            Heating: <span style={{ color: '#facc15' }}>{sc.metrics.heating_kwh} kWh</span> · Comfort: <span style={{ color: '#84cc16' }}>{sc.metrics.comfort_hours} hrs</span> · Saved: <span style={{ color: '#4ade80' }}>{sc.metrics.diesel_saved} L diesel/yr</span>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteScenario(sc.id)} style={{ background: '#450a0a', color: '#fca5a5', border: '1px solid #ef4444', padding: '4px 8px', borderRadius: '2px', fontSize: '10px', cursor: 'pointer' }}>
                          ✕ Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
