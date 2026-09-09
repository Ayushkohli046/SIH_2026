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
  variant = 'alpha',   // 'alpha' | 'beta' | 'gamma'
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
    camera.position.set(16, 9.5, 20);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(widthPx, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    currentMount.appendChild(renderer.domElement);

    const onWheel = (e) => e.preventDefault();
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 4;
    controls.maxDistance = 80;
    controls.target.set(0, 1.4, 0);

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

    const groundColors = {
      siachen: 0xe5eef5,
      ladakh: 0x3d352b,
      thar: 0xb5925e
    };
    const groundMat = new THREE.MeshStandardMaterial({
      color: groundColors[theatre] || 0xe5eef5,
      roughness: 0.95,
      metalness: 0.05
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    scene.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0.05, 0), 8, 0xef4444, 1.8, 1.0));

    const shelterGroup = new THREE.Group();
    scene.add(shelterGroup);

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

    function createQuonsetArchGeometry(rLen, rWidth, archH) {
      const shape = new THREE.Shape();
      const halfW = rWidth / 2;
      const segments = 48;
      shape.moveTo(halfW, 0);
      for (let i = 1; i <= segments; i++) {
        const theta = (i / segments) * Math.PI;
        const x = halfW * Math.cos(theta);
        const y = archH * Math.sin(theta);
        shape.lineTo(x, y);
      }
      shape.lineTo(halfW, 0);
      shape.closePath();
      const geom = new THREE.ExtrudeGeometry(shape, { steps: 1, depth: rLen, bevelEnabled: false });
      geom.center();
      geom.rotateY(Math.PI / 2);
      return geom;
    }

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

    function createGroundedMilitaryStairs(startX, startY, startZ, endX, endZ, widthM, nSteps, stepMat, metalMat) {
      const g = new THREE.Group();
      const run = Math.hypot(endX - startX, endZ - startZ);
      const rise = startY;
      const diagLen = Math.hypot(run, rise);
      const angleY = Math.atan2(endX - startX, endZ - startZ);
      const pitch = Math.atan2(rise, run);
      const halfW = widthM / 2;

      [-halfW, halfW].forEach(offsetLat => {
        const stringer = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, diagLen), metalMat);
        stringer.position.set(
          (startX + endX) / 2 + offsetLat * Math.cos(angleY),
          rise / 2,
          (startZ + endZ) / 2 - offsetLat * Math.sin(angleY)
        );
        stringer.rotation.y = angleY;
        stringer.rotation.x = pitch;
        stringer.castShadow = true;
        g.add(stringer);

        const basePlate = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.28), metalMat);
        basePlate.position.set(
          endX + offsetLat * Math.cos(angleY),
          0.02,
          endZ - offsetLat * Math.sin(angleY)
        );
        g.add(basePlate);

        const aug = new THREE.Mesh(
          new THREE.CylinderGeometry(0.035, 0.01, 0.4, 6),
          new THREE.MeshStandardMaterial({ color: 0x84cc16, metalness: 0.9 })
        );
        aug.position.set(endX + offsetLat * Math.cos(angleY), -0.15, endZ - offsetLat * Math.sin(angleY));
        g.add(aug);
      });

      for (let i = 0; i < nSteps; i++) {
        const t = (i + 0.5) / nSteps;
        const px = startX + t * (endX - startX);
        const py = startY * (1 - (i + 1) / (nSteps + 1));
        const pz = startZ + t * (endZ - startZ);

        const step = new THREE.Mesh(new THREE.BoxGeometry(widthM - 0.02, 0.04, 0.28), stepMat);
        step.position.set(px, py, pz);
        step.rotation.y = angleY;
        step.castShadow = true;
        g.add(step);
      }

      [-halfW, halfW].forEach(offsetLat => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, startY, 8), metalMat);
        post.position.set(
          startX + offsetLat * Math.cos(angleY),
          startY / 2,
          startZ - offsetLat * Math.sin(angleY)
        );
        post.castShadow = true;
        g.add(post);

        const shoe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.08, 8), metalMat);
        shoe.position.set(
          startX + offsetLat * Math.cos(angleY),
          0.04,
          startZ - offsetLat * Math.sin(angleY)
        );
        g.add(shoe);
      });

      [-halfW - 0.02, halfW + 0.02].forEach(offsetLat => {
        const topP = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 8), metalMat);
        topP.position.set(startX + offsetLat * Math.cos(angleY), startY + 0.5, startZ - offsetLat * Math.sin(angleY));
        g.add(topP);

        const botP = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 8), metalMat);
        botP.position.set(endX + offsetLat * Math.cos(angleY), 0.5, endZ - offsetLat * Math.sin(angleY));
        g.add(botP);

        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, diagLen, 8), metalMat);
        rail.position.set(
          (startX + endX) / 2 + offsetLat * Math.cos(angleY),
          rise / 2 + 0.95,
          (startZ + endZ) / 2 - offsetLat * Math.sin(angleY)
        );
        rail.rotation.y = angleY;
        rail.rotation.x = pitch;
        g.add(rail);
      });

      return g;
    }

    // =====================================================================
    // 1. SIACHEN GLACIER (ARCTIC)
    // =====================================================================
    if (theatre === 'siachen') {
      if (variant === 'alpha') {
        const pylonH = 1.4;
        const nPylonsX = Math.max(3, bays + 2);

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

            const auger = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.01, 0.6, 6), new THREE.MeshStandardMaterial({ color: 0x84cc16, metalness: 0.9 }));
            auger.position.set(px, -0.25, pz);
            shelterGroup.add(auger);
          }
        }

        const chassis = new THREE.Mesh(new THREE.BoxGeometry(length + 0.8, 0.25, width + 0.8), darkSteelMat);
        chassis.position.set(0, pylonH + 0.125, 0);
        shelterGroup.add(chassis);

        const deck = new THREE.Mesh(new THREE.BoxGeometry(length + 1.2, 0.18, width + 1.2), steelMat);
        deck.position.set(0, pylonH + 0.25 + 0.09, 0);
        deck.castShadow = true;
        shelterGroup.add(deck);

        const walls = new THREE.Mesh(new THREE.BoxGeometry(length, height, width), panelMat);
        walls.position.set(0, pylonH + 0.35 + height / 2, 0);
        walls.castShadow = true;
        walls.receiveShadow = true;
        shelterGroup.add(walls);

        const roofPeakH = 2.0;
        const roofGeom = createGableRoofGeometry(length + 0.6, width + 0.8, roofPeakH);
        const roof = new THREE.Mesh(roofGeom, panelMat);
        roof.position.set(0, pylonH + 0.35 + height + roofPeakH / 2, 0);
        roof.castShadow = true;
        shelterGroup.add(roof);

        // Dual-Slope Solar
        const slopeHalfW = (width + 0.8) / 2;
        const slantHypot = Math.hypot(slopeHalfW, roofPeakH);
        const slantAngle = Math.atan2(roofPeakH, slopeHalfW);
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

            const modN = createDetailedSolarModule(modWidth * 0.90, modHeight * 0.92);
            modN.position.set(px, py, -pz);
            modN.rotation.x = -slantAngle;
            solarGroup.add(modN);
          }
        }
        solarGroup.position.set(0, pylonH + 0.35 + height, 0);
        shelterGroup.add(solarGroup);

        const alMesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.3, 1.3), panelMat);
        alMesh.position.set(length * 0.35, pylonH + 0.35 + 1.15, width / 2 + 0.65);
        alMesh.castShadow = true;
        shelterGroup.add(alMesh);

        const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.95, 0.06), steelMat);
        doorLeaf.position.set(length * 0.35 - 0.15, pylonH + 0.35 + 1.0, width / 2 + 1.05);
        doorLeaf.rotation.y = THREE.MathUtils.degToRad(35);
        shelterGroup.add(doorLeaf);

        // Realistic Grounded Access Landing & Stairs (Option A)
        const landW = 1.4;
        const landD = 1.0;
        const landY = pylonH + 0.35;
        const landZ = width / 2 + 1.3 + landD / 2;
        const landX = length * 0.35;

        const landing = new THREE.Mesh(new THREE.BoxGeometry(landW, 0.12, landD), darkSteelMat);
        landing.position.set(landX, landY - 0.06, landZ);
        landing.castShadow = true;
        shelterGroup.add(landing);

        [-landW / 2 + 0.12, landW / 2 - 0.12].forEach(lx => {
          const lPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, landY, 8), steelMat);
          lPost.position.set(landX + lx, landY / 2, landZ + landD / 2 - 0.1);
          lPost.castShadow = true;
          shelterGroup.add(lPost);

          const lShoe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.08, 8), darkSteelMat);
          lShoe.position.set(landX + lx, 0.04, landZ + landD / 2 - 0.1);
          shelterGroup.add(lShoe);
        });

        const stairsA = createGroundedMilitaryStairs(
          landX, landY, landZ + landD / 2,
          landX, landZ + landD / 2 + 2.4,
          1.2, 6, steelMat, steelMat
        );
        shelterGroup.add(stairsA);

      } else if (variant === 'beta') {
        // Option B: Blizzard-Vault Quonset Arch
        const archHeight = height * 0.95;
        const skidH = 0.35;

        const skid = new THREE.Mesh(new THREE.BoxGeometry(length + 0.8, skidH, width + 0.8), darkSteelMat);
        skid.position.set(0, skidH / 2, 0);
        shelterGroup.add(skid);

        for (let ix = -1; ix <= 1; ix++) {
          [-width / 2 - 0.3, width / 2 + 0.3].forEach(pz => {
            const aug = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.01, 0.75, 6), new THREE.MeshStandardMaterial({ color: 0x84cc16, metalness: 0.9 }));
            aug.position.set(ix * (length * 0.42), -0.25, pz);
            shelterGroup.add(aug);

            const shoe = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.30, 0.12, 8), darkSteelMat);
            shoe.position.set(ix * (length * 0.42), 0.06, pz);
            shelterGroup.add(shoe);
          });
        }

        const archGeom = createQuonsetArchGeometry(length, width, archHeight);
        const arch = new THREE.Mesh(archGeom, panelMat);
        arch.position.set(0, skidH + archHeight / 2, 0);
        arch.castShadow = true;
        arch.receiveShadow = true;
        shelterGroup.add(arch);

        // Titanium Structural Arch Rib Rings
        const ribGeom = createQuonsetArchGeometry(0.12, width + 0.12, archHeight + 0.06);
        const nRibs = Math.max(5, bays * 2 + 2);
        for (let i = 0; i <= nRibs; i++) {
          const rx = -length / 2 + (i * length) / nRibs;
          const rib = new THREE.Mesh(ribGeom, steelMat);
          rib.position.set(rx, skidH + (archHeight + 0.06) / 2, 0);
          shelterGroup.add(rib);
        }

        // Curved Solar Panels
        const solarAngles = [
          { theta: Math.PI * 0.30 },
          { theta: Math.PI * 0.42 },
          { theta: Math.PI * 0.58 },
          { theta: Math.PI * 0.70 }
        ];
        solarAngles.forEach(({ theta }) => {
          const pz = (width / 2 + 0.04) * Math.cos(theta);
          const py = skidH + (archHeight + 0.04) * Math.sin(theta);
          const rotX = Math.atan2(archHeight * Math.cos(theta), (width / 2) * Math.sin(theta));

          const pv = createDetailedSolarModule(length * 0.86, 0.95);
          pv.position.set(0, py, pz);
          pv.rotation.x = rotX;
          shelterGroup.add(pv);
        });

        // Realistic Military Arctic Vestibule & Grounded Stairs (Option B)
        const vestW = 1.5;
        const vestD = 1.1;
        const vestH = 2.2;
        const vestX = length / 2 + vestD / 2;
        const vestY = skidH + vestH / 2;

        const vestMesh = new THREE.Mesh(new THREE.BoxGeometry(vestD, vestH, vestW), panelMat);
        vestMesh.position.set(vestX, vestY, 0);
        vestMesh.castShadow = true;
        shelterGroup.add(vestMesh);

        const canopy = new THREE.Mesh(new THREE.BoxGeometry(vestD + 0.25, 0.08, vestW + 0.2), trimMat);
        canopy.position.set(vestX + 0.05, skidH + vestH + 0.04, 0);
        canopy.rotation.z = -0.12;
        shelterGroup.add(canopy);

        const doorW = 0.95;
        const doorH = 1.95;
        const doorThick = 0.08;
        const doorX = length / 2 + vestD + doorThick / 2;
        const doorY = skidH + doorH / 2 + 0.05;

        const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(doorThick, doorH, doorW), steelMat);
        doorPanel.position.set(doorX, doorY, 0);
        doorPanel.castShadow = true;
        shelterGroup.add(doorPanel);

        // Grounded Landing Platform & Flight (Option B)
        const landBW = 1.4;
        const landBD = 0.85;
        const landBY = skidH;
        const landBX = length / 2 + vestD + landBD / 2;

        const platformB = new THREE.Mesh(new THREE.BoxGeometry(landBD, 0.06, landBW), darkSteelMat);
        platformB.position.set(landBX, landBY - 0.03, 0);
        platformB.castShadow = true;
        shelterGroup.add(platformB);

        [-landBW / 2 + 0.12, landBW / 2 - 0.12].forEach(pz => {
          const pPost = new THREE.Mesh(new THREE.BoxGeometry(0.08, landBY, 0.08), steelMat);
          pPost.position.set(landBX + landBD / 2 - 0.1, landBY / 2, pz);
          pPost.castShadow = true;
          shelterGroup.add(pPost);

          const pFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.06, 8), darkSteelMat);
          pFoot.position.set(landBX + landBD / 2 - 0.1, 0.03, pz);
          shelterGroup.add(pFoot);
        });

        const groundPlateX = landBX + landBD / 2 + 0.65;
        const groundFooter = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, landBW), darkSteelMat);
        groundFooter.position.set(groundPlateX, 0.02, 0);
        shelterGroup.add(groundFooter);

        const step1 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, landBW - 0.04), steelMat);
        step1.position.set(landBX + landBD / 2 + 0.30, landBY * 0.5, 0);
        step1.castShadow = true;
        shelterGroup.add(step1);

        [-landBW / 2, landBW / 2].forEach(pz => {
          const stringerLen = Math.hypot(0.65, landBY);
          const strPitch = Math.atan2(landBY, 0.65);
          const stringer = new THREE.Mesh(new THREE.BoxGeometry(stringerLen, 0.12, 0.05), steelMat);
          stringer.position.set(landBX + landBD / 2 + 0.32, landBY / 2, pz);
          stringer.rotation.z = -strPitch;
          shelterGroup.add(stringer);

          const railLen = Math.hypot(groundPlateX - landBX, landBY);
          const railPitch = Math.atan2(landBY, groundPlateX - landBX);
          const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, railLen, 8), aluMat);
          rail.position.set((landBX + groundPlateX) / 2, landBY / 2 + 0.95, pz);
          rail.rotation.z = -railPitch;
          rail.rotation.y = Math.PI / 2;
          shelterGroup.add(rail);
        });

        // Guy-Wires
        for (let ix = -1; ix <= 1; ix += 2) {
          [-width / 2 - 1.8, width / 2 + 1.8].forEach(pz => {
            const topY = skidH + archHeight * 0.78;
            const topZ = (pz > 0 ? 1 : -1) * (width * 0.44);
            const px = ix * (length * 0.35);
            const cableLen = Math.hypot(pz - topZ, topY);
            const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, cableLen, 6), steelMat);
            cable.position.set(px, topY / 2, (topZ + pz) / 2);
            cable.rotation.x = Math.atan2(pz - topZ, topY);
            shelterGroup.add(cable);
          });
        }

      } else if (variant === 'gamma') {
        // High-Clearance Arctic Pod
        const pylonH = 2.0;
        for (let ix = -1; ix <= 1; ix++) {
          [-width / 2, width / 2].forEach(pz => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.24, pylonH, 8), steelMat);
            leg.position.set(ix * (length * 0.45), pylonH / 2, pz);
            shelterGroup.add(leg);
          });
        }

        const chassis = new THREE.Mesh(new THREE.BoxGeometry(length + 0.8, 0.35, width + 0.8), darkSteelMat);
        chassis.position.set(0, pylonH + 0.175, 0);
        shelterGroup.add(chassis);

        const pod = new THREE.Mesh(new THREE.BoxGeometry(length, height, width), panelMat);
        pod.position.set(0, pylonH + 0.35 + height / 2, 0);
        shelterGroup.add(pod);

        // Grounded Boarding Platform & Stairs (Option C)
        const landCW = 1.5;
        const landCD = 1.0;
        const landCY = pylonH + 0.35;
        const landCZ = width / 2 + 1.4 + landCD / 2;
        const landCX = length * 0.36;

        const landingC = new THREE.Mesh(new THREE.BoxGeometry(landCW, 0.14, landCD), darkSteelMat);
        landingC.position.set(landCX, landCY - 0.07, landCZ);
        landingC.castShadow = true;
        shelterGroup.add(landingC);

        [-landCW / 2 + 0.15, landCW / 2 - 0.15].forEach(lx => {
          const cPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, landCY, 8), steelMat);
          cPost.position.set(landCX + lx, landCY / 2, landCZ + landCD / 2 - 0.12);
          cPost.castShadow = true;
          shelterGroup.add(cPost);

          const cShoe = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.25, 0.08, 8), darkSteelMat);
          cShoe.position.set(landCX + lx, 0.04, landCZ + landCD / 2 - 0.12);
          shelterGroup.add(cShoe);
        });

        const stairsC = createGroundedMilitaryStairs(
          landCX, landCY, landCZ + landCD / 2,
          landCX, landCZ + landCD / 2 + 3.0,
          1.2, 8, steelMat, steelMat
        );
        shelterGroup.add(stairsC);

        // Mast with Dual Solar Panels
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.4, 8), aluMat);
        mast.position.set(0, pylonH + 0.35 + height + 1.2, 0);
        shelterGroup.add(mast);

        [-1.2, 1.2].forEach(px => {
          const tP = createDetailedSolarModule(2.0, 1.3);
          tP.position.set(px, pylonH + 0.35 + height + 2.5, 0);
          tP.rotation.x = -Math.PI / 3.5;
          shelterGroup.add(tP);
        });
      }
    }

    // =====================================================================
    // 2. LADAKH HIGH-ALTITUDE MOUNTAIN
    // =====================================================================
    else if (theatre === 'ladakh') {
      const bedH = 0.5;
      const bed = new THREE.Mesh(new THREE.BoxGeometry(length + 1.0, bedH, width + 1.0), new THREE.MeshStandardMaterial({ color: 0x271e16 }));
      bed.position.set(0, bedH / 2, 0);
      shelterGroup.add(bed);

      if (variant === 'alpha') {
        const walls = new THREE.Mesh(new THREE.BoxGeometry(length, height, width), panelMat);
        walls.position.set(0, bedH + height / 2, 0);
        shelterGroup.add(walls);

        const roofGeom = createGableRoofGeometry(length + 0.4, width + 0.6, 1.4);
        const roof = new THREE.Mesh(roofGeom, panelMat);
        roof.position.set(0, bedH + height + 0.7, 0);
        shelterGroup.add(roof);

        const rack = createDetailedSolarModule(length * 0.8, 1.6);
        rack.position.set(0, bedH + height + 0.8, width * 0.15);
        rack.rotation.x = -Math.PI / 4;
        shelterGroup.add(rack);

        const win = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(length * 0.5, 5), height * 0.7), new THREE.MeshStandardMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.75 }));
        win.position.set(-length * 0.12, bedH + height / 2, width / 2 + 0.02);
        shelterGroup.add(win);

        const portal = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.15), trimMat);
        portal.position.set(length * 0.32, bedH + 1.1, width / 2 + 0.05);
        shelterGroup.add(portal);

      } else if (variant === 'beta') {
        const mainW = width - 1.2;
        const mainWalls = new THREE.Mesh(new THREE.BoxGeometry(length, height, mainW), panelMat);
        mainWalls.position.set(0, bedH + height / 2, -0.6);
        shelterGroup.add(mainWalls);

        const solarium = new THREE.Mesh(new THREE.PlaneGeometry(length * 0.7, height * 0.85), new THREE.MeshStandardMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.6 }));
        solarium.position.set(-length * 0.08, bedH + height * 0.45, width / 2);
        shelterGroup.add(solarium);

        const rack = createDetailedSolarModule(length * 0.8, 1.4);
        rack.position.set(0, bedH + height + 0.5, -0.6);
        rack.rotation.x = -Math.PI / 4;
        shelterGroup.add(rack);

      } else if (variant === 'gamma') {
        const walls = new THREE.Mesh(new THREE.BoxGeometry(length + 0.4, height, width + 0.4), panelMat);
        walls.position.set(0, bedH + height / 2, 0);
        shelterGroup.add(walls);

        const earthRoof = new THREE.Mesh(new THREE.BoxGeometry(length + 0.6, 0.4, width + 0.6), new THREE.MeshStandardMaterial({ color: 0x2e3820 }));
        earthRoof.position.set(0, bedH + height + 0.2, 0);
        shelterGroup.add(earthRoof);

        const parapet = new THREE.Mesh(new THREE.BoxGeometry(length + 0.7, 0.4, 0.3), trimMat);
        parapet.position.set(0, bedH + height + 0.4, width / 2 + 0.2);
        shelterGroup.add(parapet);
      }
    }

    // =====================================================================
    // 3. THAR DESERT (BSF)
    // =====================================================================
    else if (theatre === 'thar') {
      const plinthH = 0.3;
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(length + 1.2, plinthH, width + 1.2), new THREE.MeshStandardMaterial({ color: 0x8a6336 }));
      plinth.position.set(0, plinthH / 2, 0);
      shelterGroup.add(plinth);

      if (variant === 'alpha') {
        const walls = new THREE.Mesh(new THREE.BoxGeometry(length, height, width), panelMat);
        walls.position.set(0, plinthH + height / 2, 0);
        shelterGroup.add(walls);

        const roof = new THREE.Mesh(new THREE.BoxGeometry(length + 0.6, 0.25, width + 0.6), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
        roof.position.set(0, plinthH + height + 0.125, 0);
        shelterGroup.add(roof);

        [-length * 0.28, length * 0.28].forEach(tx => {
          const tower = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.0, 1.3), panelMat);
          tower.position.set(tx, plinthH + height + 1.0, 0);
          shelterGroup.add(tower);
        });

        const chhajja = new THREE.Mesh(new THREE.BoxGeometry(length * 0.9, 0.08, 1.3), new THREE.MeshStandardMaterial({ color: 0x9a3412 }));
        chhajja.position.set(0, plinthH + height * 0.88, width / 2 + 0.65);
        chhajja.rotation.x = 0.18;
        shelterGroup.add(chhajja);

      } else if (variant === 'beta') {
        const walls = new THREE.Mesh(new THREE.BoxGeometry(length, height, width), panelMat);
        walls.position.set(0, plinthH + height / 2, 0);
        shelterGroup.add(walls);

        const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 3.2, 16), new THREE.MeshStandardMaterial({ color: 0x18181b }));
        chimney.position.set(0, plinthH + height + 1.6, -width * 0.35);
        shelterGroup.add(chimney);

        [-length * 0.3, length * 0.3].forEach(px => {
          const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.0, 12), new THREE.MeshStandardMaterial({ color: 0xd97706 }));
          pipe.position.set(px, 0.5, width / 2 + 1.1);
          shelterGroup.add(pipe);
        });

      } else if (variant === 'gamma') {
        const walls = new THREE.Mesh(new THREE.BoxGeometry(length, height, width), panelMat);
        walls.position.set(0, plinthH + height / 2, 0);
        shelterGroup.add(walls);

        const canopyRoof = createDetailedSolarModule(length + 1.2, width + 1.4);
        canopyRoof.position.set(0, plinthH + height + 0.8, 0);
        canopyRoof.rotation.x = -0.06;
        shelterGroup.add(canopyRoof);
      }
    }

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
  }, [length, width, height, orientation, windowArea, theatre, variant, occupants]);

  const variantLabels = {
    siachen: {
      alpha: 'Option A: Aero-Ridge Dual-Solar (55° Bifacial Solar Roof & VIP Flat-Pack)',
      beta: 'Option B: Blizzard-Vault Quonset Arch (Cd=0.38 & 225 km/h Hurricane Rating)',
      gamma: 'Option C: Arctic-Pod Autonomous Bunker (72h Zero-Fuel & 40kWh Bio-PCM)'
    },
    ladakh: {
      alpha: 'Option A: Solaris-Trombe Mass (Direct-Gain Trombe Wall & Basalt Bed)',
      beta: 'Option B: Solarium Green-Buffer (Attached Greenhouse & Fresh-Air Preheating)',
      gamma: 'Option C: Rammed-Basalt SCEB Fortress (350mm Ballistic Earth Walls & Turf Roof)'
    },
    thar: {
      alpha: 'Option A: Badgir Wind-Master (Dual Natural Wind-Towers & 1.2m Deep Chhajja)',
      beta: 'Option B: Earth-Air Geothermal Qanat (24°C Subterranean Loop & Solar Chimney)',
      gamma: 'Option C: Kinetic PV Canopy Shield (Double-Skin Parasol Roof & 6.5kW Solar)'
    }
  };

  const activeLabel = (variantLabels[theatre] && variantLabels[theatre][variant]) || variant.toUpperCase();

  return (
    <div style={{ width: '100%', height: '520px', display: 'flex', flexDirection: 'column', borderRadius: '4px', overflow: 'hidden', border: '1px solid #1c2b20', background: '#060a0f' }}>
      {/* Sleek Top CAD Ribbon Bar (Zero Canvas Overlap) */}
      <div style={{
        height: '42px',
        minHeight: '42px',
        background: '#060a0f',
        borderBottom: '1px solid #1c2b20',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        fontSize: '11px',
        fontFamily: 'monospace',
        color: '#e2e8f0',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ background: '#84cc16', color: '#000', fontWeight: 800, padding: '2px 6px', borderRadius: '2px', fontSize: '10px' }}>TEAM HYDRA</span>
          <strong style={{ color: '#84cc16' }}>DRDO CAD &bull; {theatre.toUpperCase()} &bull; {activeLabel}</strong>
        </div>
        <div style={{ color: '#64748b', fontSize: '10px' }}>
          Logistics: <span style={{ color: '#38bdf8' }}>{theatre === 'siachen' ? (occupants <= 4 ? '2.1T • 2 Sorties' : (occupants <= 8 ? '4.4T • 3-4 Sorties' : '7.2T • 5-6 Sorties')) : (theatre === 'ladakh' ? (occupants <= 8 ? '18.8T • 4 ALS Trucks' : '32.5T • 7 Trucks') : (occupants <= 8 ? '9.8T • 2 Tatra Trucks' : '16.4T • 3 Trucks'))}</span>
        </div>
      </div>

      {/* Unobstructed 3D Viewport */}
      <div style={{ flex: 1, position: 'relative', width: '100%', height: 'calc(100% - 42px)' }}>
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
        {/* Minimal Bottom-Left Compass Pill */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'rgba(6, 10, 15, 0.88)',
          border: '1px solid #1c2b20',
          padding: '4px 8px',
          borderRadius: '2px',
          fontSize: '10px',
          fontFamily: 'monospace',
          color: '#94a3b8',
          pointerEvents: 'none'
        }}>
          ORIENTATION: <span style={{ color: '#84cc16' }}>{orientation}°</span> &bull; Red Vector = True North
        </div>
      </div>
    </div>
  );
}
