// Joel Iván Juárez León
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ============================================================
// 1. INFO DE LAS PARTES
// ============================================================
const infoPartes = {
  'Maceta': {
    tipo: 'Cilindro',
    desc: 'Recipiente de barro que contiene la tierra y sostiene el rosal.'
  },
  'Tierra': {
    tipo: 'Cilindro plano',
    desc: 'Sustrato con nutrientes donde crecen las raíces.'
  },
  'Tallo': {
    tipo: 'Cilindro',
    desc: 'Transporta agua y nutrientes desde la raíz hasta las flores.'
  },
  'Hoja': {
    tipo: 'Esfera aplanada',
    desc: 'Realiza la fotosíntesis y regula la respiración de la planta.'
  },
  'Flor': {
    tipo: 'Esfera + Pétalos',
    desc: 'Órgano reproductor del rosal. Atrae polinizadores.'
  },
  'Pétalo': {
    tipo: 'Esfera aplanada',
    desc: 'Hojas modificadas que protegen la flor y atraen insectos.'
  },
  'Árbol': {
    tipo: 'Modelo .glb',
    desc: 'Árbol alto que rodea el jardín y delimita el terreno.'
  },
  'Pasto': {
    tipo: 'Modelo .glb',
    desc: 'Pasto decorativo del jardín.'
  }
};

// ============================================================
// 2. ESCENA
// ============================================================
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xdfe8f0, 60, 220);

// ============================================================
// 3. CÁMARA
// ============================================================
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const camaraInicial = new THREE.Vector3(0, 14, 26);
camera.position.copy(camaraInicial);
camera.lookAt(0, 2, -6);

// ============================================================
// 4. RENDERER
// ============================================================
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

// ============================================================
// 5. ORBIT CONTROLS
// ============================================================
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 3;
controls.maxDistance = 80;
controls.target.set(0, 2, -6);

// ============================================================
// 6. LUCES
// ============================================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3a5f3a, 0.3);
scene.add(hemiLight);

const solLight = new THREE.DirectionalLight(0xfff2cc, 1.8);
solLight.position.set(0, 30, -40);
solLight.target.position.set(0, 0, -6);
scene.add(solLight.target);

solLight.castShadow = true;
solLight.shadow.mapSize.width = 2048;
solLight.shadow.mapSize.height = 2048;
solLight.shadow.camera.near = 1;
solLight.shadow.camera.far = 120;
solLight.shadow.camera.left = -50;
solLight.shadow.camera.right = 50;
solLight.shadow.camera.top = 50;
solLight.shadow.camera.bottom = -50;
solLight.shadow.bias = -0.0005;
scene.add(solLight);

const MAX_INTENSIDAD_SOL = 1.8;
let factorDia = 1.0;

// ============================================================
// 6.5 TEXTURE LOADER
// ============================================================
const textureLoader = new THREE.TextureLoader();

// ============================================================
// 7. CIELO
// ============================================================
const skyTexture = textureLoader.load(
  './assets/sky/DaySkyHDRI069B_1K_TONEMAPPED.jpg',
  () => console.log('✅ Cielo cargado'),
  undefined,
  () => console.error('❌ No se encontró el archivo del cielo')
);

skyTexture.mapping = THREE.EquirectangularReflectionMapping;
skyTexture.colorSpace = THREE.SRGBColorSpace;

scene.background = skyTexture;
scene.environment = skyTexture;

// ============================================================
// 8. SUELO
// ============================================================
const RADIO_SUELO = 32;
const RADIO_ARBOLES = 26;
const CENTRO_Z = -6;

const sueloGeo = new THREE.CircleGeometry(RADIO_SUELO, 64);

const texColor = textureLoader.load(
  './assets/ground/Ground003_1K-JPG_Color.jpg',
  () => console.log('✅ Textura color suelo cargada'),
  undefined,
  () => console.warn('⚠️ No se encontró la textura del suelo')
);

const texNormal = textureLoader.load(
  './assets/ground/Ground003_1K-JPG_NormalGL.jpg',
  undefined,
  undefined,
  () => console.warn('⚠️ No se encontró la normal del suelo')
);

const texRough = textureLoader.load(
  './assets/ground/Ground003_1K-JPG_Roughness.jpg',
  undefined,
  undefined,
  () => console.warn('⚠️ No se encontró la roughness del suelo')
);

[texColor, texNormal, texRough].forEach((tex) => {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
});

texColor.colorSpace = THREE.SRGBColorSpace;

const sueloMat = new THREE.MeshStandardMaterial({
  map: texColor,
  normalMap: texNormal,
  roughnessMap: texRough,
  roughness: 1,
  metalness: 0
});
// Marcamos el color "de día" (blanco, porque usa texturas)
sueloMat.userData.colorDia = 0xffffff;

const suelo = new THREE.Mesh(sueloGeo, sueloMat);
suelo.rotation.x = -Math.PI / 2;
suelo.position.z = CENTRO_Z;
suelo.receiveShadow = true;
suelo.name = 'Suelo';
scene.add(suelo);

// ============================================================
// 9. LISTAS GLOBALES
// ============================================================
const partesSeleccionables = [];
const rosalesAnimados = [];
const pastosAnimados = [];
const arbolesAnimados = [];
const hojasRosales = [];

// Listas de materiales para oscurecer con el modo noche
const materialesPlantas = [];
const materialesArboles = [];
const materialesPasto = [];
const materialesMacetas = [];
const materialesSuelo = [sueloMat]; // ← NUEVO: el suelo

let vientoActivo = true;
let hojasVisibles = true;
let hojasMarchitas = false;

const COLOR_HOJA_VERDE = 0x2ecc40;
const COLOR_HOJA_MARCHITA = 0xc9a227;

// ============================================================
// 10. CREAR MACETA
// ============================================================
function crearMaceta(posX, posZ) {
  const grupo = new THREE.Group();
  grupo.position.set(posX, 0, posZ);

  const macetaGeo = new THREE.CylinderGeometry(1.0, 0.75, 1.2, 32);
  const macetaMat = new THREE.MeshStandardMaterial({
    color: 0xb05a2d,
    roughness: 0.85,
    metalness: 0.05
  });
  macetaMat.userData.colorDia = 0xb05a2d;
  materialesMacetas.push(macetaMat);

  const maceta = new THREE.Mesh(macetaGeo, macetaMat);
  maceta.position.y = 0.6;
  maceta.castShadow = true;
  maceta.receiveShadow = true;
  maceta.name = 'Maceta';
  maceta.userData.esSeleccionable = true;
  grupo.add(maceta);
  partesSeleccionables.push(maceta);

  const tierraGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.15, 32);
  const tierraMat = new THREE.MeshStandardMaterial({
    color: 0x3d2817,
    roughness: 1
  });
  tierraMat.userData.colorDia = 0x3d2817;
  materialesMacetas.push(tierraMat);

  const tierra = new THREE.Mesh(tierraGeo, tierraMat);
  tierra.position.y = 1.15;
  tierra.receiveShadow = true;
  tierra.name = 'Tierra';
  tierra.userData.esSeleccionable = true;
  grupo.add(tierra);
  partesSeleccionables.push(tierra);

  scene.add(grupo);
  return grupo;
}

// ============================================================
// 11. CREAR ROSAL PROCEDURAL
// ============================================================
function crearRosalProcedural(colorHex, posX, posZ) {
  const grupo = new THREE.Group();
  grupo.position.set(posX, 1.2, posZ);

  // Tallo
  const talloGeo = new THREE.CylinderGeometry(0.08, 0.14, 2.8, 8);
  talloGeo.translate(0, 1.4, 0);
  const talloMat = new THREE.MeshStandardMaterial({
    color: 0x3a8a3a,
    roughness: 0.75
  });
  talloMat.userData.colorDia = 0x3a8a3a;
  talloMat.userData.emissiveBase = 0;
  materialesPlantas.push(talloMat);

  const tallo = new THREE.Mesh(talloGeo, talloMat);
  tallo.castShadow = true;
  tallo.receiveShadow = true;
  tallo.name = 'Tallo';
  tallo.userData.esSeleccionable = true;
  grupo.add(tallo);
  partesSeleccionables.push(tallo);

  // Hojas
  const numHojas = 4;
  for (let i = 0; i < numHojas; i++) {
    const hojaGeo = new THREE.SphereGeometry(0.32, 10, 8);
    hojaGeo.scale(1, 0.15, 1.8);

    const hojaMat = new THREE.MeshStandardMaterial({
      color: COLOR_HOJA_VERDE,
      roughness: 0.6,
      side: THREE.DoubleSide
    });
    hojaMat.userData.colorDia = COLOR_HOJA_VERDE;
    hojaMat.userData.emissiveBase = 0;
    materialesPlantas.push(hojaMat);

    const hoja = new THREE.Mesh(hojaGeo, hojaMat);

    const ang = (i * Math.PI * 2) / numHojas + (Math.random() - 0.5) * 0.3;
    const altura = 0.5 + i * 0.55;

    hoja.position.set(Math.cos(ang) * 0.45, altura, Math.sin(ang) * 0.45);
    hoja.rotation.y = -ang;
    hoja.rotation.z = 0.35;
    hoja.castShadow = true;
    hoja.receiveShadow = true;
    hoja.name = 'Hoja';
    hoja.userData.esSeleccionable = true;
    hoja.userData.esHoja = true;

    grupo.add(hoja);
    partesSeleccionables.push(hoja);
    hojasRosales.push(hoja);
  }

  // Flor
  const flor = new THREE.Group();
  flor.position.set(0, 2.95, 0);

  const colorCentro = new THREE.Color(colorHex).multiplyScalar(0.6);
  const centroMat = new THREE.MeshStandardMaterial({
    color: colorCentro,
    emissive: colorCentro.clone(),
    emissiveIntensity: 0.2,
    roughness: 0.4
  });
  centroMat.userData.colorDia = colorCentro.getHex();
  centroMat.userData.emissiveBase = 0.2;
  materialesPlantas.push(centroMat);

  const centroGeo = new THREE.SphereGeometry(0.24, 12, 12);
  const centro = new THREE.Mesh(centroGeo, centroMat);
  centro.castShadow = true;
  centro.name = 'Flor';
  centro.userData.esSeleccionable = true;
  flor.add(centro);
  partesSeleccionables.push(centro);

  // Pétalos
  const numPetalos = 8;
  for (let i = 0; i < numPetalos; i++) {
    const petaloGeo = new THREE.SphereGeometry(0.18, 10, 10);
    petaloGeo.scale(1, 0.7, 1.3);

    const petaloMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: new THREE.Color(colorHex).multiplyScalar(0.3),
      emissiveIntensity: 0.2,
      roughness: 0.35,
      metalness: 0.1
    });
    petaloMat.userData.colorDia = colorHex;
    petaloMat.userData.emissiveBase = 0.2;
    materialesPlantas.push(petaloMat);

    const petalo = new THREE.Mesh(petaloGeo, petaloMat);

    const ang = (i * Math.PI * 2) / numPetalos;
    const radio = 0.26;

    petalo.position.set(
      Math.cos(ang) * radio,
      Math.sin(ang * 2) * 0.04,
      Math.sin(ang) * radio
    );
    petalo.castShadow = true;
    petalo.name = 'Pétalo';
    petalo.userData.esSeleccionable = true;
    flor.add(petalo);
    partesSeleccionables.push(petalo);
  }

  grupo.add(flor);
  scene.add(grupo);

  rosalesAnimados.push({
    objeto: grupo,
    fase: Math.random() * Math.PI * 2,
    amplitud: 0.15 + Math.random() * 0.1
  });

  return grupo;
}

// ============================================================
// 12. CREAR LAS 18 FLORES
// ============================================================
const COLORES = {
  'Rosa púrpura': 0x9b59d0,
  'Rosa roja': 0xdd3344,
  'Rosa amarilla': 0xf5cc33
};

const filas = [
  { z: -4, nombre: 'Rosa púrpura' },
  { z:  0, nombre: 'Rosa roja' },
  { z:  4, nombre: 'Rosa amarilla' }
];
const xs = [-4, 0, 4];
const desplazamientosZ = [0, -16];

desplazamientosZ.forEach((desplazamiento) => {
  filas.forEach((fila) => {
    xs.forEach((x) => {
      const z = fila.z + desplazamiento;
      crearMaceta(x, z);
      crearRosalProcedural(COLORES[fila.nombre], x, z);
    });
  });
});

console.log(`🌹 18 rosales creados | Hojas: ${hojasRosales.length}`);

// ============================================================
// 13. ÁRBOLES
// ============================================================
const loader = new GLTFLoader();

loader.load(
  './assets/tree_tall.glb',
  (gltf) => {
    const arbolBase = gltf.scene;
    const numArboles = 45;

    for (let i = 0; i < numArboles; i++) {
      const clon = arbolBase.clone();

      const ang = (i / numArboles) * Math.PI * 2;
      const r = RADIO_ARBOLES + (Math.random() - 0.5) * 3;
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r + CENTRO_Z;

      clon.position.set(x, 0, z);
      clon.rotation.y = Math.random() * Math.PI * 2;

      const esc = 2.5 + Math.random() * 1.8;
      clon.scale.set(esc, esc, esc);
      clon.name = 'Árbol';
      clon.userData.esSeleccionable = true;

      clon.traverse((c) => {
        if (c.isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
          c.name = 'Árbol';

          if (c.material) {
            c.material = c.material.clone();
            if (c.material.emissive) {
              c.material.emissive.setHex(0x000000);
              c.material.emissiveIntensity = 0;
            }
            c.material.userData = c.material.userData || {};
            c.material.userData.colorBase = c.material.color.getHex();
            materialesArboles.push(c.material);
          }
        }
      });

      scene.add(clon);
      partesSeleccionables.push(clon);
      arbolesAnimados.push({
        objeto: clon,
        fase: Math.random() * Math.PI * 2,
        amplitud: 0.02 + Math.random() * 0.015
      });
    }

    console.log(`✅ ${numArboles} árboles colocados`);
  },
  undefined,
  (error) => console.error('❌ Error al cargar tree_tall.glb:', error)
);

// ============================================================
// 14. PASTO
// ============================================================
let pastoPequeno = null;
let pastoGrande = null;
let cargados = 0;

function esparcirPasto() {
  if (cargados < 2) return;
  if (!pastoPequeno || !pastoGrande) return;

  const RADIO_PASTO = 30;

  function procesarClon(clon) {
    clon.traverse((c) => {
      if (c.isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
        c.name = 'Pasto';

        if (c.material) {
          c.material = c.material.clone();
          if (c.material.emissive) {
            c.material.emissive.setHex(0x000000);
            c.material.emissiveIntensity = 0;
          }
          c.material.userData = c.material.userData || {};
          c.material.userData.colorBase = c.material.color.getHex();
          materialesPasto.push(c.material);
        }
      }
    });
  }

  for (let i = 0; i < 160; i++) {
    const clon = pastoPequeno.clone();

    let x, z, dist;
    do {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * RADIO_PASTO;
      x = Math.cos(ang) * r;
      z = Math.sin(ang) * r + CENTRO_Z;
      dist = Math.sqrt(x * x + (z - CENTRO_Z) * (z - CENTRO_Z));
    } while (dist < 14);

    clon.position.set(x, 0, z);
    clon.rotation.y = Math.random() * Math.PI * 2;
    const esc = 0.5 + Math.random() * 0.7;
    clon.scale.set(esc, esc, esc);
    clon.name = 'Pasto';
    clon.userData.esSeleccionable = true;

    procesarClon(clon);

    scene.add(clon);
    partesSeleccionables.push(clon);
    pastosAnimados.push({
      objeto: clon,
      fase: Math.random() * Math.PI * 2,
      amplitud: 0.08 + Math.random() * 0.05
    });
  }

  for (let i = 0; i < 90; i++) {
    const clon = pastoGrande.clone();

    let x, z, dist;
    do {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * RADIO_PASTO;
      x = Math.cos(ang) * r;
      z = Math.sin(ang) * r + CENTRO_Z;
      dist = Math.sqrt(x * x + (z - CENTRO_Z) * (z - CENTRO_Z));
    } while (dist < 14);

    clon.position.set(x, 0, z);
    clon.rotation.y = Math.random() * Math.PI * 2;
    const esc = 0.6 + Math.random() * 0.8;
    clon.scale.set(esc, esc, esc);
    clon.name = 'Pasto';
    clon.userData.esSeleccionable = true;

    procesarClon(clon);

    scene.add(clon);
    partesSeleccionables.push(clon);
    pastosAnimados.push({
      objeto: clon,
      fase: Math.random() * Math.PI * 2,
      amplitud: 0.08 + Math.random() * 0.05
    });
  }

  console.log('🌿 Pasto esparcido:', pastosAnimados.length, 'matas');
}

loader.load(
  './assets/grass.glb',
  (gltf) => {
    pastoPequeno = gltf.scene;
    pastoPequeno.scale.set(2.5, 2.5, 2.5);
    cargados++;
    console.log('✅ grass.glb cargado');
    esparcirPasto();
  },
  undefined,
  (error) => console.error('❌ Error al cargar grass.glb:', error)
);

loader.load(
  './assets/grass_large.glb',
  (gltf) => {
    pastoGrande = gltf.scene;
    pastoGrande.scale.set(4, 4, 4);
    cargados++;
    console.log('✅ grass_large.glb cargado');
    esparcirPasto();
  },
  undefined,
  (error) => console.error('❌ Error al cargar grass_large.glb:', error)
);

// ============================================================
// 15. RAYCASTING
// ============================================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const infoNombre = document.getElementById('info-nombre');
const infoTipo = document.getElementById('info-tipo');
const infoDesc = document.getElementById('info-desc');

let seleccionado = null;
let coloresOriginales = [];

window.addEventListener('click', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(partesSeleccionables, true);

  if (seleccionado) {
    coloresOriginales.forEach(({ mesh, color }) => {
      if (mesh.material && mesh.material.color) mesh.material.color.setHex(color);
    });
    coloresOriginales = [];
  }

  if (hits.length > 0) {
    let obj = hits[0].object;

    while (obj && !obj.userData.esSeleccionable && obj.parent) {
      obj = obj.parent;
    }

    if (!obj || !obj.userData.esSeleccionable) return;

    seleccionado = obj;

    if (obj.isMesh) {
      if (obj.material && obj.material.color) {
        coloresOriginales.push({
          mesh: obj,
          color: obj.material.color.getHex()
        });
        obj.material.color.set(0xffff00);
      }
    } else {
      obj.traverse((c) => {
        if (c.isMesh && c.material && c.material.color) {
          coloresOriginales.push({
            mesh: c,
            color: c.material.color.getHex()
          });
          c.material.color.set(0xffff00);
        }
      });
    }

    const info = infoPartes[obj.name] || { tipo: '—', desc: 'Sin información.' };
    infoNombre.textContent = obj.name;
    infoTipo.textContent = info.tipo;
    infoDesc.textContent = info.desc;

    console.log('🌹 Seleccionado:', obj.name);
  } else {
    infoNombre.textContent = 'Selecciona una parte';
    infoTipo.textContent = '—';
    infoDesc.textContent = 'Haz clic sobre una maceta, tierra, tallo, hoja, flor o pétalo.';
    seleccionado = null;
  }
});

// ============================================================
// 16. CONTROLES HTML
// ============================================================
document.getElementById('btn-camara').addEventListener('click', () => {
  camera.position.copy(camaraInicial);
  controls.target.set(0, 2, -6);
  controls.update();
});

document.getElementById('btn-ocultar-hojas').addEventListener('click', (e) => {
  hojasVisibles = !hojasVisibles;
  hojasRosales.forEach((h) => (h.visible = hojasVisibles));
  e.target.textContent = hojasVisibles ? '👁 Ocultar hojas' : '👁 Mostrar hojas';
});

document.getElementById('btn-hojas-marchitas').addEventListener('click', (e) => {
  hojasMarchitas = !hojasMarchitas;

  const colorFinal = hojasMarchitas ? COLOR_HOJA_MARCHITA : COLOR_HOJA_VERDE;

  hojasRosales.forEach((h) => {
    if (h.material) {
      h.material.userData.colorDia = colorFinal;
    }
  });

  actualizarModoNoche();

  e.target.textContent = hojasMarchitas ? '🍃 Hojas verdes' : '🍂 Hojas marchitas';
});

document.getElementById('btn-viento').addEventListener('click', (e) => {
  vientoActivo = !vientoActivo;
  e.target.textContent = vientoActivo ? '💨 Detener viento' : '💨 Reanudar viento';
});

// ============================================================
// 17. INTENSIDAD DEL SOL + MODO NOCHE
// ============================================================
const sliderLuz = document.getElementById('luz');
const luzValor = document.getElementById('luz-valor');

function actualizarModoNoche() {
  // Cielo
  scene.backgroundIntensity = factorDia;
  scene.environmentIntensity = factorDia;

  // Luces
  ambientLight.intensity = 0.3 * factorDia;
  hemiLight.intensity = 0.3 * factorDia;

  // Niebla
  scene.fog.color.setRGB(
    0.87 * factorDia,
    0.91 * factorDia,
    0.94 * factorDia
  );

  // Brillo global (2% mínimo de noche)
  const brillo = 0.02 + 0.98 * factorDia;

  // 🌹 PLANTAS
  materialesPlantas.forEach((mat) => {
    const colorDia = new THREE.Color(mat.userData.colorDia || 0xffffff);
    mat.color.copy(colorDia).multiplyScalar(brillo);
    if (mat.emissive && mat.userData.emissiveBase !== undefined) {
      mat.emissiveIntensity = mat.userData.emissiveBase * factorDia;
    }
  });

  // 🏺 MACETAS Y TIERRA
  materialesMacetas.forEach((mat) => {
    const colorDia = new THREE.Color(mat.userData.colorDia || 0xffffff);
    mat.color.copy(colorDia).multiplyScalar(brillo);
  });

  // 🌳 ÁRBOLES
  materialesArboles.forEach((mat) => {
    const colorBase = new THREE.Color(mat.userData.colorBase || 0xffffff);
    mat.color.copy(colorBase).multiplyScalar(brillo);
  });

  // 🌿 PASTO
  materialesPasto.forEach((mat) => {
    const colorBase = new THREE.Color(mat.userData.colorBase || 0xffffff);
    mat.color.copy(colorBase).multiplyScalar(brillo);
  });

  // 🟩 SUELO (usa textura, por eso oscurecemos su color blanco)
  materialesSuelo.forEach((mat) => {
    const colorDia = new THREE.Color(mat.userData.colorDia || 0xffffff);
    mat.color.copy(colorDia).multiplyScalar(brillo);
  });
}

sliderLuz.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  solLight.intensity = val;
  luzValor.textContent = val.toFixed(1);

  factorDia = Math.min(1, val / MAX_INTENSIDAD_SOL);
  actualizarModoNoche();
});

// ============================================================
// 18. ANIMACIÓN
// ============================================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const t = clock.getElapsedTime();

  if (vientoActivo) {
    rosalesAnimados.forEach((r) => {
      r.objeto.rotation.z = Math.sin(t * 1.8 + r.fase) * r.amplitud;
      r.objeto.rotation.x = Math.cos(t * 1.4 + r.fase) * r.amplitud * 0.6;
    });

    pastosAnimados.forEach((p) => {
      p.objeto.rotation.z = Math.sin(t * 2.2 + p.fase) * p.amplitud;
    });

    arbolesAnimados.forEach((a) => {
      a.objeto.rotation.z = Math.sin(t * 0.9 + a.fase) * a.amplitud;
    });
  }

  // Pulso de brillo SOLO en flores y pétalos
  const pulso = (0.2 + Math.sin(t * 2) * 0.15) * factorDia;
  materialesPlantas.forEach((mat) => {
    if (mat.emissive && mat.userData.emissiveBase !== undefined && mat.userData.emissiveBase > 0) {
      mat.emissiveIntensity = pulso;
    }
  });

  controls.update();
  renderer.render(scene, camera);
}
animate();

// ============================================================
// 19. RESIZE
// ============================================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

console.log('🌹 Jardín cargado. Baja el sol a 0 para modo noche total.');