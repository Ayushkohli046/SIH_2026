import React, { useState, useEffect } from 'react';
import Shelter3DViewer from './components/Shelter3DViewer.jsx';

const API_BASE = 'http://localhost:8000';

const LOCATION_PRESETS = {
  ladakh: { name: 'Leh, Ladakh (High-Altitude Mountain)', lat: 34.15, lon: 77.58, theatre: 'ladakh' },
  siachen: { name: 'Siachen Glacier (Arctic Alpine)', lat: 35.50, lon: 77.00, theatre: 'siachen' },
  thar: { name: 'Longewala, Thar (Hot Arid Desert)', lat: 26.91, lon: 70.91, theatre: 'thar' }
};

export default function App() {
  // Backend connection state
  const [backendStatus, setBackendStatus] = useState('Checking...');
  const [materialsList, setMaterialsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Selected Preset
  const [presetKey, setPresetKey] = useState('ladakh');

  // Shelter specifications (Person 1's inputs)
  const [lat, setLat] = useState(34.15);
  const [lon, setLon] = useState(77.58);
  const [theatre, setTheatre] = useState('ladakh');
  const [variant, setVariant] = useState('alpha');

  const [length, setLength] = useState(10.0);
  const [width, setWidth] = useState(8.0);
  const [height, setHeight] = useState(3.0);
  const [orientation, setOrientation] = useState(180);
  const [occupants, setOccupants] = useState(8);
  const [ach, setAch] = useState(1.0);

  const [wallMaterial, setWallMaterial] = useState('burnt_brick');
  const [roofMaterial, setRoofMaterial] = useState('concrete');
  const [floorMaterial, setFloorMaterial] = useState('concrete');
  const [insulationMaterial, setInsulationMaterial] = useState('eps');
  const [insulationThickness, setInsulationThickness] = useState(0.05);

  const [windowArea, setWindowArea] = useState(5.0);
  const [doorArea, setDoorArea] = useState(2.0);

  // Results State
  const [simResult, setSimResult] = useState(null);
  const [optResult, setOptResult] = useState(null);

  // Check Backend Health & Materials on mount
  useEffect(() => {
    checkHealth();
    fetchMaterials();
  }, []);

  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) {
        const data = await res.json();
        setBackendStatus(data.status === 'ok' ? 'CONNECTED' : 'DEGRADED');
      } else {
        setBackendStatus('OFFLINE');
      }
    } catch {
      setBackendStatus('DISCONNECTED (Start backend on :8000)');
    }
  };

  const fetchMaterials = async () => {
    try {
      const res = await fetch(`${API_BASE}/materials`);
      if (res.ok) {
        const data = await res.json();
        setMaterialsList(data.materials || []);
      }
    } catch {
      // Fallback defaults
      setMaterialsList([
        { id: 'burnt_brick', name: 'Common burnt clay brick', category: 'wall' },
        { id: 'concrete', name: 'Dense concrete', category: 'structure' },
        { id: 'aac_block', name: 'Autoclaved aerated concrete block', category: 'wall' },
        { id: 'eps', name: 'Expanded polystyrene insulation', category: 'insulation' },
        { id: 'mineral_wool', name: 'Mineral wool insulation', category: 'insulation' }
      ]);
    }
  };

  const handlePresetChange = (e) => {
    const key = e.target.value;
    setPresetKey(key);
    if (key !== 'custom' && LOCATION_PRESETS[key]) {
      const p = LOCATION_PRESETS[key];
      setLat(p.lat);
      setLon(p.lon);
      setTheatre(p.theatre);
    }
  };

  // Build Payload
  const getPayload = () => ({
    location: { latitude: parseFloat(lat), longitude: parseFloat(lon) },
    shelter: {
      length: parseFloat(length),
      width: parseFloat(width),
      height: parseFloat(height),
      orientation: parseFloat(orientation),
      occupants: parseInt(occupants, 10),
      ach: parseFloat(ach)
    },
    materials: {
      wall: wallMaterial,
      roof: roofMaterial,
      floor: floorMaterial,
      insulation: insulationMaterial
    },
    insulation_thickness: parseFloat(insulationThickness),
    openings: {
      window_area: parseFloat(windowArea),
      door_area: parseFloat(doorArea)
    }
  });

  // 1. Run Person 3's Physics Simulation
  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getPayload())
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Simulation failed with status ${res.status}`);
      }
      const data = await res.json();
      setSimResult(data.simulation || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Run Person 4's Engineering Optimization
  const handleOptimize = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = getPayload();
      payload.insulation_options = [0.05, 0.075, 0.10, 0.15];
      payload.orientations = [0, 90, 180, 270];

      const res = await fetch(`${API_BASE}/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Optimization failed with status ${res.status}`);
      }
      const data = await res.json();
      setOptResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Apply Recommended Design to 3D Viewer & Sliders
  const handleApplyRecommended = () => {
    if (!optResult || !optResult.recommended_design) return;
    const rec = optResult.recommended_design;
    setOrientation(rec.orientation_degrees);
    setInsulationThickness(rec.insulation_thickness_m);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#03070d', color: '#f8fafc', overflow: 'hidden' }}>
      
      {/* 1. Header Bar */}
      <header style={{
        height: '46px',
        background: '#070d16',
        borderBottom: '1px solid #162436',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ background: '#84cc16', color: '#04070a', fontWeight: 800, fontSize: '11px', padding: '2px 7px', borderRadius: '2px', letterSpacing: '0.05em' }}>
            TEAM HYDRA
          </span>
          <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.04em', color: '#f8fafc' }}>
            SMART PASSIVE SHELTER DESIGNER
          </span>
          <span style={{ fontSize: '11px', color: '#84cc16', fontFamily: 'monospace' }}>
            SIH 26051
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', fontFamily: 'monospace' }}>
          <div>
            API STATUS: <span style={{ color: backendStatus === 'CONNECTED' ? '#84cc16' : '#ef4444', fontWeight: 700 }}>{backendStatus}</span>
          </div>
          <div style={{ color: '#64748b' }}>|</div>
          <div>
            ACTIVE THEATRE: <span style={{ color: '#38bdf8', fontWeight: 700 }}>{theatre.toUpperCase()}</span>
          </div>
        </div>
      </header>

      {/* 2. Main Workspace Split (Left Controls + Center 3D + Right Telemetry) */}
      <main style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Left Column: Form & Design Inputs */}
        <div style={{
          width: '380px',
          background: '#060a10',
          borderRight: '1px solid #162436',
          padding: '14px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          
          {/* Location / Theatre Selector */}
          <div style={{ background: '#0a1018', border: '1px solid #1c2b3a', borderRadius: '4px', padding: '10px' }}>
            <label style={{ fontSize: '11px', color: '#84cc16', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              1. Deployment Location
            </label>
            <select
              value={presetKey}
              onChange={handlePresetChange}
              style={{ width: '100%', marginTop: '6px', background: '#05080d', color: '#f8fafc', border: '1px solid #23374d', padding: '6px', borderRadius: '3px', fontSize: '11px' }}
            >
              <option value="ladakh">Leh, Ladakh (34.15°N, 77.58°E) — High Altitude</option>
              <option value="siachen">Siachen Glacier (35.50°N, 77.00°E) — Arctic Snow</option>
              <option value="thar">Longewala, Thar (26.91°N, 70.91°E) — Hot Desert</option>
              <option value="custom">Custom Coordinates...</option>
            </select>
          </div>

          {/* Sizing Parameters */}
          <div style={{ background: '#0a1018', border: '1px solid #1c2b3a', borderRadius: '4px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '11px', color: '#84cc16', fontWeight: 700, textTransform: 'uppercase' }}>
                2. Shelter Dimensions
              </label>
              <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>{occupants} Occupants</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
              <div>
                <span style={{ fontSize: '10px', color: '#64748b' }}>Length (m)</span>
                <input
                  type="number" step="0.5" value={length} onChange={(e) => setLength(parseFloat(e.target.value) || 1)}
                  style={{ width: '100%', background: '#05080d', color: '#f8fafc', border: '1px solid #23374d', padding: '4px', fontSize: '11px', borderRadius: '3px' }}
                />
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#64748b' }}>Width (m)</span>
                <input
                  type="number" step="0.5" value={width} onChange={(e) => setWidth(parseFloat(e.target.value) || 1)}
                  style={{ width: '100%', background: '#05080d', color: '#f8fafc', border: '1px solid #23374d', padding: '4px', fontSize: '11px', borderRadius: '3px' }}
                />
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#64748b' }}>Height (m)</span>
                <input
                  type="number" step="0.1" value={height} onChange={(e) => setHeight(parseFloat(e.target.value) || 1)}
                  style={{ width: '100%', background: '#05080d', color: '#f8fafc', border: '1px solid #23374d', padding: '4px', fontSize: '11px', borderRadius: '3px' }}
                />
              </div>
            </div>

            {/* Orientation Azimuth */}
            <div style={{ marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8' }}>
                <span>Orientation Azimuth</span>
                <strong style={{ color: '#84cc16' }}>{orientation}° {orientation === 180 ? '[SOUTH]' : orientation === 0 ? '[NORTH]' : orientation === 90 ? '[EAST]' : '[WEST]'}</strong>
              </div>
              <input
                type="range" min="0" max="360" step="5" value={orientation} onChange={(e) => setOrientation(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#84cc16', cursor: 'pointer', marginTop: '4px' }}
              />
            </div>
          </div>

          {/* Materials & Insulation */}
          <div style={{ background: '#0a1018', border: '1px solid #1c2b3a', borderRadius: '4px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', color: '#84cc16', fontWeight: 700, textTransform: 'uppercase' }}>
              3. Envelope & Insulation
            </label>

            <div>
              <span style={{ fontSize: '10px', color: '#64748b' }}>Wall Material</span>
              <select
                value={wallMaterial} onChange={(e) => setWallMaterial(e.target.value)}
                style={{ width: '100%', marginTop: '2px', background: '#05080d', color: '#f8fafc', border: '1px solid #23374d', padding: '5px', borderRadius: '3px', fontSize: '11px' }}
              >
                <option value="burnt_brick">Common burnt clay brick</option>
                <option value="concrete">Dense concrete</option>
                <option value="aac_block">Autoclaved aerated concrete (AAC)</option>
              </select>
            </div>

            <div>
              <span style={{ fontSize: '10px', color: '#64748b' }}>Insulation Layer</span>
              <select
                value={insulationMaterial} onChange={(e) => setInsulationMaterial(e.target.value)}
                style={{ width: '100%', marginTop: '2px', background: '#05080d', color: '#f8fafc', border: '1px solid #23374d', padding: '5px', borderRadius: '3px', fontSize: '11px' }}
              >
                <option value="eps">Expanded Polystyrene (EPS)</option>
                <option value="mineral_wool">Mineral Wool Insulation</option>
              </select>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8' }}>
                <span>Insulation Thickness</span>
                <strong style={{ color: '#38bdf8' }}>{(insulationThickness * 1000).toFixed(0)} mm</strong>
              </div>
              <input
                type="range" min="0.02" max="0.25" step="0.01" value={insulationThickness} onChange={(e) => setInsulationThickness(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer', marginTop: '4px' }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: 'auto' }}>
            <button
              onClick={handleSimulate}
              disabled={loading}
              style={{
                background: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #334155',
                padding: '9px 10px',
                borderRadius: '3px',
                fontWeight: 700,
                fontSize: '11px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              ⚡ RUN SIMULATION
            </button>
            <button
              onClick={handleOptimize}
              disabled={loading}
              style={{
                background: '#84cc16',
                color: '#04070a',
                border: 'none',
                padding: '9px 10px',
                borderRadius: '3px',
                fontWeight: 800,
                fontSize: '11px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              🎯 OPTIMIZE DESIGN
            </button>
          </div>

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '8px', borderRadius: '3px', fontSize: '10px' }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Center: 3D CAD Visualization (Person 4's digital twin) */}
        <div style={{ flex: 1, position: 'relative', background: '#03070d', overflow: 'hidden' }}>
          <Shelter3DViewer
            length={length}
            width={width}
            height={height}
            orientation={orientation}
            windowArea={windowArea}
            theatre={theatre}
            variant={variant}
            occupants={occupants}
          />
        </div>

        {/* Right Column: Engineering Comparison Matrix & Results */}
        <div style={{
          width: '420px',
          background: '#060a10',
          borderLeft: '1px solid #162436',
          padding: '14px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          
          <div style={{ borderBottom: '1px solid #162436', paddingBottom: '6px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#84cc16', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Design Comparison & Optimization Matrix
            </h3>
            <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
              Person 4: Physics-Based Engineering Evaluation
            </p>
          </div>

          {/* Simulation Output Card */}
          {simResult && (
            <div style={{ background: '#0a1018', border: '1px solid #1c2b3a', borderRadius: '4px', padding: '10px' }}>
              <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase' }}>
                Current Simulation Summary
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px', fontFamily: 'monospace', fontSize: '11px' }}>
                <div style={{ background: '#05080d', padding: '6px', borderRadius: '3px' }}>
                  <div style={{ fontSize: '9px', color: '#64748b' }}>HEATING DEMAND</div>
                  <strong style={{ color: '#f87171' }}>{simResult.summary?.heating_requirement_kwh || 0} kWh</strong>
                </div>
                <div style={{ background: '#05080d', padding: '6px', borderRadius: '3px' }}>
                  <div style={{ fontSize: '9px', color: '#64748b' }}>COOLING DEMAND</div>
                  <strong style={{ color: '#38bdf8' }}>{simResult.summary?.cooling_requirement_kwh || 0} kWh</strong>
                </div>
              </div>
            </div>
          )}

          {/* Optimization Results & Comparison Table */}
          {optResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Highlight Card */}
              <div style={{
                background: 'rgba(132, 204, 22, 0.08)',
                border: '1px solid #84cc16',
                borderRadius: '4px',
                padding: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#84cc16' }}>
                    ★ RECOMMENDED OPTIMAL DESIGN
                  </span>
                  <button
                    onClick={handleApplyRecommended}
                    style={{
                      background: '#84cc16',
                      color: '#000',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '10px',
                      padding: '3px 8px',
                      borderRadius: '2px'
                    }}
                  >
                    APPLY TO 3D
                  </button>
                </div>
                <div style={{ marginTop: '6px', fontSize: '11px', lineHeight: '1.4' }}>
                  <div>Orientation: <strong>{optResult.recommended_design.orientation_degrees}°</strong></div>
                  <div>Insulation: <strong>{(optResult.recommended_design.insulation_thickness_m * 1000).toFixed(0)} mm</strong></div>
                  <div>24h Conditioning Energy: <strong style={{ color: '#84cc16' }}>{optResult.recommended_design.total_conditioning_kwh} kWh</strong></div>
                  <div>Energy Saved vs Baseline: <strong style={{ color: '#38bdf8' }}>{optResult.comparison?.energy_saved_percentage}%</strong></div>
                </div>
              </div>

              {/* Design Comparison Matrix Table */}
              <div>
                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                  Evaluated Design Candidates
                </span>
                <table style={{ width: '100%', marginTop: '6px', borderCollapse: 'collapse', fontSize: '10px', fontFamily: 'monospace' }}>
                  <thead>
                    <tr style={{ background: '#090f17', color: '#64748b', textAlign: 'left', borderBottom: '1px solid #162436' }}>
                      <th style={{ padding: '4px' }}>DESIGN</th>
                      <th style={{ padding: '4px' }}>INSUL</th>
                      <th style={{ padding: '4px' }}>AZIMUTH</th>
                      <th style={{ padding: '4px', textAlign: 'right' }}>ENERGY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {optResult.candidates?.slice(0, 6).map((c, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #0d141e', background: i === 0 ? 'rgba(132, 204, 22, 0.05)' : 'transparent' }}>
                        <td style={{ padding: '5px 4px', color: i === 0 ? '#84cc16' : '#f8fafc' }}>
                          {i === 0 ? '★ Recommended' : `Option ${i + 1}`}
                        </td>
                        <td style={{ padding: '5px 4px', color: '#38bdf8' }}>{(c.insulation_thickness_m * 1000).toFixed(0)} mm</td>
                        <td style={{ padding: '5px 4px' }}>{c.orientation_degrees}°</td>
                        <td style={{ padding: '5px 4px', textAlign: 'right', fontWeight: 700, color: i === 0 ? '#84cc16' : '#e2e8f0' }}>
                          {c.total_conditioning_kwh} kWh
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ background: '#080d14', border: '1px dashed #1c2b3a', borderRadius: '4px', padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '11px' }}>
              Click <strong>"OPTIMIZE DESIGN"</strong> to evaluate multiple shelter orientations and insulation thicknesses using Person 3's physics engine.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
