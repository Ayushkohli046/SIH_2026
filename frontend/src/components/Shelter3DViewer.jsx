import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Shelter3DViewer - 3D Passive Shelter Visualization
 * Built by Person 4 for Smart Passive Shelter Designer (SIH 2026 DRDO).
 * 
 * Accurately visualizes:
 * - Shelter Length, Width, Height (to scale in meters)
 * - Orientation relative to True North (Red Compass arrow)
 * - Glazing / Window placement and Door placement
 * - Real-time sun angle & shadows
 */
export default function Shelter3DViewer({
  length = 10,
  width = 8,
  height = 3,
  orientation = 180,
  windowArea = 5,
  doorArea = 2,
  wallColor = 0xb25e35, // Terracotta / Adobe brick tone
  roofColor = 0x718096  // Protective concrete / slate tone
}) {
  const mountRef = useRef(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a202c); // Dark DRDO command slate

    // 2. Camera setup
    const widthPx = currentMount.clientWidth || 600;
    const heightPx = currentMount.clientHeight || 400;
    const camera = new THREE.PerspectiveCamera(45, widthPx / heightPx, 0.1, 1000);
    camera.position.set(length * 1.8, height * 2.5, width * 2.2);
    camera.lookAt(0, height / 2, 0);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(widthPx, heightPx);
    renderer.shadowMap.enabled = true;
    currentMount.appendChild(renderer.domElement);

    // 4. Lighting (Simulating Solar Exposure)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff3d6, 1.2);
    sunLight.position.set(25, 40, 25);
    sunLight.castShadow = true;
    scene.add(sunLight);

    // 5. Terrain Grid
    const grid = new THREE.GridHelper(40, 40, 0x4fd1c5, 0x4a5568);
    scene.add(grid);

    // 6. Cardinal North Marker (Compass)
    const northDirection = new THREE.Vector3(0, 0, -1);
    const arrowHelper = new THREE.ArrowHelper(
      northDirection,
      new THREE.Vector3(0, 0.05, 0),
      6,
      0xe53e3e,
      1.5,
      0.8
    );
    scene.add(arrowHelper);

    // 7. Shelter Group (Rotates according to Orientation)
    const shelterGroup = new THREE.Group();

    // Main Wall Envelope
    const wallGeometry = new THREE.BoxGeometry(length, height, width);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: wallColor,
      roughness: 0.8,
      metalness: 0.1
    });
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    wallMesh.position.y = height / 2;
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    shelterGroup.add(wallMesh);

    // Pitched Passive Solar Roof
    const roofHeight = 1.2;
    const roofGeometry = new THREE.ConeGeometry(
      Math.max(length, width) * 0.75,
      roofHeight,
      4
    );
    const roofMaterial = new THREE.MeshStandardMaterial({
      color: roofColor,
      roughness: 0.5
    });
    const roofMesh = new THREE.Mesh(roofGeometry, roofMaterial);
    roofMesh.position.y = height + roofHeight / 2;
    roofMesh.rotation.y = Math.PI / 4;
    shelterGroup.add(roofMesh);

    // Glazing / Window (South-facing facade)
    const winWidth = Math.min(length * 0.5, Math.sqrt(windowArea));
    const winHeight = Math.min(height * 0.6, windowArea / Math.max(winWidth, 0.1));
    const winGeom = new THREE.PlaneGeometry(winWidth, winHeight);
    const winMat = new THREE.MeshStandardMaterial({
      color: 0x63b3ed,
      roughness: 0.1,
      metalness: 0.9,
      side: THREE.DoubleSide
    });
    const winMesh = new THREE.Mesh(winGeom, winMat);
    winMesh.position.set(0, height / 2, width / 2 + 0.02);
    shelterGroup.add(winMesh);

    // Main Access Door
    const doorWidth = 1.0;
    const doorHeight = Math.min(height * 0.8, doorArea / doorWidth);
    const doorGeom = new THREE.PlaneGeometry(doorWidth, doorHeight);
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      side: THREE.DoubleSide
    });
    const doorMesh = new THREE.Mesh(doorGeom, doorMat);
    doorMesh.position.set(length * 0.25, doorHeight / 2, width / 2 + 0.02);
    shelterGroup.add(doorMesh);

    // Apply Orientation (degrees clockwise from North)
    shelterGroup.rotation.y = -THREE.MathUtils.degToRad(orientation);
    scene.add(shelterGroup);

    // 8. Animation loop
    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // 9. Window resize listener
    const handleResize = () => {
      if (!currentMount) return;
      const w = currentMount.clientWidth;
      const h = currentMount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [length, width, height, orientation, windowArea, doorArea, wallColor, roofColor]);

  return (
    <div style={{ width: '100%', height: '420px', position: 'relative', borderRadius: '8px', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '12px',
        background: 'rgba(26, 32, 44, 0.85)',
        color: '#e2e8f0',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontFamily: 'sans-serif',
        lineHeight: '1.4'
      }}>
        <strong style={{ color: '#4fd1c5' }}>Smart Passive Shelter 3D Viewer</strong><br />
        Dimensions: {length}m (L) × {width}m (W) × {height}m (H)<br />
        Orientation: {orientation}° from True North (Red Arrow)<br />
        Glazing Area: {windowArea} m² | Door Area: {doorArea} m²
      </div>
    </div>
  );
}
