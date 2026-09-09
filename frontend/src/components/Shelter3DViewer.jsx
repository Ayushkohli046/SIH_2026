import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Shelter3DViewer - DRDO SIH 26051 Distinct Area-Specific Digital Twin
 * Engineering-grade military CAD visualization for Smart Passive Shelter Designer.
 * Built by Person 4 (Optimization & 3D Integration).
 */
export default function Shelter3DViewer({
  length = 10,
  width = 8,
  height = 3,
  orientation = 180,
  windowArea = 5,
  theatre = 'siachen', // 'siachen' | 'ladakh' | 'thar'
  occupants = 8
}) {
  const mountRef = useRef(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const bays = occupants <= 4 ? 1 : (occupants <= 8 ? 2 : 3);
    const scene = new THREE.Scene();

    const skyColors = {
      siachen: 0x05090f,
      ladakh: 0x080c10,
      thar: 0x120e08
    };
    scene.background = new THREE.Color(skyColors[theatre] || 0x05090f);

    const widthPx = currentMount.clientWidth || 600;
    const heightPx = currentMount.clientHeight || 450;
    const camera = new THREE.PerspectiveCamera(45, widthPx / heightPx, 0.1, 1000);
    // View from front-quarter facing the South facade
    camera.position.set(14, 11, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(widthPx, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    currentMount.appendChild(renderer.domElement);

    // Prevent page scroll when zooming on canvas
    const onWheel = (e) => e.preventDefault();
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 4;
    controls.maxDistance = 80;
    controls.target.set(0, 2.2, 0);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xfffaed, 2.0);
    sun.position.set(25, 40, 25);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.bias = -0.0004;
    scene.add(sun);

    const hemi = new THREE.HemisphereLight(0x7dd3fc, 0xe2e8f0, 0.45);
    hemi.position.set(0, 50, 0);
    scene.add(hemi);

    // Ground Plane
    const groundColors = {
      siachen: 0xe5eef5,
      ladakh: 0x3d352b,
      thar: 0xb5925e
    };
    const groundMat = new THREE.MeshStandardMaterial({
      color: groundColors[theatre] || 0xe5eef5,
      roughness: 0.95
    });
    const terrain = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), groundMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);

    // North Indicator Arrow (pointing along -Z)
    scene.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0.05, 0), 8, 0xef4444, 1.8, 1.0));

    const shelterGroup = new THREE.Group();
    scene.add(shelterGroup);

    // Materials
    const camoColors = {
      siachen: 0xdde6ed,
      ladakh: 0x303f26,
      thar: 0xd2b588
    };
    const panelMat = new THREE.MeshStandardMaterial({ color: camoColors[theatre] || 0xdde6ed, roughness: 0.65, metalness: 0.2 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.35 });
    const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.4 });
    const aluMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9, roughness: 0.25 });
    const solarMat = new THREE.MeshStandardMaterial({ color: 0x102a43, roughness: 0.12, metalness: 0.9 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });

    // Helper: Gabled Roof Geometry
    function createGableRoofGeometry(rLen, rWidth, rHeight) {
      const shape = new THREE.Shape();
      shape.moveTo(-rWidth / 2, 0);
      shape.lineTo(0, rHeight);
      shape.lineTo(rWidth / 2, 0);
      shape.closePath();
      const geom = new THREE.ExtrudeGeometry(shape, { steps: 1, depth: rLen, bevelEnabled: false });
      geom.center();
      geom.rotateY(Math.PI / 2);
      return geom;
    }

    // Helper: Solar PV Module with Anodized Aluminum Casing Frame
    function createDetailedSolarModule(widthM, heightM) {
      const group = new THREE.Group();
      const face = new THREE.Mesh(new THREE.PlaneGeometry(widthM - 0.06, heightM - 0.06), solarMat);
      face.rotation.x = -Math.PI / 2;
      face.position.y = 0.025;
      face.castShadow = true;
      group.add(face);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(widthM, 0.04, heightM), aluMat);
      frame.castShadow = true;
      group.add(frame);
      return group;
    }

    // =====================================================================
    // 1. SIACHEN GLACIER: HEAVY SNOW CRIB + 55° SLANTED SOUTH SOLAR ROOF
    // =====================================================================
    if (theatre === 'siachen') {
      const pylonH = 1.4;
      const nPylonsX = Math.max(3, bays + 2);

      // Pylons & Snowshoes
      for (let ix = 0; ix <= nPylonsX; ix++) {
        for (let iz = 0; iz < 3; iz++) {
          const px = -length / 2 + (ix * length) / nPylonsX;
          const pz = -width / 2 + (iz * width) / 2;

          const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.20, pylonH, 8), steelMat);
          pylon.position.set(px, pylonH / 2, pz);
          pylon.castShadow = true;
          shelterGroup.add(pylon);

          const shoe = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.60, 0.14, 8), steelMat);
          shoe.position.set(px, 0.07, pz);
          shoe.receiveShadow = true;
          shelterGroup.add(shoe);
        }
      }

      // X-Braces between front pylons
      for (let ix = 0; ix < nPylonsX; ix++) {
        const x1 = -length / 2 + (ix * length) / nPylonsX;
        const x2 = -length / 2 + ((ix + 1) * length) / nPylonsX;
        const pz = width / 2;
        const diagLen = Math.hypot(x2 - x1, pylonH);
        const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, diagLen, 6), steelMat);
        b1.position.set((x1 + x2) / 2, pylonH / 2, pz);
        b1.rotation.z = Math.atan2(pylonH, x2 - x1);
        shelterGroup.add(b1);

        const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, diagLen, 6), steelMat);
        b2.position.set((x1 + x2) / 2, pylonH / 2, pz);
        b2.rotation.z = -Math.atan2(pylonH, x2 - x1);
        shelterGroup.add(b2);
      }

      // Chassis & Deck
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(length + 0.8, 0.25, width + 0.8), darkSteelMat);
      chassis.position.set(0, pylonH + 0.125, 0);
      shelterGroup.add(chassis);

      const deck = new THREE.Mesh(new THREE.BoxGeometry(length + 1.2, 0.18, width + 1.2), steelMat);
      deck.position.set(0, pylonH + 0.25 + 0.09, 0);
      deck.castShadow = true;
      shelterGroup.add(deck);

      // Walls
      const walls = new THREE.Mesh(new THREE.BoxGeometry(length, height, width), panelMat);
      walls.position.set(0, pylonH + 0.35 + height / 2, 0);
      walls.castShadow = true;
      walls.receiveShadow = true;
      shelterGroup.add(walls);

      // 55° Gable Roof
      const roofPeakH = 2.0;
      const roofGeom = createGableRoofGeometry(length + 0.6, width + 0.8, roofPeakH);
      const roof = new THREE.Mesh(roofGeom, panelMat);
      roof.position.set(0, pylonH + 0.35 + height + roofPeakH / 2, 0);
      roof.castShadow = true;
      shelterGroup.add(roof);

      // 55° Slanted Solar Panels on South Roof Slope
      const slopeHalfW = (width + 0.8) / 2;
      const slantHypot = Math.hypot(slopeHalfW, roofPeakH);
      const slantAngle = Math.atan2(roofPeakH, slopeHalfW); // ~55°
      const nSolarCols = Math.max(4, bays * 2);
      const modWidth = (length * 0.92) / nSolarCols;
      const modHeight = slantHypot * 0.44;

      const solarGroup = new THREE.Group();
      for (let row = 0; row < 2; row++) {
        const tFactor = (row === 0) ? 0.30 : 0.74;
        const py = roofPeakH * (1 - tFactor) + 0.08;
        const pz = slopeHalfW * tFactor + 0.04;

        for (let col = 0; col < nSolarCols; col++) {
          const px = -length * 0.46 + (col + 0.5) * modWidth;
          const mod = createDetailedSolarModule(modWidth * 0.90, modHeight * 0.92);
          mod.position.set(px, py, pz);
          mod.rotation.x = slantAngle;
          solarGroup.add(mod);
        }
      }
      solarGroup.position.set(0, pylonH + 0.35 + height, 0);
      shelterGroup.add(solarGroup);

      // Slanted Ground/Deck Solar Rack (55° tilt)
      const groundSolar = new THREE.Group();
      const gMods = Math.max(3, bays + 1);
      const gModW = 1.3;
      const rackTilt = THREE.MathUtils.degToRad(55);
      for (let i = 0; i < gMods; i++) {
        const gx = -length * 0.35 + i * (gModW + 0.15);
        const p = createDetailedSolarModule(gModW, 1.8);
        p.position.set(gx, 0.75, 0);
        p.rotation.x = -rackTilt;
        groundSolar.add(p);
      }
      groundSolar.position.set(-length * 0.08, pylonH + 0.35, width / 2 + 1.2);
      shelterGroup.add(groundSolar);

      // Airlock & Industrial Staircase
      const alMesh = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.3, 2.2), panelMat);
      alMesh.position.set(length * 0.35, pylonH + 0.35 + 1.15, width / 2 + 1.1);
      alMesh.castShadow = true;
      shelterGroup.add(alMesh);

      const door = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.0), steelMat);
      door.position.set(length * 0.35, pylonH + 0.35 + 1.0, width / 2 + 2.22);
      shelterGroup.add(door);

      const nSteps = 6;
      for (let s = 0; s < nSteps; s++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.35), steelMat);
        step.position.set(length * 0.35, (s + 0.5) * ((pylonH + 0.35) / nSteps), width / 2 + 2.2 + 0.35 + (nSteps - s) * 0.35);
        step.castShadow = true;
        shelterGroup.add(step);
      }
    }
    // =====================================================================
    // 2. LADAKH: BASALT BED + TROMBE WALL + 45° ROOF SOLAR RACK
    // =====================================================================
    else if (theatre === 'ladakh') {
      const bedH = 0.5;
      const bed = new THREE.Mesh(new THREE.BoxGeometry(length + 1.0, bedH, width + 1.0), new THREE.MeshStandardMaterial({ color: 0x271e16 }));
      bed.position.set(0, bedH / 2, 0);
      shelterGroup.add(bed);

      const walls = new THREE.Mesh(new THREE.BoxGeometry(length, height, width), panelMat);
      walls.position.set(0, bedH + height / 2, 0);
      walls.castShadow = true;
      walls.receiveShadow = true;
      shelterGroup.add(walls);

      const roofPeakH = 1.4;
      const roofGeom = createGableRoofGeometry(length + 0.4, width + 0.6, roofPeakH);
      const roof = new THREE.Mesh(roofGeom, panelMat);
      roof.position.set(0, bedH + height + roofPeakH / 2, 0);
      roof.castShadow = true;
      shelterGroup.add(roof);

      // 45° Rooftop Solar Rack
      const nPanels = Math.max(4, bays * 2);
      const rackGroup = new THREE.Group();
      const pW = (length * 0.85) / nPanels;
      for (let i = 0; i < nPanels; i++) {
        const p = createDetailedSolarModule(pW * 0.9, 1.6);
        p.position.set(-length * 0.4 + (i + 0.5) * pW, 0.8, 0);
        p.rotation.x = -Math.PI / 4;
        rackGroup.add(p);
      }
      rackGroup.position.set(0, bedH + height + 0.3, width * 0.15);
      shelterGroup.add(rackGroup);

      // Trombe Solar Glazing
      const winW = Math.min(length * 0.55, Math.sqrt(windowArea) * 1.3);
      const winH = Math.min(height * 0.7, windowArea / Math.max(winW, 0.1));
      const win = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), new THREE.MeshStandardMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.75 }));
      win.position.set(length * 0.05, bedH + height / 2, width / 2 + 0.02);
      shelterGroup.add(win);
    }
    // =====================================================================
    // 3. THAR DESERT: SAND PLINTH + DUAL BADGIR WIND-TOWERS + CHHAJJA
    // =====================================================================
    else if (theatre === 'thar') {
      const plinthH = 0.3;
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(length + 1.2, plinthH, width + 1.2), new THREE.MeshStandardMaterial({ color: 0x8a6336 }));
      plinth.position.set(0, plinthH / 2, 0);
      shelterGroup.add(plinth);

      const walls = new THREE.Mesh(new THREE.BoxGeometry(length, height, width), panelMat);
      walls.position.set(0, plinthH + height / 2, 0);
      walls.castShadow = true;
      walls.receiveShadow = true;
      shelterGroup.add(walls);

      const roof = new THREE.Mesh(new THREE.BoxGeometry(length + 0.6, 0.25, width + 0.6), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
      roof.position.set(0, plinthH + height + 0.125, 0);
      shelterGroup.add(roof);

      // Wind-Towers
      [-length * 0.25, length * 0.25].forEach(tx => {
        const tower = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.8, 1.3), panelMat);
        tower.position.set(tx, plinthH + height + 0.9, 0);
        tower.castShadow = true;
        shelterGroup.add(tower);
      });

      // Chhajja Overhang
      const chhajja = new THREE.Mesh(new THREE.BoxGeometry(length * 0.85, 0.08, 1.2), new THREE.MeshStandardMaterial({ color: 0x9a3412 }));
      chhajja.position.set(0, plinthH + height * 0.88, width / 2 + 0.6);
      chhajja.rotation.x = 0.18;
      shelterGroup.add(chhajja);
    }

    // Orientation Azimuth: 180° = South (+Z, facing camera)
    const azimuthAngle = THREE.MathUtils.degToRad(180 - orientation);
    shelterGroup.rotation.y = azimuthAngle;

    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!currentMount) return;
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement) {
        renderer.domElement.removeEventListener('wheel', onWheel);
      }
      if (currentMount && renderer.domElement) currentMount.removeChild(renderer.domElement);
    };
  }, [length, width, height, orientation, windowArea, theatre, occupants]);

  return (
    <div style={{ width: '100%', height: '480px', position: 'relative', borderRadius: '3px', overflow: 'hidden', border: '1px solid #1c2b20' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '12px',
        background: 'rgba(6, 10, 15, 0.94)',
        border: '1px solid #1c2b20',
        borderLeft: '3px solid #84cc16',
        color: '#e2e8f0',
        padding: '8px 12px',
        borderRadius: '2px',
        fontSize: '11px',
        fontFamily: 'monospace',
        lineHeight: '1.4',
        pointerEvents: 'none'
      }}>
        <strong style={{ color: '#84cc16' }}>DRDO SIH 26051 // {theatre.toUpperCase()}</strong><br />
        Foundation: {theatre === 'siachen' ? 'Steel Snow Truss Crib (Elevated 1.4m)' : (theatre === 'ladakh' ? 'Basalt Stone Bed' : 'Sand Plinth')}<br />
        Solar Array: {theatre === 'siachen' ? '55° Slanted South Roof + Deck Racks' : (theatre === 'ladakh' ? '45° Rooftop PV + South Trombe' : 'Badgir Wind Towers + Cool Roof')}<br />
        Controls: Left-click + drag to orbit &bull; Scroll to zoom &bull; Red vector = North
      </div>
    </div>
  );
}
