/**
 * Military-grade PDF mission report export.
 * Opens a print-optimised HTML page in a new window and triggers window.print().
 * No additional libraries needed — pure browser API.
 */

export function exportMissionReport({
  locationName,
  lat,
  lon,
  theatre,
  simResult,
  optResult,
  simDays,
  shelter,
  materials,
  insulationThickness,
  windowArea,
  doorArea,
}) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour12: false });

  const phy = simResult?.physics || {};
  const sum = simResult?.summary || {};

  const wallLayersTable = (phy.wall_layers || [])
    .map(
      (lyr, i) =>
        `<tr>
          <td>Layer ${i + 1}</td>
          <td>${lyr.name}</td>
          <td>${lyr.thickness_mm} mm</td>
          <td>${lyr.k} W/(m·K)</td>
          <td>${lyr.r} m²K/W</td>
        </tr>`
    )
    .join('');

  const hourlyRows = (simResult?.hourly?.hour || [])
    .filter((_, i) => i % Math.max(1, Math.floor((simResult.hourly.hour.length) / 12)) === 0)
    .map((h) => {
      const idx = simResult.hourly.hour.indexOf(h);
      return `<tr>
        <td>${String(h % 24).padStart(2, '0')}:00${h >= 24 ? ` (D${Math.floor(h / 24) + 1})` : ''}</td>
        <td>${simResult.hourly.indoor_temperature[idx]} °C</td>
        <td>${simResult.hourly.outdoor_temperature[idx]} °C</td>
        <td>${simResult.hourly.solar_gain[idx]} W</td>
        <td>${simResult.hourly.heat_loss[idx]} W</td>
        <td>${simResult.hourly.heating_demand[idx]} W</td>
      </tr>`;
    })
    .join('');

  const optSection = optResult
    ? `
    <h2>5. OPTIMISATION & DEFENSE LOGISTICS</h2>
    <table>
      <tr><th>Parameter</th><th>Baseline</th><th>Recommended</th></tr>
      <tr><td>Total Conditioning Energy</td><td>${optResult.comparison?.baseline_total_kwh} kWh</td><td>${optResult.comparison?.recommended_total_kwh} kWh</td></tr>
      <tr><td>Energy Saving</td><td colspan="2"><strong>${optResult.comparison?.energy_saved_percentage}%</strong></td></tr>
      <tr><td>Optimal Orientation</td><td colspan="2">${optResult.recommended_design?.orientation_degrees}°</td></tr>
      <tr><td>Optimal Insulation Thickness</td><td colspan="2">${((optResult.recommended_design?.insulation_thickness_m || 0) * 1000).toFixed(0)} mm</td></tr>
      <tr><td>Envelope Mass</td><td colspan="2">${optResult.recommended_design?.envelope_mass_kg} kg</td></tr>
      <tr><td>Helicopter Sorties (Cheetah/Dhruv)</td><td colspan="2">${optResult.recommended_design?.helicopter_sorties}</td></tr>
      <tr><td>Annual Diesel Saved</td><td colspan="2">${optResult.comparison?.recommended_logistics?.annual_diesel_saved_liters} L</td></tr>
      <tr><td>Annual Logistics Cost Saved</td><td colspan="2">₹ ${optResult.comparison?.recommended_logistics?.annual_cost_saved_lakhs} Lakhs</td></tr>
      <tr><td>CO₂ Emission Avoidance</td><td colspan="2">${optResult.comparison?.recommended_logistics?.co2_tons_avoided} Tons/yr</td></tr>
    </table>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DRDO SPSD Mission Report — ${locationName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 10pt;
      color: #111;
      background: #fff;
      padding: 20mm 18mm;
      line-height: 1.5;
    }
    .classification {
      text-align: center;
      color: #8b0000;
      font-weight: bold;
      font-size: 9pt;
      letter-spacing: 4pt;
      border: 1.5px solid #8b0000;
      padding: 3pt 0;
      margin-bottom: 14pt;
    }
    .header-block {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #000;
      padding-bottom: 10pt;
      margin-bottom: 12pt;
    }
    .logo-block { font-size: 8pt; color: #333; }
    .logo-block .org { font-size: 13pt; font-weight: bold; letter-spacing: 1pt; color: #000; }
    .logo-block .sub { font-size: 9pt; }
    .doc-meta { text-align: right; font-size: 9pt; color: #333; }
    .doc-meta .ref { font-size: 11pt; font-weight: bold; }
    h1 { font-size: 13pt; border-bottom: 2px solid #000; padding-bottom: 5pt; margin: 14pt 0 8pt; text-transform: uppercase; letter-spacing: 1pt; }
    h2 { font-size: 11pt; border-bottom: 1px solid #666; padding-bottom: 3pt; margin: 12pt 0 6pt; text-transform: uppercase; letter-spacing: 0.5pt; }
    table { width: 100%; border-collapse: collapse; margin: 6pt 0 10pt; font-size: 9pt; }
    th, td { border: 1px solid #bbb; padding: 4pt 7pt; vertical-align: top; }
    th { background: #ebebeb; font-weight: bold; text-align: left; }
    tr:nth-child(even) td { background: #f9f9f9; }
    .highlight { background: #fff3cd !important; font-weight: bold; }
    .formula-box {
      background: #f4f4f4;
      border-left: 3px solid #333;
      padding: 6pt 10pt;
      margin: 5pt 0;
      font-family: monospace;
      font-size: 10pt;
    }
    .formula-box .eq { font-size: 11pt; font-weight: bold; color: #000; }
    .formula-box .vals { font-size: 9pt; color: #444; margin-top: 3pt; }
    .formula-box .result { font-size: 10pt; font-weight: bold; color: #8b0000; margin-top: 4pt; }
    .formula-box .ref { font-size: 8pt; color: #666; margin-top: 3pt; font-style: italic; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12pt; margin: 6pt 0; }
    .footer {
      margin-top: 20pt;
      border-top: 1px solid #999;
      padding-top: 8pt;
      font-size: 8pt;
      color: #555;
      display: flex;
      justify-content: space-between;
    }
    .sig-block { margin-top: 24pt; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20pt; }
    .sig { border-top: 1px solid #000; padding-top: 4pt; font-size: 9pt; }
    @media print {
      body { padding: 15mm 13mm; }
      .no-print { display: none; }
      h1, h2 { page-break-after: avoid; }
      table { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

<div class="classification">UNCLASSIFIED // FOR OFFICIAL USE ONLY // DRDO-SPSD</div>

<div class="header-block">
  <div class="logo-block">
    <div class="org">DRDO — SMART PASSIVE SHELTER DESIGNER</div>
    <div class="sub">Defence Research & Development Organisation</div>
    <div class="sub">Ministry of Defence, Government of India</div>
    <div class="sub">SIH Problem Statement No. 26051</div>
  </div>
  <div class="doc-meta">
    <div class="ref">SPSD/SIM/RPT/${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}</div>
    <div>Date: ${dateStr}</div>
    <div>Time: ${timeStr} IST</div>
    <div>Engine: ISO 13790 / ASHRAE 2021</div>
  </div>
</div>

<h1>Passive Shelter Thermal Analysis — Mission Report</h1>

<h2>1. Mission Parameters</h2>
<table>
  <tr><th>Parameter</th><th>Value</th></tr>
  <tr><td>Deployment Location</td><td><strong>${locationName}</strong></td></tr>
  <tr><td>Coordinates</td><td>${lat}°N, ${lon}°E</td></tr>
  <tr><td>Theatre Classification</td><td>${theatre.toUpperCase()}</td></tr>
  <tr><td>Simulation Period</td><td>${simDays} day(s) — ${simDays * 24} hours</td></tr>
  <tr><td>Analysis Method</td><td>ISO 13790:2008 Hourly Method + ASHRAE Fundamentals 2021</td></tr>
  <tr><td>Climate Data Source</td><td>Open-Meteo Live Forecast API (real-time, location-specific)</td></tr>
</table>

<h2>2. Shelter Specification</h2>
<table>
  <tr><th>Parameter</th><th>Value</th></tr>
  <tr><td>Dimensions (L × W × H)</td><td>${shelter.length} m × ${shelter.width} m × ${shelter.height} m</td></tr>
  <tr><td>Floor Area</td><td>${(shelter.length * shelter.width).toFixed(1)} m²</td></tr>
  <tr><td>Volume</td><td>${phy.volume_m3 ?? (shelter.length * shelter.width * shelter.height).toFixed(1)} m³</td></tr>
  <tr><td>Orientation (front azimuth)</td><td>${shelter.orientation}° from North</td></tr>
  <tr><td>Occupants</td><td>${shelter.occupants} persons</td></tr>
  <tr><td>Air Changes per Hour</td><td>${shelter.ach}</td></tr>
  <tr><td>Window Area</td><td>${windowArea} m²</td></tr>
  <tr><td>Door Area</td><td>${doorArea} m²</td></tr>
  <tr><td>Wall / Structural Material</td><td>${materials.wall}</td></tr>
  <tr><td>Insulation Material</td><td>${materials.insulation} (${(insulationThickness * 1000).toFixed(0)} mm)</td></tr>
  <tr><td>Floor Material</td><td>${materials.floor}</td></tr>
</table>

<h2>3. Physics Calculations (ISO 6946 / ASHRAE)</h2>

<h3 style="font-size:10pt; margin: 8pt 0 4pt;">3.1 Wall Thermal Resistance Breakdown</h3>
<div class="formula-box">
  <div class="eq">R_total = R_si + Σ(dᵢ / kᵢ) + R_se &nbsp; [m²·K/W]</div>
  <div class="vals">R_si = ${phy.r_si ?? 0.13} m²K/W (interior surface film, ISO 6946 Table 7)</div>
  <div class="vals">R_se = ${phy.r_se ?? 0.04} m²K/W (exterior surface film, ISO 6946 Table 7)</div>
  <div class="result">R_wall,total = ${phy.r_wall} m²K/W &nbsp;→&nbsp; U_wall = ${phy.u_wall} W/(m²·K)</div>
  <div class="ref">Ref: ISO 6946:2017 §6 — Building Components &amp; Building Elements</div>
</div>
<table>
  <tr><th>#</th><th>Layer</th><th>Thickness</th><th>k [W/(m·K)]</th><th>R [m²K/W]</th></tr>
  <tr><td>—</td><td>Interior surface film (R_si)</td><td>—</td><td>—</td><td>${phy.r_si ?? 0.13}</td></tr>
  ${wallLayersTable}
  <tr><td>—</td><td>Exterior surface film (R_se)</td><td>—</td><td>—</td><td>${phy.r_se ?? 0.04}</td></tr>
  <tr class="highlight"><td colspan="4"><strong>TOTAL R_wall</strong></td><td><strong>${phy.r_wall}</strong></td></tr>
</table>

<div class="two-col">
  <div>
    <div class="formula-box">
      <div class="eq">Q_cond = U × A × ΔT &nbsp; [W]</div>
      <div class="vals">U = ${phy.u_wall} W/(m²·K)</div>
      <div class="vals">A_net_wall = ${phy.wall_area_m2} m²</div>
      <div class="vals">ΔT_avg = ${phy.avg_delta_T_c} °C</div>
      <div class="result">Q_cond,avg = ${phy.avg_conduction_loss_w} W</div>
      <div class="ref">Ref: ASHRAE Fund. Ch. 27, Fourier's Law of Heat Conduction</div>
    </div>
  </div>
  <div>
    <div class="formula-box">
      <div class="eq">Q_solar = SHGC × A_win × I_avg &nbsp; [W]</div>
      <div class="vals">SHGC = ${phy.window_shgc ?? 0.82} (standard clear glazing)</div>
      <div class="vals">A_window = ${phy.window_area_m2} m²</div>
      <div class="result">Q_solar,avg = ${phy.avg_solar_gain_w} W (peak: ${phy.peak_solar_gain_w} W)</div>
      <div class="ref">Ref: ASHRAE Fundamentals 2021 Ch. 15 — Fenestration</div>
    </div>
  </div>
</div>

<div class="formula-box">
  <div class="eq">τ = C_eff / (UA_total + H_vent) &nbsp; [hours] — Thermal Survival Window</div>
  <div class="vals">C_eff = ${phy.thermal_mass_kj_k} kJ/K (ISO 13790 Annex G effective thermal mass)</div>
  <div class="vals">ACH = ${phy.ach} /hr (air changes per hour)</div>
  <div class="result">τ = ${phy.thermal_time_constant_h} hours — Shelter maintains liveable temperature for ~${Math.round((phy.thermal_time_constant_h ?? 0) * 0.5)} hrs without external heating</div>
  <div class="ref">Ref: ISO 13790:2008 Annex G; ISO 13786:2017</div>
</div>

<h2>4. Thermal Analysis Results (${simDays * 24}-Hour Simulation)</h2>
<table>
  <tr><th>KPI</th><th>Value</th><th>Note</th></tr>
  <tr><td>Average Indoor Temperature</td><td><strong>${sum.average_indoor_temperature_c} °C</strong></td><td>Free-running passive temperature</td></tr>
  <tr><td>Passive Comfort Hours</td><td><strong>${sum.passive_comfort_hours} / ${sum.total_hours} hrs</strong></td><td>Within 18–25 °C comfort band</td></tr>
  <tr><td>Total Heating Requirement</td><td><strong>${sum.heating_requirement_kwh} kWh</strong></td><td>To maintain 18 °C minimum</td></tr>
  <tr><td>Total Cooling Requirement</td><td><strong>${sum.cooling_requirement_kwh} kWh</strong></td><td>To maintain 25 °C maximum</td></tr>
  <tr><td>Peak Heating Load</td><td>${sum.peak_heating_load_w} W</td><td>Instantaneous peak demand</td></tr>
  <tr><td>Thermal Time Constant</td><td>${sum.thermal_time_constant_hours} hrs</td><td>Envelope thermal inertia</td></tr>
  <tr><td>Wall U-value</td><td>${phy.u_wall} W/(m²·K)</td><td>ISO 6946 composite R-value</td></tr>
  <tr><td>Roof U-value</td><td>${phy.u_roof} W/(m²·K)</td><td></td></tr>
  <tr><td>Avg Solar Gain</td><td>${phy.avg_solar_gain_w} W</td><td>Opaque + glazing combined</td></tr>
  <tr><td>Avg Conduction Loss</td><td>${phy.avg_conduction_loss_w} W</td><td>Through all envelope surfaces</td></tr>
  <tr><td>Avg Ventilation Loss</td><td>${phy.avg_ventilation_loss_w} W</td><td>Air exchange at ACH = ${phy.ach}</td></tr>
</table>

<h3 style="font-size:10pt; margin: 8pt 0 4pt;">4.1 Hourly Temperature Profile (sampled)</h3>
<table>
  <tr><th>Hour</th><th>Indoor Temp (°C)</th><th>Outdoor Temp (°C)</th><th>Solar Gain (W)</th><th>Heat Loss (W)</th><th>Heating Demand (W)</th></tr>
  ${hourlyRows}
</table>

${optSection}

<h2>${optResult ? '6' : '5'}. Standards & References</h2>
<table>
  <tr><th>Standard / Source</th><th>Application</th></tr>
  <tr><td>ISO 13790:2008</td><td>Hourly energy calculation method for thermal comfort</td></tr>
  <tr><td>ISO 6946:2017</td><td>Thermal resistance and transmittance — Building components</td></tr>
  <tr><td>ISO 13786:2017</td><td>Thermal performance — Dynamic thermal characteristics</td></tr>
  <tr><td>ASHRAE Fundamentals 2021 Ch. 14</td><td>Climatic design information</td></tr>
  <tr><td>ASHRAE Fundamentals 2021 Ch. 15</td><td>Fenestration — Solar heat gain</td></tr>
  <tr><td>ASHRAE Fundamentals 2021 Ch. 27</td><td>Heat, Air, and Moisture Control — Fundamentals</td></tr>
  <tr><td>Duffie & Beckman — Solar Engineering (4th ed.)</td><td>Solar declination, hour angle, irradiance on tilted surfaces</td></tr>
  <tr><td>Liu & Jordan (1963)</td><td>Isotropic diffuse radiation model for tilted surfaces</td></tr>
  <tr><td>DRDO Extreme Cold Habitat Standard</td><td>Aerogel blanket properties; high-altitude shelter norms</td></tr>
  <tr><td>Open-Meteo Forecast API</td><td>Real-time hourly climate data (temperature, solar radiation, wind)</td></tr>
</table>

<div class="sig-block">
  <div class="sig">
    <div>Prepared by</div>
    <div style="margin-top:24pt; font-weight:bold;">________________</div>
    <div>DRDO SPSD System</div>
  </div>
  <div class="sig">
    <div>Reviewed by</div>
    <div style="margin-top:24pt; font-weight:bold;">________________</div>
    <div>Technical Authority</div>
  </div>
  <div class="sig">
    <div>Approved by</div>
    <div style="margin-top:24pt; font-weight:bold;">________________</div>
    <div>Station Commander</div>
  </div>
</div>

<div class="footer">
  <div>DRDO Smart Passive Shelter Designer — SIH 26051 // Auto-generated ${dateStr} ${timeStr} IST</div>
  <div>UNCLASSIFIED // FOR OFFICIAL USE ONLY</div>
</div>

</body>
</html>`;

  const reportWindow = window.open('', '_blank', 'width=900,height=700');
  if (!reportWindow) {
    alert('Please allow pop-ups for this site to generate the report.');
    return;
  }
  reportWindow.document.open();
  reportWindow.document.write(html);
  reportWindow.document.close();
  setTimeout(() => reportWindow.print(), 600);
}
