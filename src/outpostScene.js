/* Halcyon Ridge Outpost
 * A procedurally generated lunar outpost. Everything you see is built from
 * Three.js primitives + generated canvas patterns. No image files are used.
 */
import { ROOM, STATIONS, STATION_BY_ID, AIRLOCK, UNIT_DEPTH, stationBox, stationReadout, STATUS_COLOR } from './interior.js';

export function initHalcyonRidge(container, T, opts) {
  opts = opts || {};
  'use strict';
  if (!T) return function () {};

  /* ------------------------------------------------------------ utilities */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var worldSeed = Number(opts.seed) || 20261114;
  var rand = mulberry32(worldSeed);
  var noiseOffset = (worldSeed % 100003) * 0.017;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var smooth = function (a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  function hash(x, y) { var s = Math.sin((x + noiseOffset) * 127.1 + (y - noiseOffset * 0.73) * 311.7) * 43758.5453; return s - Math.floor(s); }
  function vnoise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y) {
    var s = 0, a = 0.5;
    for (var i = 0; i < 4; i++) { s += a * vnoise(x, y); x *= 2.03; y *= 2.03; a *= 0.5; }
    return s;
  }

  /* ------------------------------------------------------------- renderer */
  var canvas = container.querySelector('#scene');
  var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;

  var scene = new T.Scene();
  var skyPalette = [0x252b3a, 0x382d28, 0x202d3c, 0x30352d][Math.abs(Math.floor(worldSeed / 97)) % 4];
  scene.fog = new T.Fog(skyPalette, 170, 660);
  var camera = new T.PerspectiveCamera(45, 1, 0.1, 3000);

  /* ------------------------------------------------ layout & orientation */
  // Astronaut stands on a ridge, looking at the outpost (which sits at the origin)
  var AX = -40, AZ = 36;
  var fwd = new T.Vector3(-AX, 0, -AZ).normalize();       // astronaut -> outpost
  var right = new T.Vector3(-fwd.z, 0, fwd.x);            // screen-right from the astronaut's view
  var UP = new T.Vector3(0, 1, 0);

  /* --------------------------------------------------------------- terrain */
  var craters = [];
  for (var ci = 0; ci < 44; ci++) {
    var ang = rand() * Math.PI * 2, dist = 38 + rand() * 205, cr = 4 + rand() * rand() * 34;
    var cx = Math.cos(ang) * dist, cz = Math.sin(ang) * dist;
    if (Math.hypot(cx - AX, cz - AZ) < 22 + cr) continue;
    craters.push({ x: cx, z: cz, r: cr, d: cr * 0.23 });
  }

  function terrainH(x, z) {
    var r = Math.hypot(x, z);
    var h = (fbm(x * 0.012 + 10, z * 0.012) - 0.5) * 15 + (fbm(x * 0.06, z * 0.06) - 0.5) * 2.2
      + (fbm(x * 0.22 + 4, z * 0.22 - 7) - 0.5) * 0.55;
    for (var i = 0; i < craters.length; i++) {
      var c = craters[i];
      var t = Math.hypot(x - c.x, z - c.z) / c.r;
      if (t < 1.6) {
        if (t < 1) h -= c.d * (1 - t * t);
        h += c.d * 0.35 * Math.exp(-Math.pow((t - 1) * 3.2, 2));
      }
    }
    h *= smooth(30, 56, r);                                        // flat build pad around the outpost
    h += smooth(140, 240, r) * (8 + fbm(x * 0.02, z * 0.02) * 40); // distant crater wall
    var mx = x - AX, mz = z - AZ;
    h += 3.0 * Math.exp(-(mx * mx + mz * mz) / 50);                // the ridge the astronaut stands on
    return h;
  }

  (function buildTerrain() {
    var SIZE = 640, SEG = 320;
    var g = new T.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    g.rotateX(-Math.PI / 2);
    var p = g.attributes.position, col = new Float32Array(p.count * 3);
    for (var i = 0; i < p.count; i++) {
      var x = p.getX(i), z = p.getZ(i), h = terrainH(x, z);
      p.setY(i, h);
      var n = fbm(x * 0.15, z * 0.15), m = fbm(x * 0.7, z * 0.7);
      var k = 0.48 + 0.34 * n + 0.18 * m;
      // Cooler charcoal-basalt regolith with silver-grey mineral flecks.
      var palette = Math.abs(Math.floor(worldSeed / 97)) % 4;
      var tint = [
        [0.43, 0.46, 0.53], // silver basalt
        [0.52, 0.43, 0.34], // warm ochre highlands
        [0.34, 0.43, 0.49], // blue-grey mare
        [0.48, 0.49, 0.42], // olive mineral plain
      ][palette];
      col[i * 3] = tint[0] * k; col[i * 3 + 1] = tint[1] * k; col[i * 3 + 2] = tint[2] * k;
    }
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    g.computeVertexNormals();
    var ground = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }));
    ground.receiveShadow = true;
    scene.add(ground);
  })();

  /* ------------------------------------------------- sky, stars and planet */
  var sky = new T.Mesh(
    new T.SphereGeometry(1500, 32, 16),
    new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new T.Color(0x070b17) }, mid: { value: new T.Color(0x1c2638) }, hor: { value: new T.Color(0x4c5868) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec3 vP; uniform vec3 top, mid, hor;' +
        'void main(){ float h = clamp(vP.y, 0.0, 1.0);' +
        'vec3 c = mix(hor, mid, smoothstep(0.0, 0.22, h)); c = mix(c, top, smoothstep(0.2, 0.8, h));' +
        'gl_FragColor = vec4(c, 1.0); }'
    })
  );
  sky.renderOrder = -10;
  scene.add(sky);

  var starPos = [], starCol = [];
  for (var s = 0; s < 2600; s++) {
    var u = rand() * 2 - 1, th = rand() * Math.PI * 2, rr = Math.sqrt(1 - u * u);
    var sy = Math.abs(u) * 0.95 + 0.02;
    starPos.push(Math.cos(th) * rr * 1400, sy * 1400, Math.sin(th) * rr * 1400);
    var b = 0.35 + rand() * 0.65, tint = rand();
    starCol.push(b, b * (0.9 + tint * 0.1), b * (0.85 + (1 - tint) * 0.15));
  }
  var starGeo = new T.BufferGeometry();
  starGeo.setAttribute('position', new T.Float32BufferAttribute(starPos, 3));
  starGeo.setAttribute('color', new T.Float32BufferAttribute(starCol, 3));
  var stars = new T.Points(starGeo, new T.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, fog: false, transparent: true, depthWrite: false }));
  scene.add(stars);

  // Big crescent planet (shader-lit sphere)
  var planetL = new T.Vector3().addScaledVector(right, -1).addScaledVector(fwd, 0.6).addScaledVector(UP, 0.25).normalize();
  var planet = new T.Mesh(
    new T.SphereGeometry(150, 96, 64),
    new T.ShaderMaterial({
      fog: false,
      uniforms: {
        L: { value: planetL.clone() },
        cA: { value: new T.Color(0xf6ead4) }, cB: { value: new T.Color(0xd8c19c) }, cD: { value: new T.Color(0x14162c) }
      },
      vertexShader: 'varying vec3 vN; varying vec3 vO; varying vec3 vW;' +
        'void main(){ vN = normalize(mat3(modelMatrix) * normal); vO = normal; vW = (modelMatrix * vec4(position, 1.0)).xyz;' +
        'gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }',
      fragmentShader: 'varying vec3 vN; varying vec3 vO; varying vec3 vW; uniform vec3 L, cA, cB, cD;' +
        'float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }' +
        'float n(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);' +
        ' return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),' +
        '            mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }' +
        'void main(){ vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);' +
        ' float d = dot(N, normalize(L)); float lit = smoothstep(-0.02, 0.35, d);' +
        ' float bands = n(vO * vec3(3.0, 9.0, 3.0)) * 0.6 + n(vO * 14.0) * 0.4;' +
        ' vec3 surf = mix(cA, cB, bands);' +
        ' float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);' +
        ' vec3 c = mix(cD, surf, lit);' +
        ' c += vec3(1.0, 0.82, 0.6) * fres * smoothstep(-0.2, 0.5, d) * 0.5;' +
        ' gl_FragColor = vec4(c, 1.0); }'
    })
  );
  planet.position.copy(fwd).multiplyScalar(430).addScaledVector(right, 130).add(new T.Vector3(0, 150, 0));
  scene.add(planet);

  /* ---------------------------------------------------------------- lights */
  scene.add(new T.HemisphereLight(0x8e93c0, 0x2a2a3a, 0.9));

  var sun = new T.DirectionalLight(0xfff1dd, 1.7);
  sun.position.set(0, 0, 0)
    .addScaledVector(right, -1).addScaledVector(fwd, -0.4).addScaledVector(UP, 0.55).normalize().multiplyScalar(130);
  sun.target.position.set(-10, 0, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  var sc = sun.shadow.camera; sc.left = -90; sc.right = 90; sc.top = 90; sc.bottom = -90; sc.near = 10; sc.far = 320;
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);

  var fill = new T.DirectionalLight(0x7b86d8, 0.45);
  fill.position.set(0, 0, 0).addScaledVector(fwd, -100).addScaledVector(right, 40).addScaledVector(UP, 30);
  scene.add(fill);

  /* ------------------------------------------------------------- materials */
  var M = {
    hull:  new T.MeshStandardMaterial({ color: 0xd7d9e2, roughness: 0.55, metalness: 0.15 }),
    hull2: new T.MeshStandardMaterial({ color: 0xb4b7c8, roughness: 0.6, metalness: 0.2 }),
    dark:  new T.MeshStandardMaterial({ color: 0x383b4b, roughness: 0.7, metalness: 0.3 }),
    trim:  new T.MeshStandardMaterial({ color: 0x7d8196, roughness: 0.5, metalness: 0.4 }),
    orange:new T.MeshStandardMaterial({ color: 0xe08a3a, roughness: 0.6, metalness: 0.1 }),
    rock:  new T.MeshStandardMaterial({ color: 0x454b59, roughness: 1, metalness: 0, flatShading: true }),
    glass: new T.MeshPhysicalMaterial({ color: 0x9fb4ff, transparent: true, opacity: 0.2, roughness: 0.05, metalness: 0, side: T.DoubleSide, depthWrite: false }),
    visor: new T.MeshStandardMaterial({ color: 0x10141f, roughness: 0.08, metalness: 0.9, emissive: 0x16243a }),
    cyan:  new T.MeshBasicMaterial({ color: 0x7fe3ff, fog: false }),
    warm:  new T.MeshBasicMaterial({ color: 0xffb25c, fog: false })
  };
  M.glass.userData.noShadow = true;

  var tmpTextures = {};
  function glowMat(cols, rows, lit) {
    var cw = 22, ch = 22, c = document.createElement('canvas');
    c.width = cols * cw; c.height = rows * ch;
    var g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
    for (var r = 0; r < rows; r++) for (var q = 0; q < cols; q++) {
      if (rand() < (lit === undefined ? 0.85 : lit)) {
        var k = rand();
        g.fillStyle = k < 0.8 ? '#ffae52' : (k < 0.93 ? '#ffd9a0' : '#bfe8ff');
        g.fillRect(q * cw + 3, r * ch + 4, cw - 6, ch - 8);
      }
    }
    var t = new T.CanvasTexture(c); t.anisotropy = 4;
    var m = new T.MeshBasicMaterial({ map: t, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false });
    m.userData.noShadow = true;
    return m;
  }

  var glowTex = (function () {
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,200,120,1)'); gr.addColorStop(0.25, 'rgba(255,150,60,.45)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new T.CanvasTexture(c);
  })();
  function glowSprite(x, y, z, size, color, parent) {
    var sp = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: color || 0xffffff, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
    sp.position.set(x, y, z); sp.scale.set(size, size, 1);
    (parent || scene).add(sp);
    return sp;
  }

  function mesh(geo, mat, x, y, z, parent) {
    var o = new T.Mesh(geo, mat);
    o.position.set(x || 0, y || 0, z || 0);
    if (parent) parent.add(o);
    return o;
  }
  function plane(w, h, mat, x, y, z, ry, parent) {
    var o = mesh(new T.PlaneGeometry(w, h), mat, x, y, z, parent);
    o.rotation.y = ry || 0;
    return o;
  }

  var outpost = new T.Group();
  scene.add(outpost);

  /* --------------------------------------------------------- building kit */
  // A rectangular module: plinth, body, roof slab, glowing window strips, door.
  function module(w, h, d) {
    var g = new T.Group(), base = 0.5;
    mesh(new T.BoxGeometry(w + 0.7, base + 0.3, d + 0.7), M.dark, 0, (base - 0.3) / 2, 0, g);
    mesh(new T.BoxGeometry(w, h, d), M.hull, 0, base + h / 2, 0, g);
    mesh(new T.BoxGeometry(w + 0.3, 0.25, d + 0.3), M.trim, 0, base + h + 0.12, 0, g);
    mesh(new T.BoxGeometry(w * 0.9, 0.12, 0.35), M.hull2, 0, base + h * 0.2, d / 2 + 0.05, g);   // lower skirt
    mesh(new T.BoxGeometry(w * 0.9, 0.12, 0.35), M.hull2, 0, base + h * 0.2, -d / 2 - 0.05, g);
    // roof equipment
    for (var i = 0; i < 3; i++) {
      var vw = 0.8 + rand() * 0.8;
      mesh(new T.BoxGeometry(vw, 0.5, vw), M.hull2, (rand() - 0.5) * (w - 2), base + h + 0.5, (rand() - 0.5) * (d - 2), g);
    }
    var cols = Math.max(2, Math.round(w / 1.7)), wy = base + h * 0.6, wh = h * 0.34;
    plane(w * 0.88, wh, glowMat(cols, 1), 0, wy, d / 2 + 0.03, 0, g);
    plane(w * 0.88, wh, glowMat(cols, 1), 0, wy, -d / 2 - 0.03, Math.PI, g);
    var sc2 = Math.max(2, Math.round(d / 1.7));
    plane(d * 0.8, wh, glowMat(sc2, 1), w / 2 + 0.03, wy, 0, Math.PI / 2, g);
    plane(d * 0.8, wh, glowMat(sc2, 1), -w / 2 - 0.03, wy, 0, -Math.PI / 2, g);
    // door
    mesh(new T.BoxGeometry(1.6, h * 0.55, 0.2), M.dark, w * 0.3, base + h * 0.275, d / 2 + 0.05, g);
    g.userData.top = base + h + 0.25;
    return g;
  }

  function tube(a, b, parent) {
    var dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
    var g = new T.Group();
    var c = mesh(new T.CylinderGeometry(0.75, 0.75, len, 14), M.hull2, 0, 0, 0, g);
    c.rotation.z = Math.PI / 2;
    for (var i = -1; i <= 1; i += 2) {
      var r = mesh(new T.CylinderGeometry(0.9, 0.9, 0.35, 14), M.trim, i * len * 0.38, 0, 0, g);
      r.rotation.z = Math.PI / 2;
    }
    g.position.set((a.x + b.x) / 2, 1.5, (a.z + b.z) / 2);
    g.rotation.y = Math.atan2(-dz, dx);
    parent.add(g);
  }

  /* ----------------------------------------------------------------- hub */
  var hub = new T.Group();
  mesh(new T.CylinderGeometry(7.7, 8.0, 0.6, 40), M.dark, 0, 0.3, 0, hub);
  mesh(new T.CylinderGeometry(7, 7, 4.5, 40), M.hull, 0, 2.85, 0, hub);
  mesh(new T.CylinderGeometry(7.15, 7.15, 0.3, 40), M.trim, 0, 5.2, 0, hub);
  mesh(new T.CylinderGeometry(7.15, 7.15, 0.3, 40), M.orange, 0, 1.2, 0, hub);
  var band1 = mesh(new T.CylinderGeometry(7.04, 7.04, 1.4, 40, 1, true), glowMat(26, 1, 0.9), 0, 3.1, 0, hub);
  mesh(new T.CylinderGeometry(4.8, 4.8, 2.4, 32), M.hull, 0, 6.5, 0, hub);
  mesh(new T.CylinderGeometry(4.84, 4.84, 1.0, 32, 1, true), glowMat(16, 1, 0.9), 0, 6.6, 0, hub);
  mesh(new T.CylinderGeometry(5.2, 5.2, 0.35, 32), M.trim, 0, 7.85, 0, hub);
  var cap = mesh(new T.SphereGeometry(2.6, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), M.hull2, 0, 8.0, 0, hub);
  mesh(new T.CylinderGeometry(0.09, 0.14, 6, 8), M.trim, 0, 12, 0, hub);
  mesh(new T.CylinderGeometry(0.03, 0.06, 3, 6), M.trim, 0, 16, 0, hub);
  mesh(new T.SphereGeometry(0.16, 10, 8), new T.MeshBasicMaterial({ color: 0xff7a5a, fog: false }), 0, 17.6, 0, hub);
  for (var ri = 0; ri < 12; ri++) {       // roof-edge lights
    var a = ri / 12 * Math.PI * 2;
    mesh(new T.SphereGeometry(0.12, 8, 6), M.warm, Math.cos(a) * 5.1, 8.1, Math.sin(a) * 5.1, hub);
  }
  // entrance facing the viewer
  var door = new T.Group();
  mesh(new T.BoxGeometry(3.2, 3.0, 2.4), M.hull2, 0, 1.7, 0, door);
  mesh(new T.BoxGeometry(3.4, 0.25, 2.6), M.trim, 0, 3.3, 0, door);
  plane(2.0, 2.0, glowMat(2, 2, 1), 0, 1.5, 1.23, 0, door);
  door.position.copy(fwd).multiplyScalar(-7.6);
  door.rotation.y = Math.atan2(-fwd.x, -fwd.z);
  hub.add(door);
  outpost.add(hub);

  /* -------------------------------------------------------------- modules */
  var layout = [
    { n: 'A', x: -14, z: 5,   w: 10, h: 4,   d: 6 },
    { n: 'B', x: -26, z: 2,   w: 7,  h: 3.5, d: 5 },
    { n: 'C', x: 12,  z: 9,   w: 8,  h: 3.2, d: 5 },
    { n: 'D', x: 23,  z: 1,   w: 6,  h: 3,   d: 6 },
    { n: 'E', x: -3,  z: -19, w: 18, h: 3.2, d: 6 }
  ];
  var mods = {};
  layout.forEach(function (L) {
    var m = module(L.w, L.h, L.d); m.position.set(L.x, 0, L.z); m.visible = false; outpost.add(m); mods[L.n] = m;
  });
  var corridors = new T.Group(); corridors.visible = false; outpost.add(corridors);
  tube({ x: -7, z: 3 },  { x: -9, z: 4 },   corridors);
  tube({ x: -19, z: 3 }, { x: -22.5, z: 2.5 }, corridors);
  tube({ x: 6, z: 5 },   { x: 8, z: 8 },    corridors);
  tube({ x: 15, z: 6.5 },{ x: 20, z: 3 },   corridors);
  tube({ x: -2, z: -7 }, { x: -2, z: -16 }, corridors);

  /* ---------------------------------------------------------------- tower */
  var tower = new T.Group(), beacon, beaconLight;
  (function () {
    mesh(new T.CylinderGeometry(2.2, 2.8, 1, 24), M.dark, 0, 0.5, 0, tower);
    mesh(new T.CylinderGeometry(0.55, 0.95, 26, 18), M.hull, 0, 14, 0, tower);
    [5, 10, 15, 20, 25].forEach(function (y) {
      var r = 0.95 - 0.4 * (y - 1) / 26 + 0.12;
      var t = mesh(new T.TorusGeometry(r, 0.1, 8, 24), M.trim, 0, y, 0, tower); t.rotation.x = Math.PI / 2;
    });
    [8, 17].forEach(function (y) {
      var r = 0.95 - 0.4 * (y - 1) / 26 + 0.03;
      mesh(new T.CylinderGeometry(r, r, 0.9, 20, 1, true), glowMat(8, 1, 0.9), 0, y, 0, tower);
    });
    mesh(new T.CylinderGeometry(2.4, 1.8, 0.8, 24), M.hull2, 0, 27.4, 0, tower);
    mesh(new T.CylinderGeometry(2.14, 2.14, 0.35, 24, 1, true), glowMat(14, 1, 1), 0, 27.4, 0, tower);
    mesh(new T.CylinderGeometry(1.2, 1.2, 1.2, 20), M.dark, 0, 28.8, 0, tower);
    mesh(new T.CylinderGeometry(1.22, 1.22, 0.5, 20, 1, true), glowMat(8, 1, 1), 0, 28.8, 0, tower);
    mesh(new T.CylinderGeometry(0.15, 1.5, 0.9, 20), M.hull2, 0, 30.0, 0, tower);
    mesh(new T.CylinderGeometry(0.05, 0.12, 8, 8), M.trim, 0, 34.4, 0, tower);
    beacon = mesh(new T.SphereGeometry(0.28, 14, 10), new T.MeshBasicMaterial({ color: 0xff6a5a, fog: false }), 0, 38.6, 0, tower);
    beaconLight = new T.PointLight(0xff6a5a, 1.0, 40, 1.5); beaconLight.position.set(0, 38.6, 0); tower.add(beaconLight);
    tower.userData.glow = glowSprite(0, 38.6, 0, 5, 0xff6a5a, tower);
  })();
  tower.position.set(13, 0, -10);
  tower.visible = false;
  outpost.add(tower);

  /* ----------------------------------------------------------------- dome */
  var dome = new T.Group();
  mesh(new T.CylinderGeometry(6.6, 7, 0.7, 36), M.dark, 0, 0.35, 0, dome);
  var shell = mesh(new T.SphereGeometry(6, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2), M.glass, 0, 0.7, 0, dome);
  for (var ribI = 0; ribI < 8; ribI++) {  // structural ribs
    var rib = mesh(new T.TorusGeometry(6.02, 0.07, 6, 40, Math.PI), M.trim, 0, 0.7, 0, dome);
    rib.rotation.y = ribI / 8 * Math.PI;
  }
  var ringR = mesh(new T.TorusGeometry(4.2, 0.07, 6, 40), M.trim, 0, 4.1, 0, dome); ringR.rotation.x = Math.PI / 2;
  mesh(new T.CylinderGeometry(1.6, 1.8, 2.4, 16), M.hull, 0, 1.9, 0, dome);
  mesh(new T.CylinderGeometry(1.62, 1.62, 0.8, 16, 1, true), glowMat(8, 1, 1), 0, 2.2, 0, dome);
  mesh(new T.CylinderGeometry(0.4, 0.4, 1.4, 10), M.hull2, 2.8, 1.4, 1.2, dome);
  var domeLight = new T.PointLight(0xffa050, 1.4, 22, 1.5); domeLight.position.set(0, 3, 0); dome.add(domeLight);
  glowSprite(0, 2.6, 0, 9, 0xffa050, dome);
  dome.position.set(-19, 0, -12);
  dome.visible = false;
  outpost.add(dome);

  /* ---------------------------------------------------------- fuel tanks */
  var tankFarm = new T.Group(); outpost.add(tankFarm); tankFarm.visible = false;
  [[24, -14], [27.5, -14], [24, -17.5]].forEach(function (p, i) {
    var tk = new T.Group(), hgt = 3.6 + (i === 2 ? 1 : 0);
    mesh(new T.CylinderGeometry(1.35, 1.35, hgt, 22), M.hull, 0, 0.8 + hgt / 2, 0, tk);
    mesh(new T.SphereGeometry(1.35, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.hull, 0, 0.8 + hgt, 0, tk);
    mesh(new T.SphereGeometry(1.35, 22, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.hull, 0, 0.8, 0, tk);
    mesh(new T.CylinderGeometry(1.4, 1.4, 0.28, 22), M.orange, 0, 0.8 + hgt * 0.5, 0, tk);
    for (var l = 0; l < 3; l++) {
      var lg = mesh(new T.BoxGeometry(0.15, 0.9, 0.15), M.dark, Math.cos(l * 2.1) * 1.1, 0.4, Math.sin(l * 2.1) * 1.1, tk);
    }
    tk.position.set(p[0], 0, p[1]);
    tankFarm.add(tk);
  });
  tube({ x: 24, z: -14 }, { x: 27.5, z: -14 }, tankFarm);

  /* ---------------------------------------------------------- radar dish */
  var dishPivot = new T.Group();
  mesh(new T.CylinderGeometry(0.18, 0.25, 2.4, 10), M.trim, 0, 1.2, 0, dishPivot);
  var bowl = mesh(new T.SphereGeometry(2.5, 28, 12, 0, Math.PI * 2, 0, 0.85), M.hull, 0, 2.8, 0, dishPivot);
  bowl.material = M.hull.clone(); bowl.material.side = T.DoubleSide;
  bowl.rotation.x = Math.PI * 0.78;
  var feed = mesh(new T.CylinderGeometry(0.04, 0.04, 2.6, 6), M.trim, 0, 0, 0, bowl);
  feed.position.y = -1.5;
  dishPivot.position.set(4, mods.E.userData.top, -19);
  dishPivot.visible = false;
  outpost.add(dishPivot);

  /* ---------------------------------------------------------- solar array */
  var panelTex = (function () {
    var c = document.createElement('canvas'); c.width = 256; c.height = 128;
    var g = c.getContext('2d'); g.fillStyle = '#2b3d78'; g.fillRect(0, 0, 256, 128);
    g.strokeStyle = 'rgba(180,200,255,.55)'; g.lineWidth = 2;
    for (var x = 0; x <= 256; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
    for (var y = 0; y <= 128; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
    var t = new T.CanvasTexture(c); t.anisotropy = 4; return t;
  })();
  var panelMat = new T.MeshStandardMaterial({ map: panelTex, roughness: 0.3, metalness: 0.7, emissive: 0x0a1230 });
  var solarGroup = new T.Group(); solarGroup.visible = false; outpost.add(solarGroup);
  for (var row = 0; row < 2; row++) for (var pi = 0; pi < 4; pi++) {
    var px = -34 + pi * 5.4, pz = -22 - row * 5.6, py = terrainH(px, pz);
    var pg = new T.Group();
    mesh(new T.CylinderGeometry(0.14, 0.2, 1.6, 8), M.trim, 0, 0.5, 0, pg);
    var pn = mesh(new T.BoxGeometry(4.8, 0.12, 2.9), panelMat, 0, 1.5, 0, pg); pn.rotation.x = -0.5;
    var fr = mesh(new T.BoxGeometry(4.95, 0.08, 3.05), M.dark, 0, 1.46, 0, pg); fr.rotation.x = -0.5;
    pg.position.set(px, py, pz);
    solarGroup.add(pg);
  }

  /* ---------------------------------------------------------- landing pad */
  var pad = new T.Group();
  mesh(new T.CylinderGeometry(8.6, 9, 1.6, 40), M.dark, 0, 0.1, 0, pad);
  var padRing = mesh(new T.RingGeometry(6.2, 6.6, 48), M.warm, 0, 0.92, 0, pad); padRing.rotation.x = -Math.PI / 2;
  padRing.material = M.warm.clone(); padRing.material.userData.noShadow = true;
  for (var pl = 0; pl < 16; pl++) {
    var pa = pl / 16 * Math.PI * 2;
    mesh(new T.SphereGeometry(0.16, 8, 6), pl % 2 ? M.warm : M.cyan, Math.cos(pa) * 8.0, 1.0, Math.sin(pa) * 8.0, pad);
  }
  // small lander
  var lander = new T.Group();
  mesh(new T.CylinderGeometry(1.1, 1.7, 3.2, 20), M.hull, 0, 3.0, 0, lander);
  mesh(new T.CylinderGeometry(0.02, 1.1, 1.8, 20), M.hull2, 0, 5.5, 0, lander);
  mesh(new T.CylinderGeometry(1.72, 1.72, 0.3, 20), M.orange, 0, 2.0, 0, lander);
  mesh(new T.CylinderGeometry(1.12, 1.12, 0.8, 20, 1, true), glowMat(6, 1, 1), 0, 3.6, 0, lander);
  for (var lgI = 0; lgI < 4; lgI++) {
    var la = lgI * Math.PI / 2 + Math.PI / 4, leg = mesh(new T.BoxGeometry(0.2, 2.6, 0.2), M.trim, Math.cos(la) * 2.1, 1.3, Math.sin(la) * 2.1, lander);
    leg.rotation.z = Math.cos(la) * -0.4; leg.rotation.x = Math.sin(la) * 0.4;
  }
  lander.position.y = 0.9; pad.add(lander);
  pad.position.set(28, 0, 22);
  pad.visible = false;
  outpost.add(pad);

  /* ---------------------------------------------------------------- rover */
  var rover = new T.Group();
  mesh(new T.BoxGeometry(2.8, 0.7, 1.6), M.hull, 0, 0.9, 0, rover);
  mesh(new T.BoxGeometry(1.3, 0.7, 1.3), M.hull2, 0.3, 1.55, 0, rover);
  mesh(new T.BoxGeometry(0.06, 0.5, 1.1), M.visor, 0.97, 1.55, 0, rover);
  mesh(new T.BoxGeometry(2.6, 0.12, 1.7), M.orange, 0, 0.5, 0, rover);
  var roverWheels = [];
  [-1, 0, 1].forEach(function (i) {
    [-1, 1].forEach(function (s) {
      var wh = mesh(new T.CylinderGeometry(0.4, 0.4, 0.4, 14), M.dark, i * 1.0, 0.4, s * 0.95, rover);
      wh.rotation.x = Math.PI / 2;
      roverWheels.push(wh);
    });
  });
  mesh(new T.CylinderGeometry(0.03, 0.03, 1.6, 5), M.trim, -1.1, 2.0, 0.5, rover);
  rover.position.set(-6, 0, 17); rover.rotation.y = 0.6;
  outpost.add(rover);

  /* ---------------------------------------------------------- lamp posts */
  var lampLights = [];
  [11, 17, 23, 29].forEach(function (r, i) {
    var lp = new T.Group();
    mesh(new T.CylinderGeometry(0.07, 0.1, 3.4, 8), M.trim, 0, 1.7, 0, lp);
    mesh(new T.BoxGeometry(0.5, 0.18, 0.5), M.dark, 0, 3.45, 0, lp);
    mesh(new T.SphereGeometry(0.2, 10, 8), M.warm, 0, 3.25, 0, lp);
    glowSprite(0, 3.25, 0, 3.2, 0xffa050, lp);
    if (i % 2 === 1) { var pl2 = new T.PointLight(0xffa050, 0.7, 16, 1.5); pl2.position.set(0, 3.2, 0); lp.add(pl2); }
    lp.position.copy(fwd).multiplyScalar(-r).addScaledVector(right, 4.8);
    outpost.add(lp);
  });
  var doorLight = new T.PointLight(0xffa050, 1.3, 26, 1.5);
  doorLight.position.copy(fwd).multiplyScalar(-9.5).add(new T.Vector3(0, 2.4, 0)); outpost.add(doorLight);
  glowSprite(doorLight.position.x, 1.8, doorLight.position.z, 7, 0xffa050, outpost);

  /* ---------------------------------------------------------------- rocks */
  function rock(x, z, s) {
    var g = new T.IcosahedronGeometry(1, 1), p = g.attributes.position, ph = rand() * 10;
    for (var i = 0; i < p.count; i++) {
      var X = p.getX(i), Y = p.getY(i), Z = p.getZ(i);
      var k = 1 + 0.28 * Math.sin(X * 3.1 + ph) * Math.cos(Z * 2.7 + Y * 1.9 + ph);
      p.setXYZ(i, X * k, Y * k, Z * k);
    }
    g.computeVertexNormals();
    var m = new T.Mesh(g, M.rock);
    m.scale.set(s * (0.8 + rand() * 0.5), s * (0.5 + rand() * 0.3), s * (0.8 + rand() * 0.5));
    m.position.set(x, terrainH(x, z) + s * 0.12, z);
    m.rotation.y = rand() * 6.28;
    scene.add(m);
  }
  // foreground rocks near the astronaut's ridge
  rock(AX - 6, AZ + 3, 3.2); rock(AX + 5.5, AZ + 4.5, 2.2); rock(AX - 2.5, AZ + 8, 1.4); rock(AX + 9, AZ - 3, 1.6);
  for (var rk = 0; rk < 90; rk++) {
    var ra = rand() * Math.PI * 2, rd = 22 + rand() * 170;
    var rx = Math.cos(ra) * rd, rz = Math.sin(ra) * rd;
    if (Math.hypot(rx - AX, rz - AZ) < 8) continue;
    rock(rx, rz, 0.4 + rand() * rand() * 3.5);
  }

  /* ------------------------------------------------------------ astronaut */
  var astro = new T.Group(), torso, head, astronautLegs = [], astronautArms = [];
  (function () {
    var suit = new T.MeshStandardMaterial({ color: 0xe7e9f0, roughness: 0.7, metalness: 0.05 });
    var legGeo = new T.CylinderGeometry(0.13, 0.15, 0.75, 12);
    [-1, 1].forEach(function (s) {
      // each leg hangs from a hip pivot so it swings like a real stride
      var leg = new T.Group(); leg.position.set(s * 0.17, 0.9, 0); astro.add(leg);
      mesh(legGeo, suit, 0, -0.38, 0, leg);
      mesh(new T.BoxGeometry(0.28, 0.17, 0.44), M.dark, 0, -0.81, 0.07, leg);
      mesh(new T.CylinderGeometry(0.155, 0.155, 0.07, 12), M.orange, 0, -0.48, 0, leg);
      astronautLegs.push(leg);
      // each arm hangs from a shoulder pivot
      var arm = new T.Group(); arm.position.set(s * 0.42, 1.53, 0.02); arm.rotation.z = s * 0.14; astro.add(arm);
      mesh(new T.CylinderGeometry(0.09, 0.1, 0.62, 10), suit, 0, -0.31, 0, arm);
      mesh(new T.SphereGeometry(0.11, 10, 8), M.dark, s * 0.05, -0.65, 0, arm);
      astronautArms.push(arm);
    });
    torso = new T.Group(); torso.position.y = 0;
    mesh(new T.BoxGeometry(0.62, 0.72, 0.4), suit, 0, 1.2, 0, torso);
    mesh(new T.BoxGeometry(0.64, 0.1, 0.42), M.dark, 0, 0.88, 0, torso);
    mesh(new T.BoxGeometry(0.28, 0.2, 0.05), M.cyan, 0.1, 1.3, 0.22, torso);
    mesh(new T.BoxGeometry(0.5, 0.64, 0.3), M.hull2, 0, 1.25, -0.34, torso);                 // backpack
    mesh(new T.BoxGeometry(0.06, 0.5, 0.04), M.cyan, 0, 1.25, -0.5, torso);                  // glow strip
    mesh(new T.CylinderGeometry(0.06, 0.06, 0.2, 8), M.trim, -0.18, 1.62, -0.34, torso);
    head = new T.Group(); head.position.y = 1.83;
    mesh(new T.SphereGeometry(0.29, 22, 16), suit, 0, 0, 0, head);
    var vz = mesh(new T.SphereGeometry(0.21, 20, 14), M.visor, 0, -0.01, 0.15, head); vz.scale.set(1.05, 0.82, 0.62);
    mesh(new T.TorusGeometry(0.27, 0.035, 8, 24), M.trim, 0, -0.24, 0, head).rotation.x = Math.PI / 2;
    torso.add(head);
    astro.add(torso);
  })();
  astro.scale.setScalar(2);
  astro.position.set(AX, terrainH(AX, AZ) - 0.05, AZ);
  astro.rotation.y = Math.atan2(fwd.x, fwd.z);
  scene.add(astro);

  /* ------------------------------------------- scientist robot (mission briefings) */
  var sci = new T.Group();
  (function () {
    var bodyM = new T.MeshStandardMaterial({ color: 0xf1f2f6, roughness: 0.5, metalness: 0.2 });
    mesh(new T.CylinderGeometry(0.55, 0.7, 0.25, 20), M.dark, 0, 0.12, 0, sci);
    mesh(new T.CylinderGeometry(0.42, 0.5, 0.95, 18), bodyM, 0, 0.8, 0, sci);
    mesh(new T.BoxGeometry(0.34, 0.2, 0.05), M.cyan, 0, 0.9, 0.46, sci);
    mesh(new T.SphereGeometry(0.46, 20, 14), bodyM, 0, 1.55, 0, sci);
    var vz = mesh(new T.SphereGeometry(0.33, 18, 12), M.visor, 0, 1.56, 0.22, sci); vz.scale.set(1.1, 0.8, 0.6);
    mesh(new T.BoxGeometry(0.34, 0.06, 0.04), M.cyan, 0, 1.58, 0.42, sci);
    mesh(new T.CylinderGeometry(0.03, 0.03, 0.5, 6), M.trim, 0.2, 2.15, 0, sci);
    mesh(new T.SphereGeometry(0.07, 8, 6), M.cyan, 0.2, 2.42, 0, sci);
    [-1, 1].forEach(function (sd) { mesh(new T.CylinderGeometry(0.07, 0.07, 0.6, 8), bodyM, sd * 0.55, 0.85, 0, sci); });
  })();
  sci.scale.setScalar(1.7);
  sci.position.set(-2.5, terrainH(-2.5, 13.5), 13.5);
  sci.rotation.y = Math.atan2(-2.3, -1.3);
  scene.add(sci);

  /* ------------------------------------------- objective marker (where the mission work happens) */
  var objRing = new T.Mesh(new T.RingGeometry(1.9, 2.4, 48), new T.MeshBasicMaterial({ color: 0x4fd8ff, transparent: true, opacity: 0.9, side: T.DoubleSide, depthWrite: false, fog: false }));
  objRing.rotation.x = -Math.PI / 2; objRing.visible = false; scene.add(objRing);
  var objBeam = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, 14, 10, 1, true), new T.MeshBasicMaterial({ color: 0x4fd8ff, transparent: true, opacity: 0.35, side: T.DoubleSide, depthWrite: false, fog: false }));
  objBeam.visible = false; scene.add(objBeam);

  // Guide arrow: floats above the player and points at the glowing ring so kids never get lost.
  var guide = new T.Group();
  (function () {
    var am = new T.MeshBasicMaterial({ color: 0xffd24a, fog: false, depthTest: false, transparent: true, opacity: 0.95 });
    var shaft = new T.Mesh(new T.CylinderGeometry(0.28, 0.28, 1.6, 12), am); shaft.rotation.x = Math.PI / 2; shaft.position.z = -0.4; guide.add(shaft);
    var head = new T.Mesh(new T.ConeGeometry(0.75, 1.3, 16), am); head.rotation.x = Math.PI / 2; head.position.z = 0.85; guide.add(head);
    guide.renderOrder = 10; shaft.renderOrder = 10; head.renderOrder = 10;
  })();
  guide.visible = false; scene.add(guide);

  /* ------------------------------------------------ shadows for all solids */
  outpost.traverse(function (o) {
    if (o.isMesh && !(o.material && o.material.userData && o.material.userData.noShadow)) { o.castShadow = true; o.receiveShadow = true; }
  });
  astro.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.traverse(function (o) { if (o.isMesh && o.material === M.rock) { o.castShadow = true; o.receiveShadow = true; } });

  /* ===================================================== HABITAT INTERIOR
   * A walk-in room built from the same primitives as the outside. It is a cut-away diorama: every wall is a single
   * one-sided plane, so the walls between the camera and the room disappear and you can orbit all the way round.
   * Each machine has a live screen (stationReadout) that is redrawn a few times a second from the running sim. */
  var outdoorNodes = scene.children.filter(function (o) { return !o.isLight && o !== astro; });
  var outdoorLights = scene.children.filter(function (o) { return o.isLight; }).map(function (l) { return { l: l, base: l.intensity }; });
  var interior = new T.Group(); interior.visible = false; scene.add(interior);
  var IW = ROOM.w, ID = ROOM.d, IH = ROOM.h, FZ = 1.5;   // FZ = front face of a machine, measured from its wall

  var inLights = [];
  (function () {
    var hemi = new T.HemisphereLight(0xdfe8ff, 0x2b3042, 0); scene.add(hemi); inLights.push({ l: hemi, on: 1.3 });
    var dir = new T.DirectionalLight(0xffffff, 0); dir.position.set(2, 12, 8); scene.add(dir); inLights.push({ l: dir, on: 0.8 });
    [[-5.5, -3.5], [5.5, -3.5], [-5.5, 3.5], [5.5, 3.5]].forEach(function (p) {
      var pl = new T.PointLight(0xe6eeff, 0, 0, 2); pl.position.set(p[0], 4.4, p[1]); scene.add(pl); inLights.push({ l: pl, on: 45 });
    });
  })();

  function canvasTex(w, h, draw, rx, ry) {
    var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
    if (rx) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); }
    return t;
  }
  function basic(color, extra) { var m = new T.MeshBasicMaterial(Object.assign({ color: color, fog: false }, extra || {})); m.userData.noShadow = true; return m; }

  // ---- floor, walls, trim
  var floorTex = canvasTex(128, 128, function (g, w, h) {
    g.fillStyle = '#323a4e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#3b4460'; g.fillRect(6, 6, w - 12, h - 12);
    g.strokeStyle = '#1b2132'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
    g.fillStyle = '#596384';
    [[14, 14], [w - 14, 14], [14, h - 14], [w - 14, h - 14]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], 3, 0, 6.283); g.fill(); });
  }, IW / 2, ID / 2);
  var floor = mesh(new T.PlaneGeometry(IW, ID), new T.MeshStandardMaterial({ map: floorTex, roughness: 0.75, metalness: 0.3 }), 0, 0, 0, interior);
  floor.rotation.x = -Math.PI / 2;
  mesh(new T.BoxGeometry(IW + 1.2, 0.5, ID + 1.2), M.dark, 0, -0.27, 0, interior);   // slab under the floor

  function wallTex(len) {
    return canvasTex(256, 256, function (g, w, h) {
      g.fillStyle = '#c9cdda'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#b6bbcb'; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 70, w, 70);
      g.strokeStyle = '#9096aa'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
      g.beginPath(); g.moveTo(w / 2, 14); g.lineTo(w / 2, h - 70); g.stroke();
      g.fillStyle = '#8c92a8';
      [[12, 30], [w - 12, 30], [12, h - 86], [w - 12, h - 86]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], 3, 0, 6.283); g.fill(); });
    }, len / 4, 1);
  }
  function wall(len, x, z, ry) {
    var m = mesh(new T.PlaneGeometry(len, IH), new T.MeshStandardMaterial({ map: wallTex(len), roughness: 0.6, metalness: 0.2 }), x, IH / 2, z, interior);
    m.rotation.y = ry;                                   // one-sided plane: invisible from outside, so you can look in from any side
    var nx = Math.sin(ry), nz = Math.cos(ry), along = Math.abs(nz) > 0.5;   // nx, nz = the way the wall faces (into the room)
    mesh(new T.BoxGeometry(along ? len + 0.5 : 0.4, 0.26, along ? 0.4 : len + 0.5), M.trim, x - nx * 0.2, IH + 0.1, z - nz * 0.2, interior);   // cap on top
    mesh(new T.BoxGeometry(along ? len - 1 : 0.06, 0.12, along ? 0.06 : len - 1), basic(0xcfe8ff), x + nx * 0.06, IH - 0.55, z + nz * 0.06, interior);   // light strip
    return m;
  }
  wall(IW, 0, -ID / 2, 0); wall(IW, 0, ID / 2, Math.PI); wall(ID, -IW / 2, 0, Math.PI / 2); wall(ID, IW / 2, 0, -Math.PI / 2);

  var hazardTex = canvasTex(64, 64, function (g, w, h) {
    g.fillStyle = '#16161c'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2c230';
    for (var i = -h; i < w + h; i += 32) { g.beginPath(); g.moveTo(i, h); g.lineTo(i + 16, h); g.lineTo(i + 16 + h, 0); g.lineTo(i + h, 0); g.fill(); }
  }, 6, 1);
  var hazardMat = new T.MeshBasicMaterial({ map: hazardTex, fog: false }); hazardMat.userData.noShadow = true;

  // ---- airlock door (south wall) with a sign you can see from inside
  (function () {
    var g = new T.Group(); g.position.set(AIRLOCK.x, 0, ID / 2); interior.add(g);
    [-1, 1].forEach(function (s) { mesh(new T.BoxGeometry(0.35, 3.8, 0.5), M.dark, s * 1.45, 1.9, -0.15, g); });
    mesh(new T.BoxGeometry(3.25, 0.4, 0.5), M.dark, 0, 3.8, -0.15, g);
    mesh(new T.BoxGeometry(2.6, 3.4, 0.16), M.hull2, 0, 1.7, -0.05, g);
    mesh(new T.BoxGeometry(2.0, 1.0, 0.04), M.visor, 0, 2.3, -0.16, g);
    mesh(new T.BoxGeometry(0.1, 3.2, 0.05), basic(0x5dff9a), 0, 1.7, -0.17, g);
    var sign = new T.Mesh(new T.PlaneGeometry(2.6, 0.6), basic(0xffffff, { map: canvasTex(256, 60, function (c, w, h) {
      c.fillStyle = '#0a2a1c'; c.fillRect(0, 0, w, h); c.strokeStyle = '#5dff9a'; c.lineWidth = 4; c.strokeRect(3, 3, w - 6, h - 6);
      c.fillStyle = '#5dff9a'; c.font = 'bold 30px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('AIRLOCK · EXIT', w / 2, h / 2 + 2);
    }) }));
    sign.position.set(0, 4.35, -0.42); sign.rotation.y = Math.PI; g.add(sign);
    var hz = mesh(new T.PlaneGeometry(3.2, 1.2), hazardMat, 0, 0.02, -1.4, g); hz.rotation.x = -Math.PI / 2;
  })();

  // ---- holo table in the middle of the room
  var holo = new T.Group(); interior.add(holo);
  (function () {
    mesh(new T.CylinderGeometry(1.15, 1.3, 0.9, 28), M.dark, 0, 0.45, 0, interior);
    mesh(new T.CylinderGeometry(1.2, 1.2, 0.08, 28), M.trim, 0, 0.94, 0, interior);
    mesh(new T.CylinderGeometry(0.95, 0.95, 0.04, 28), basic(0x1b6f9a), 0, 1.0, 0, interior);
    var r1 = mesh(new T.TorusGeometry(0.8, 0.025, 6, 40), basic(0x7fe3ff), 0, 1.45, 0, holo); r1.rotation.x = Math.PI / 2;
    var r2 = mesh(new T.TorusGeometry(0.55, 0.02, 6, 40), basic(0x7fe3ff), 0, 1.75, 0, holo); r2.rotation.x = Math.PI / 2;
    mesh(new T.CylinderGeometry(0.3, 0.3, 0.3, 16, 1, true), basic(0x7fe3ff, { wireframe: true }), 0, 1.4, 0, holo);
    mesh(new T.SphereGeometry(0.2, 12, 6, 0, 6.283, 0, 1.5708), basic(0x7fe3ff, { wireframe: true }), 0, 1.55, 0, holo);
    var ring = mesh(new T.RingGeometry(3.3, 3.45, 64), basic(0x4fd8ff, { transparent: true, opacity: 0.35, side: T.DoubleSide }), 0, 0.03, 0, interior);
    ring.rotation.x = -Math.PI / 2;
  })();

  // ---- screens
  function makeScreen(w, h) {
    var c = document.createElement('canvas'); c.width = 384; c.height = 192;
    var tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
    var m = new T.Mesh(new T.PlaneGeometry(w, h), basic(0xffffff, { map: tex }));
    return { mesh: m, ctx: c.getContext('2d'), tex: tex, W: c.width, H: c.height };
  }
  function wrapText(g, text, x, y, maxW, step, maxLines) {
    var words = String(text).split(' '), line = '', n = 0;
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y + n * step); n++; line = words[i]; if (n >= maxLines) return; } else line = test;
    }
    if (line && n < maxLines) g.fillText(line, x, y + n * step);
  }
  function paintScreen(sc, def, ro) {
    var g = sc.ctx, W = sc.W, H = sc.H, col = STATUS_COLOR[ro.status] || '#8892a8';
    g.fillStyle = '#07131f'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(127,227,255,.07)'; for (var y = 0; y < H; y += 4) g.fillRect(0, y, W, 1);
    g.fillStyle = '#0f2a40'; g.fillRect(0, 0, W, 36);
    g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillStyle = '#bfefff'; g.font = 'bold 20px sans-serif';
    g.fillText(def.label.toUpperCase(), 12, 19);
    g.fillStyle = col; g.beginPath(); g.arc(W - 20, 18, 8, 0, 6.283); g.fill();
    if (!ro.built) {
      g.fillStyle = '#ffd24a'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.fillText('EMPTY BAY', W / 2, 78);
      g.fillStyle = '#9fb7c9'; g.font = '16px sans-serif'; wrapText(g, ro.note || '', W / 2, 118, W - 40, 21, 3);
      sc.tex.needsUpdate = true; return;
    }
    var bars = ro.bars || [], barStep = bars.length > 2 ? 22 : 30, lines = ro.lines || [];
    var avail = H - 36 - bars.length * barStep - 8, nLines = Math.max(0, Math.min(lines.length, Math.floor(avail / 25)));
    for (var i = 0; i < nLines; i++) {
      var ly = 54 + i * 25;
      g.textAlign = 'left'; g.font = '17px sans-serif'; g.fillStyle = '#8fb4c9'; g.fillText(lines[i][0], 14, ly);
      g.textAlign = 'right'; g.font = 'bold 18px sans-serif'; g.fillStyle = '#ffffff'; g.fillText(lines[i][1], W - 14, ly);
    }
    for (var b = 0; b < bars.length; b++) {
      var by = H - 8 - (bars.length - b) * barStep + 4, bw = W - 28 - (bars.length > 2 ? 86 : 0), bx = bars.length > 2 ? 92 : 14;
      if (bars.length > 2) { g.textAlign = 'left'; g.font = '14px sans-serif'; g.fillStyle = '#8fb4c9'; g.fillText(bars[b].label, 14, by + 7); }
      g.fillStyle = '#10263a'; g.fillRect(bx, by, bw, 14);
      g.fillStyle = bars[b].color; g.fillRect(bx, by, Math.max(2, bw * Math.max(0, Math.min(1, bars[b].v))), 14);
      g.strokeStyle = '#2d5d7e'; g.lineWidth = 1; g.strokeRect(bx + 0.5, by + 0.5, bw - 1, 13);
    }
    sc.tex.needsUpdate = true;
  }
  function labelSprite(text) {
    var c = document.createElement('canvas'); c.width = 512; c.height = 112; var g = c.getContext('2d');
    g.fillStyle = 'rgba(6,14,26,.85)'; g.fillRect(0, 0, 512, 112); g.strokeStyle = '#4fd8ff'; g.lineWidth = 5; g.strokeRect(4, 4, 504, 104);
    g.fillStyle = '#e8f8ff'; g.font = 'bold 44px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 58);
    var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
    var sp = new T.Sprite(new T.SpriteMaterial({ map: t, transparent: true, depthTest: false, fog: false, opacity: 0.6 }));
    sp.scale.set(3.1, 0.68, 1); sp.renderOrder = 30; return sp;
  }

  // ---- the machines
  var STATION_H = { solar: 2.4, battery: 3.0, command: 1.1, power: 2.6, water: 2.8, heater: 2.4, crew: 3.2, o2: 3.2, greenhouse: 3.0, lab: 2.6, shield: 2.2 };
  var stationObjs = {};
  function buildStation(def) {
    var w = def.span * 2, h = STATION_H[def.id], top = 0.3 + h, g = new T.Group(), inst = new T.Group(), empty = new T.Group(), cmd = def.id === 'command';
    mesh(new T.BoxGeometry(w, 0.3, UNIT_DEPTH - 0.1), M.dark, 0, 0.15, (UNIT_DEPTH - 0.1) / 2, g);
    mesh(new T.BoxGeometry(w - 0.12, h, FZ), cmd ? M.hull2 : M.hull, 0, 0.3 + h / 2, FZ / 2, g);
    mesh(new T.BoxGeometry(w, 0.12, FZ + 0.12), M.trim, 0, top + 0.06, FZ / 2, g);
    g.add(inst, empty); empty.visible = false;
    var sw = cmd ? 3.4 : Math.min(w - 0.5, 2.8), sh = sw / 2;
    var sy = cmd ? 2.75 : top - sh / 2 - 0.25, sz = cmd ? 0.5 : FZ + 0.03;
    if (cmd) { mesh(new T.BoxGeometry(sw + 0.3, sh + 0.3, 0.2), M.dark, 0, sy, sz - 0.12, g); mesh(new T.BoxGeometry(0.5, 0.9, 0.3), M.dark, 0, 1.85, sz - 0.1, g); }
    else mesh(new T.BoxGeometry(sw + 0.14, sh + 0.14, 0.06), M.dark, 0, sy, FZ + 0.0, g);
    var sc = makeScreen(sw, sh); sc.mesh.position.set(0, sy, sz); g.add(sc.mesh);
    var ledMat = basic(0x5dff9a); mesh(new T.SphereGeometry(0.07, 8, 6), ledMat, w / 2 - 0.25, 0.55, FZ + 0.05, g);
    var label = labelSprite(def.icon + ' ' + def.label); label.position.set(0, top + 0.95, FZ - 0.3); g.add(label);
    var anim = function () {}, upd = function () {}, X;

    if (def.id === 'solar') {
      [-0.7, 0.7].forEach(function (x) {
        var p = mesh(new T.BoxGeometry(1.2, 0.06, 0.8), panelMat, x, top + 0.5, 0.8, inst); p.rotation.x = -0.45;
        mesh(new T.CylinderGeometry(0.04, 0.04, 0.4, 6), M.trim, x, top + 0.25, 0.8, inst);
      });
      for (X = 0; X < 4; X++) mesh(new T.BoxGeometry(w - 0.7, 0.05, 0.04), M.dark, 0, 0.5 + X * 0.14, FZ + 0.02, inst);
    } else if (def.id === 'battery') {
      var bg = new T.BoxGeometry(0.32, 1, 0.1); bg.translate(0, 0.5, 0);
      var cells = [], frameOn = M.dark, frameOff = M.trim;
      for (X = 0; X < 6; X++) {
        var x = (X - 2.5) * 0.6, fr = mesh(new T.BoxGeometry(0.5, 1.15, 0.25), frameOn, x, 1.0, FZ + 0.08, inst);
        var bar = new T.Mesh(bg, basic(0x5dff9a)); bar.position.set(x, 0.5, FZ + 0.19); inst.add(bar); cells.push({ fr: fr, bar: bar });
      }
      upd = function (ro) {
        var v = ro.bars[0].v;
        cells.forEach(function (c, i) {
          var on = i < (ro.racks || 1); c.fr.material = on ? frameOn : frameOff; c.bar.visible = on;
          c.bar.scale.y = Math.max(0.03, v) * 0.95; c.bar.material.color.set(ro.bars[0].color);
        });
      };
    } else if (def.id === 'command') {
      mesh(new T.BoxGeometry(w - 0.5, 0.1, 0.8), M.dark, 0, 1.48, 1.0, inst).rotation.x = 0.12;
      [0x5dff9a, 0xffd24a, 0x7fe3ff, 0xff6a5a].forEach(function (c, i) { mesh(new T.BoxGeometry(0.2, 0.06, 0.2), basic(c), -0.9 + i * 0.6, 1.56, 1.25, inst); });
    } else if (def.id === 'power') {
      var brk = [];
      for (X = 0; X < 5; X++) brk.push(mesh(new T.BoxGeometry(0.3, 0.2, 0.06), basic(0x333a44), (X - 2) * 0.6, 0.85, FZ + 0.04, inst));
      [-1.5, 1.5].forEach(function (x) { mesh(new T.CylinderGeometry(0.08, 0.08, IH - top, 8), M.dark, x, top + (IH - top) / 2, 0.2, inst); });
      upd = function (ro) {
        var col = { ON: 0x5dff9a, OFF: 0x4a5060, 'NO POWER': 0xffb25c, 'NOT BUILT': 0x22262e };
        (ro.toggles || []).forEach(function (tg, i) { if (brk[i]) brk[i].material.color.setHex(col[tg.state] || 0x333a44); });
      };
    } else if (def.id === 'water') {
      var wg = new T.CylinderGeometry(0.26, 0.26, 1, 16); wg.translate(0, 0.5, 0);
      var tanks = [];
      for (X = 0; X < 3; X++) {
        var tx = (X - 1) * 1.0;
        mesh(new T.CylinderGeometry(0.3, 0.3, 1.05, 16), M.glass, tx, 0.85, FZ, inst);
        var wm = new T.Mesh(wg, basic(0x3aa8ff, { transparent: true, opacity: 0.85 })); wm.position.set(tx, 0.35, FZ); inst.add(wm); tanks.push(wm);
      }
      var pipe = mesh(new T.CylinderGeometry(0.06, 0.06, 2.4, 8), M.trim, 0, 1.5, FZ + 0.1, inst); pipe.rotation.z = Math.PI / 2;
      mesh(new T.BoxGeometry(w - 0.4, 0.28, 0.05), hazardMat, 0, 1.0, FZ + 0.06, empty);
      upd = function (ro) { inst.visible = ro.built; empty.visible = !ro.built; tanks.forEach(function (m) { m.scale.y = Math.max(0.04, ro.bars[0].v); }); };
    } else if (def.id === 'heater') {
      var slats = [];
      for (X = 0; X < 4; X++) slats.push(mesh(new T.BoxGeometry(w - 0.7, 0.09, 0.06), basic(0xff8a3a), 0, 0.5 + X * 0.13, FZ + 0.03, inst));
      anim = function (ro, t) { var on = ro.status !== 'bad'; slats.forEach(function (s, i) { s.material.color.setHex(on ? (0.6 + 0.4 * Math.sin(t * 2 + i) > 0.7 ? 0xffa050 : 0xff7a2a) : 0x3a2a22); }); };
    } else if (def.id === 'crew') {
      [-0.9, 0.9].forEach(function (x) {
        mesh(new T.TorusGeometry(0.55, 0.07, 8, 28), M.trim, x, 1.0, FZ + 0.04, inst);
        mesh(new T.CircleGeometry(0.5, 24), basic(0x23426f), x, 1.0, FZ + 0.05, inst);
        mesh(new T.SphereGeometry(0.05, 8, 6), basic(0x7fe3ff), x, 1.55, FZ + 0.06, inst);
      });
    } else if (def.id === 'o2') {
      var cylM = new T.MeshStandardMaterial({ color: 0xdbe9ff, roughness: 0.4, metalness: 0.5 }), lv = new T.BoxGeometry(0.12, 1, 0.06); lv.translate(0, 0.5, 0);
      for (X = 0; X < 3; X++) { mesh(new T.CylinderGeometry(0.3, 0.3, 1.4, 18), cylM, (X - 1) * 1.0, 1.0, FZ, inst); mesh(new T.CylinderGeometry(0.32, 0.32, 0.1, 18), M.orange, (X - 1) * 1.0, 1.0, FZ, inst); }
      var lvl = new T.Mesh(lv, basic(0x7fe3ff)); lvl.position.set(-1.55, 0.4, FZ + 0.04); inst.add(lvl);
      upd = function (ro) { lvl.scale.y = Math.max(0.04, ro.bars[0].v) * 1.3; lvl.material.color.set(ro.bars[0].color); };
    } else if (def.id === 'greenhouse') {
      var plantMat = new T.MeshStandardMaterial({ color: 0x4fc46a, roughness: 0.7, emissive: 0x0b3a14 }), plants = [];
      [0.7, 1.25].forEach(function (sy2) {
        mesh(new T.BoxGeometry(w - 0.5, 0.07, 0.3), M.trim, 0, sy2, FZ + 0.15, inst);
        mesh(new T.BoxGeometry(w - 0.5, 0.05, 0.1), basic(0xc86bff), 0, sy2 + 0.42, FZ + 0.1, inst);
        for (var p = 0; p < 9; p++) { var pl = mesh(new T.ConeGeometry(0.12, 0.35, 6), plantMat, -2 + p * 0.5, sy2 + 0.2, FZ + 0.14, inst); plants.push({ m: pl, y: sy2 + 0.035 }); }
      });
      mesh(new T.BoxGeometry(w - 0.4, 0.28, 0.05), hazardMat, 0, 1.0, FZ + 0.06, empty);
      upd = function (ro) {
        inst.visible = ro.built; empty.visible = !ro.built;
        var s = 0.45 + 0.55 * ro.bars[0].v; plants.forEach(function (p) { p.m.scale.set(s, s, s); p.m.position.y = p.y + 0.175 * s; });
      };
    } else if (def.id === 'lab') {
      mesh(new T.BoxGeometry(w - 0.4, 0.08, 0.3), M.trim, 0, 0.95, FZ + 0.15, inst);
      mesh(new T.BoxGeometry(0.4, 0.05, 0.3), M.dark, -1.1, 1.0, FZ + 0.15, inst);
      var mic = mesh(new T.CylinderGeometry(0.06, 0.08, 0.5, 8), M.hull2, -1.1, 1.3, FZ + 0.12, inst); mic.rotation.x = -0.3;
      [0x5dff9a, 0xffd24a, 0x7fe3ff, 0xff6a5a].forEach(function (c, i) { mesh(new T.CylinderGeometry(0.07, 0.07, 0.3, 10), basic(c, { transparent: true, opacity: 0.85 }), -0.1 + i * 0.4, 1.14, FZ + 0.15, inst); });
      var blink = mesh(new T.SphereGeometry(0.06, 8, 6), basic(0xff6a5a), 1.5, 1.05, FZ + 0.3, inst);
      mesh(new T.BoxGeometry(w - 0.4, 0.28, 0.05), hazardMat, 0, 0.9, FZ + 0.06, empty);
      upd = function (ro) { inst.visible = ro.built; empty.visible = !ro.built; };
      anim = function (ro, t) { blink.visible = ro.built && Math.sin(t * 5) > 0; };
    } else if (def.id === 'shield') {
      var emb = mesh(new T.TorusGeometry(0.26, 0.05, 8, 28), basic(0x7fe3ff), 0, 0.62, FZ + 0.04, inst);
      upd = function (ro) { emb.material.color.setHex(ro.built ? 0x7fe3ff : 0x59606e); };
    }
    // place against its wall, front facing into the room
    var hx = IW / 2, hz = ID / 2;
    if (def.wall === 'N') g.position.set(def.at, 0, -hz);
    else if (def.wall === 'S') { g.position.set(def.at, 0, hz); g.rotation.y = Math.PI; }
    else if (def.wall === 'W') { g.position.set(-hx, 0, def.at); g.rotation.y = Math.PI / 2; }
    else { g.position.set(hx, 0, def.at); g.rotation.y = -Math.PI / 2; }
    interior.add(g);
    return { def: def, sc: sc, led: ledMat, label: label, upd: upd, anim: anim, ro: null };
  }
  STATIONS.forEach(function (d) { stationObjs[d.id] = buildStation(d); });

  // glowing ring on the floor in front of the machine you are standing at
  var selRing = mesh(new T.RingGeometry(0.85, 1.1, 40), basic(0x4fd8ff, { transparent: true, opacity: 0.9, side: T.DoubleSide }), 0, 0.05, 0, interior);
  selRing.rotation.x = -Math.PI / 2; selRing.visible = false;
  function frontOf(d) {
    var b = stationBox(d);
    return d.wall === 'N' ? { x: d.at, z: b.z1 + 0.9 } : d.wall === 'S' ? { x: d.at, z: b.z0 - 0.9 } : d.wall === 'W' ? { x: b.x1 + 0.9, z: d.at } : { x: b.x0 - 0.9, z: d.at };
  }

  var inMode = false, lastScreens = -1;
  function setInterior(on, act) {
    inMode = on; lastScreens = -1;
    outdoorNodes.forEach(function (o) { o.visible = !on; });
    interior.visible = on;
    outdoorLights.forEach(function (o) { o.l.intensity = o.base * (on ? 0.15 : 1); });
    inLights.forEach(function (o) { o.l.intensity = on ? o.on : 0; });
    scene.fog.near = on ? 3000 : 170; scene.fog.far = on ? 6000 : 660;
    renderer.setClearColor(on ? 0x05080f : 0x000000);
    astro.scale.setScalar(on ? 1.15 : 2);
    var th = on ? 0 : act.astro.heading;      // inside: look north from the south side; outside: look back at the habitat door
    des.sph.set(on ? 15 : 16, on ? 1.0 : 1.05, th); cur.sph.copy(des.sph);
    if (on) { des.target.set(act.inside.x, 1.8, act.inside.z); cur.target.copy(des.target); }
    else { des.target.set(act.astro.x, 2, act.astro.z); cur.target.copy(des.target); }
  }
  function updateInterior(t, ins) {
    if (t - lastScreens > 0.35) {
      lastScreens = t;
      var sim = opts.getSim ? opts.getSim() : null;
      if (sim) STATIONS.forEach(function (d) {
        var so = stationObjs[d.id], ro = stationReadout(d.id, sim); so.ro = ro;
        paintScreen(so.sc, d, ro); so.led.color.set(STATUS_COLOR[ro.status] || '#8892a8'); so.upd(ro);
      });
    }
    STATIONS.forEach(function (d) { var so = stationObjs[d.id]; if (so.ro) so.anim(so.ro, t); so.label.material.opacity = ins.station === d.id ? 1 : 0.55; });
    holo.rotation.y = t * 0.6; holo.position.y = Math.sin(t * 1.5) * 0.05;
    var cs = ins.station && STATION_BY_ID[ins.station];
    selRing.visible = !!cs;
    if (cs) { var f = frontOf(cs); selRing.position.set(f.x, 0.05, f.z); selRing.scale.setScalar(1 + 0.12 * Math.sin(t * 5)); }
  }

  /* ------------------------------------------------------ camera controls */
  var cur = { target: new T.Vector3(0, 9, 0), sph: new T.Spherical() };
  var des = { target: new T.Vector3(0, 9, 0), sph: new T.Spherical() };
  function setView(pos, target, instant) {
    des.target.copy(target);
    des.sph.setFromVector3(pos.clone().sub(target));
    if (instant) { cur.target.copy(des.target); cur.sph.copy(des.sph); return; }
    while (des.sph.theta - cur.sph.theta > Math.PI) des.sph.theta -= Math.PI * 2;
    while (des.sph.theta - cur.sph.theta < -Math.PI) des.sph.theta += Math.PI * 2;
  }

  // One camera only: a chase view that tracks the astronaut (or the rover while he is driving).
  // Dragging still orbits it and scrolling / pinching still zooms.
  var followMode = true;
  (function () {
    var fo = astro;
    var p = new T.Vector3(fo.position.x - 9, fo.position.y + 6, fo.position.z + 11);
    setView(p, new T.Vector3(fo.position.x, fo.position.y + 2, fo.position.z), true);
  })();

  var ptrs = new Map();
  var canvasListeners = [];          // every canvas listener is removed again in the cleanup function
  function onCanvas(name, fn, o) { canvas.addEventListener(name, fn, o); canvasListeners.push([name, fn, o]); }
  onCanvas('pointerdown', function (e) {
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { }
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  });
  onCanvas('pointermove', function (e) {
    var p = ptrs.get(e.pointerId); if (!p) return;
    if (ptrs.size === 1) {
      des.sph.theta -= (e.clientX - p.x) * 0.0045;
      des.sph.phi = clamp(des.sph.phi - (e.clientY - p.y) * 0.0045, 0.25, 1.6);
    } else if (ptrs.size === 2) {
      var other = null; ptrs.forEach(function (v, id) { if (id !== e.pointerId) other = v; });
      if (other) {
        var before = Math.hypot(p.x - other.x, p.y - other.y), after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
        des.sph.radius = clamp(des.sph.radius * before / Math.max(after, 1), 6, 50);
      }
    }
    p.x = e.clientX; p.y = e.clientY;
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) {
    onCanvas(n, function (e) { ptrs.delete(e.pointerId); });
  });
  onCanvas('wheel', function (e) {
    e.preventDefault();
    des.sph.radius = clamp(des.sph.radius * Math.exp(e.deltaY * 0.001), 6, 50);
  }, { passive: false });

  /* -------------------------------------------------------------- resize */
  function resize() {
    var w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 1 ? 60 : 45;
    camera.updateProjectionMatrix();
  }
  var resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  window.addEventListener('resize', resize);
  resize();

  /* ---------------------------------------------------------- render loop */
  // Purchased structures are reflected in the 3D world on the next render frame.
  var lastBuildSignature = '';
  function syncBuildVisuals() {
    if (!opts.getBuildState) return;
    var st = opts.getBuildState(); if (!st) return;
    var sig = [st.systems?.greenhouse?.built, st.systems?.waterRecycler?.built, st.systems?.scienceLab?.built, st.panels, st.max?.power, st.roverUpgraded, st.radiationShield, (st.upgrades || []).join(',')].join('|');
    if (sig === lastBuildSignature) return;
    lastBuildSignature = sig;
    dome.visible = !!st.systems?.greenhouse?.built;
    corridors.visible = !!(st.systems?.waterRecycler?.built || st.systems?.greenhouse?.built || st.systems?.scienceLab?.built || st.roverUpgraded);
    tankFarm.visible = !!st.systems?.waterRecycler?.built;
    solarGroup.visible = (st.panels || 0) > 1;
    mods.A.visible = !!st.systems?.waterRecycler?.built;
    mods.B.visible = !!st.roverUpgraded;
    mods.C.visible = (st.max?.power || 0) > 200;
    mods.D.visible = !!st.radiationShield;
    mods.E.visible = !!st.systems?.scienceLab?.built;
    tower.visible = !!st.systems?.scienceLab?.built;
    dishPivot.visible = !!st.systems?.scienceLab?.built;
    pad.visible = !!st.roverUpgraded;
    if (st.radiationShield && !hub.userData.shield) {
      var shield = new T.Mesh(new T.TorusGeometry(8.4, 0.16, 10, 64), new T.MeshBasicMaterial({ color: 0x61d9ff, transparent: true, opacity: 0.8 }));
      shield.rotation.x = Math.PI / 2; shield.position.y = 1.1; hub.add(shield); hub.userData.shield = shield;
    }
  }

  var clock = new T.Clock(), tmp = new T.Vector3(), rafId = 0, disposed = false;
  var gait = 0, stride = 0, lastT = 0;
  function frame() {
    if (disposed) return;
    var t = clock.getElapsedTime();
    syncBuildVisuals();
    var dtF = Math.min(0.1, t - lastT); lastT = t;

    var act = opts.getActors ? opts.getActors() : null;
    var ins = !!(act && act.inside && act.inside.active);
    if (ins !== inMode) setInterior(ins, act);
    if (act) {
      // The mission runner decides where the astronaut and rover are; the scene only draws them on the terrain.
      var ar = act.rover, aa = act.astro, mk = act.marker;
      rover.position.set(ar.x, terrainH(ar.x, ar.z), ar.z);
      rover.rotation.y = ar.heading;
      roverWheels.forEach(function (wheel) { wheel.rotation.z += ar.speed > 0 ? 0.05 + ar.speed * 0.1 : 0; });
      astro.visible = aa.visible;
      var walking = aa.mode === 'walk', working = aa.mode === 'work';
      // gait blends in and out so he eases into a stride and settles when he stops
      gait += ((walking ? 1 : 0) - gait) * 0.14;
      stride += dtF * 5.2 * gait * (aa.pace || 1);
      var hop = Math.abs(Math.sin(stride)) * 0.2 * gait * Math.min(1.4, aa.pace || 1);           // low-gravity lope
      astro.position.set(aa.x, terrainH(aa.x, aa.z) - 0.05 + hop, aa.z);
      astro.rotation.y = aa.heading;
      if (ins) { astro.position.set(act.inside.x, hop, act.inside.z); astro.rotation.y = act.inside.heading; }   // walking around inside the habitat
      torso.rotation.x = 0.1 * gait;                               // lean into the stride
      astronautLegs.forEach(function (leg, i) { leg.rotation.x = Math.sin(stride + i * Math.PI) * 0.65 * gait; });
      astronautArms.forEach(function (arm, i) {
        arm.rotation.z = (i === 0 ? -1 : 1) * 0.14;
        arm.rotation.x = working ? -1.15 + Math.sin(t * 9 + i * 2) * 0.22 : Math.sin(stride + i * Math.PI + Math.PI) * 0.5 * gait;
      });
      var show = !!mk.active;
      objRing.visible = objBeam.visible = show;
      if (show) {
        var my = terrainH(mk.x, mk.z), pl = 0.5 + 0.5 * Math.sin(t * 4), good = !!mk.inside;
        objRing.position.set(mk.x, my + 0.2, mk.z); objRing.scale.setScalar(1 + pl * 0.1 + (good ? 0.12 : 0));
        objBeam.position.set(mk.x, my + 7, mk.z); objBeam.material.opacity = 0.2 + pl * 0.25;
        var col = good ? 0x5dff9a : 0x4fd8ff;
        objRing.material.color.setHex(col); objBeam.material.color.setHex(col);
        // yellow guide arrow above whoever the player is controlling
        var gp = astro.visible ? astro : rover, gx = mk.x - gp.position.x, gz = mk.z - gp.position.z, gd = Math.hypot(gx, gz);
        guide.visible = gd > 4.5;
        if (guide.visible) {
          guide.position.set(gp.position.x + gx / gd * 1.2, gp.position.y + (astro.visible ? 6.3 : 4.6) + Math.sin(t * 5) * 0.25, gp.position.z + gz / gd * 1.2);
          guide.rotation.y = Math.atan2(gx, gz);
        }
      } else guide.visible = false;
      if (ins) { objRing.visible = objBeam.visible = guide.visible = false; }
      if (followMode) { var fo = astro.visible ? astro : rover; des.target.set(fo.position.x, fo.position.y + 2, fo.position.z); }
    } else {
      // Continuous lunar field activity: rover patrols the regolith and the
      // astronaut walks a nearby survey loop, following the generated terrain.
      var roverAngle = t * 0.105;
      var roverX = -6 + Math.cos(roverAngle) * 15;
      var roverZ = 17 + Math.sin(roverAngle) * 10;
      rover.position.set(roverX, terrainH(roverX, roverZ), roverZ);
      rover.rotation.y = Math.atan2(-Math.cos(roverAngle) * 10, -Math.sin(roverAngle) * 15);
      roverWheels.forEach(function (wheel) { wheel.rotation.z += 0.035; });

      var walkAngle = t * 0.16;
      var astroX = AX + Math.cos(walkAngle) * 7.5;
      var astroZ = AZ + Math.sin(walkAngle) * 5.5;
      astro.position.set(astroX, terrainH(astroX, astroZ) - 0.05 + Math.abs(Math.sin(t * 3.2)) * 0.035, astroZ);
      astro.rotation.y = Math.atan2(-Math.cos(walkAngle) * 5.5, -Math.sin(walkAngle) * 7.5);
      astronautLegs.forEach(function (leg, i) { leg.rotation.x = Math.sin(t * 3.2 + i * Math.PI) * 0.45; });
      astronautArms.forEach(function (arm, i) { arm.rotation.z = (i === 0 ? -1 : 1) * 0.14; arm.rotation.x = Math.sin(t * 3.2 + i * Math.PI + Math.PI) * 0.35; });

    }

    if (ins) { des.sph.radius = clamp(des.sph.radius, 7, 28); des.sph.phi = clamp(des.sph.phi, 0.45, 1.3); }
    cur.target.lerp(des.target, 0.07);
    cur.sph.radius += (des.sph.radius - cur.sph.radius) * 0.07;
    cur.sph.phi += (des.sph.phi - cur.sph.phi) * 0.07;
    cur.sph.theta += (des.sph.theta - cur.sph.theta) * 0.07;
    tmp.setFromSpherical(cur.sph);
    camera.position.copy(cur.target).add(tmp);
    if (!ins) camera.position.y = Math.max(camera.position.y, terrainH(camera.position.x, camera.position.z) + 1.8);
    camera.lookAt(cur.target);
    if (opts.setCameraTheta) opts.setCameraTheta(cur.sph.theta);

    sky.position.copy(camera.position);
    stars.position.copy(camera.position);

    var pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
    beacon.material.color.setRGB(0.35 + pulse * 0.65, 0.2 + pulse * 0.2, 0.18);
    beaconLight.intensity = 0.2 + pulse * 1.3;
    tower.userData.glow.material.opacity = 0.25 + pulse * 0.75;

    dishPivot.rotation.y = t * 0.25;
    torso.scale.y = 1 + Math.sin(t * 1.4) * 0.006;
    head.rotation.y = Math.sin(t * 0.35) * 0.18;
    head.rotation.x = Math.sin(t * 0.22) * 0.04 - 0.04;

    if (ins) updateInterior(t, act.inside);
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(frame);
  }
  frame();

  return function cleanupHalcyonRidge() {
    disposed = true;
    cancelAnimationFrame(rafId);
    resizeObserver.disconnect();
    window.removeEventListener('resize', resize);
    canvasListeners.forEach(function (l) { canvas.removeEventListener(l[0], l[1], l[2]); });
    canvasListeners.length = 0; ptrs.clear();
    function disposeMaterial(m) {
      ['map', 'emissiveMap', 'alphaMap', 'bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap'].forEach(function (k) { if (m[k] && m[k].dispose) m[k].dispose(); });
      m.dispose();
    }
    scene.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach(disposeMaterial);
        else disposeMaterial(o.material);
      }
    });
    renderer.dispose();
  };
}
