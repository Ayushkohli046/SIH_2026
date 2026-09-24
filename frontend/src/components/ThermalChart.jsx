import React, { useState } from 'react';

/**
 * ThermalChart - Interactive 24-Hour Physics Performance Telemetry Chart
 * Built for SIH 26051 DRDO Smart Passive Shelter Designer.
 * Renders SVG curves for Outdoor vs Indoor temperature against the 18°C-25°C comfort band,
 * with synchronized solar gain and hour scrubbing for the 3D digital twin.
 */
export default function ThermalChart({ hourly, selectedHour = 12, onSelectHour }) {
  const [hoverHour, setHoverHour] = useState(null);

  if (!hourly || !hourly.hour || hourly.hour.length === 0) {
    return (
      <div style={{
        height: '210px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#04070a',
        border: '1px dashed #1c2b20',
        borderRadius: '4px',
        color: '#64748b',
        fontSize: '11px',
        fontFamily: 'monospace'
      }}>
        Run simulation or optimization to generate 24h thermal curves
      </div>
    );
  }

  const hours = hourly.hour;
  const tIn = hourly.indoor_temperature;
  const tOut = hourly.outdoor_temperature;
  const solar = hourly.solar_gain || [];

  // Determine scale bounds
  const allTemps = [...tIn, ...tOut, 18, 25];
  const minTemp = Math.floor(Math.min(...allTemps) - 3);
  const maxTemp = Math.ceil(Math.max(...allTemps) + 3);
  const tempRange = Math.max(10, maxTemp - minTemp);

  const maxSolar = Math.max(100, ...(solar.length > 0 ? solar : [1000]));

  const chartW = 560;
  const chartH = 190;
  const padL = 42;
  const padR = 24;
  const padT = 20;
  const padB = 28;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const getX = (h) => padL + (h / 23) * plotW;
  const getY = (temp) => padT + plotH - ((temp - minTemp) / tempRange) * plotH;
  const getSolarY = (watts) => padT + plotH - (watts / maxSolar) * (plotH * 0.35);

  // Comfort band coordinates
  const yComfortTop = getY(25);
  const yComfortBottom = getY(18);
  const comfortH = Math.max(2, yComfortBottom - yComfortTop);

  // Build SVG Paths
  const indoorPath = tIn.map((t, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(t).toFixed(1)}`).join(' ');
  const outdoorPath = tOut.map((t, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(t).toFixed(1)}`).join(' ');

  // Active highlighted hour
  const activeH = hoverHour !== null ? hoverHour : selectedHour;
  const activeX = getX(activeH);

  return (
    <div style={{
      background: '#05090e',
      border: '1px solid #162436',
      borderRadius: '4px',
      padding: '10px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      {/* Header & Legend */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <strong style={{ color: '#84cc16', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            24H Dynamic Thermal Curve
          </strong>
          <span style={{ color: '#64748b', fontSize: '10px', fontFamily: 'monospace' }}>
            [ISO 13790 Physics]
          </span>
        </div>

        {/* Legend Pills */}
        <div style={{ display: 'flex', gap: '10px', fontSize: '10px', fontFamily: 'monospace' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '3px', background: '#84cc16', borderRadius: '1px' }}></span>
            <span style={{ color: '#84cc16' }}>Indoor T_in</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '2px', background: '#38bdf8', borderBottom: '1px dashed #38bdf8' }}></span>
            <span style={{ color: '#38bdf8' }}>Outdoor T_out</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', background: 'rgba(34, 197, 94, 0.25)', border: '1px solid #22c55e' }}></span>
            <span style={{ color: '#22c55e' }}>Comfort Band (18-25°C)</span>
          </div>
        </div>
      </div>

      {/* SVG Plot */}
      <div style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          onMouseLeave={() => setHoverHour(null)}
        >
          <defs>
            <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="indoorGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#84cc16" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#84cc16" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y-ticks */}
          {[-30, -20, -10, 0, 10, 18, 25, 35].filter(t => t >= minTemp && t <= maxTemp).map((t, idx) => (
            <g key={idx}>
              <line
                x1={padL}
                y1={getY(t)}
                x2={chartW - padR}
                y2={getY(t)}
                stroke={t === 0 ? '#334155' : '#0f172a'}
                strokeWidth={t === 0 ? 1.5 : 1}
                strokeDasharray={t === 0 ? 'none' : '2,2'}
              />
              <text
                x={padL - 6}
                y={getY(t) + 3}
                fill="#64748b"
                fontSize="9"
                fontFamily="monospace"
                textAnchor="end"
              >
                {t}°
              </text>
            </g>
          ))}

          {/* Military Comfort Band Rectangle (18°C to 25°C) */}
          {minTemp <= 25 && maxTemp >= 18 && (
            <rect
              x={padL}
              y={yComfortTop}
              width={plotW}
              height={comfortH}
              fill="rgba(34, 197, 94, 0.10)"
              stroke="rgba(34, 197, 94, 0.35)"
              strokeWidth="1"
              strokeDasharray="4,3"
            />
          )}

          {/* Solar Gain bars */}
          {solar.map((w, h) => {
            const barW = Math.max(3, (plotW / 24) - 3);
            const barX = getX(h) - barW / 2;
            const barH = (w / maxSolar) * (plotH * 0.35);
            return (
              <rect
                key={h}
                x={barX}
                y={padT + plotH - barH}
                width={barW}
                height={barH}
                fill="url(#solarGrad)"
                opacity={0.7}
              />
            );
          })}

          {/* Outdoor Temperature Line */}
          <path
            d={outdoorPath}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.8"
            strokeDasharray="4,3"
            opacity="0.85"
          />

          {/* Indoor Temperature Line */}
          <path
            d={indoorPath}
            fill="none"
            stroke="#84cc16"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* X-axis Ticks (Hours) */}
          {[0, 3, 6, 9, 12, 15, 18, 21, 23].map((h) => (
            <text
              key={h}
              x={getX(h)}
              y={chartH - 8}
              fill={h === activeH ? '#84cc16' : '#64748b'}
              fontSize="9"
              fontFamily="monospace"
              textAnchor="middle"
              fontWeight={h === activeH ? '700' : '400'}
            >
              {h}:00
            </text>
          ))}

          {/* Interactive Scrub Cursor Line */}
          <line
            x1={activeX}
            y1={padT}
            x2={activeX}
            y2={padT + plotH}
            stroke="#84cc16"
            strokeWidth="1.5"
            strokeDasharray="3,3"
          />

          {/* Active Points on curves */}
          <circle cx={activeX} cy={getY(tIn[activeH])} r="4" fill="#84cc16" stroke="#03070d" strokeWidth="1.5" />
          <circle cx={activeX} cy={getY(tOut[activeH])} r="3.5" fill="#38bdf8" stroke="#03070d" strokeWidth="1.5" />

          {/* Invisible interactive hover rects per hour */}
          {hours.map((h) => {
            const segW = plotW / 24;
            return (
              <rect
                key={h}
                x={getX(h) - segW / 2}
                y={padT}
                width={segW}
                height={plotH}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => {
                  setHoverHour(h);
                  if (onSelectHour) onSelectHour(h);
                }}
                onClick={() => {
                  if (onSelectHour) onSelectHour(h);
                }}
              />
            );
          })}
        </svg>

        {/* Floating Telemetry Box for Active Hour */}
        <div style={{
          marginTop: '6px',
          background: '#090f17',
          border: '1px solid #1e293b',
          borderRadius: '3px',
          padding: '6px 10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'monospace',
          fontSize: '11px'
        }}>
          <div>
            <span style={{ color: '#94a3b8' }}>TIMELINE: </span>
            <strong style={{ color: '#84cc16' }}>{activeH}:00h</strong>
            <span style={{ color: '#64748b', marginLeft: '6px' }}>(Click curve to align 3D sun position)</span>
          </div>

          <div style={{ display: 'flex', gap: '14px' }}>
            <div>
              <span style={{ color: '#64748b' }}>T_IN: </span>
              <strong style={{ color: '#84cc16' }}>{tIn[activeH]?.toFixed(1)}°C</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>T_OUT: </span>
              <strong style={{ color: '#38bdf8' }}>{tOut[activeH]?.toFixed(1)}°C</strong>
            </div>
            {solar[activeH] !== undefined && (
              <div>
                <span style={{ color: '#64748b' }}>SOLAR: </span>
                <strong style={{ color: '#f59e0b' }}>{solar[activeH]?.toFixed(0)} W</strong>
              </div>
            )}
            <div>
              <span style={{
                fontSize: '9px',
                padding: '2px 6px',
                borderRadius: '2px',
                background: tIn[activeH] >= 18 && tIn[activeH] <= 25 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: tIn[activeH] >= 18 && tIn[activeH] <= 25 ? '#22c55e' : '#ef4444',
                fontWeight: 700
              }}>
                {tIn[activeH] >= 18 && tIn[activeH] <= 25 ? 'PASSIVE COMFORT' : (tIn[activeH] < 18 ? 'HEATING REQUIRED' : 'COOLING REQUIRED')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
