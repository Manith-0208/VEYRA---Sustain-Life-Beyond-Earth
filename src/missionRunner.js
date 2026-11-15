/* MISSION RUNNER  (player-controlled)
   The player walks the astronaut over the lunar surface (keyboard, on-screen joystick) to the glowing ring that
   marks where each objective is done, and stands in the ring until the job is finished. Some objectives need the
   rover: the player walks to it, hops in (E / button), drives to the ring, and hops out again.
   Nothing moves by itself. Progress (chapter, mission, objective, completed list, unpaid rewards) is saved in
   browser local storage, so closing the window or reloading the page never restarts a mission.

   The 3D scene reads getActors() every frame; the UI reads getSnapshot() (React useSyncExternalStore). */
import { FIELD_CAMPAIGNS, SIDE_QUESTS } from './missions.js';
import { DOOR_OUT, SPAWN_IN, collideInterior, nearestStation, nearAirlock } from './interior.js';

const KEY = 'missionvoid-mission-runner-v2';
const OLD_KEY = 'missionvoid-field-operations';       // progress saved by the old manual Field Operations window
const CHAPTERS = Object.keys(FIELD_CAMPAIGNS).map(Number).sort((a, b) => a - b);
const WALK = 7.5, RUN_MULT = 1.7, DRIVE = 16;         // world units per second
const RING_R = 2.4;                                   // how close you must be to the glowing ring
const WORLD_R = 62;                                   // edge of the playable moon
const START = [-6, 23];

/* ------------------------------------------------------------------ world (matches outpostScene.js) */
const ROVER_BAY = [-6, 17];
const OBST = [
  [0, 0, 8.8], [-14, 5, 5.6], [-26, 2, 4.2], [12, 9, 4.8], [23, 1, 3.9], [-3, -19, 9.8],
  [13, -10, 3.6], [-19, -12, 7.4], [24, -14, 2.2], [27.5, -14, 2.2], [24, -17.5, 2.4], [28, 22, 9.6], [-2.5, 13.5, 1.0]
];
for (let row = 0; row < 2; row++) for (let i = 0; i < 4; i++) OBST.push([-34 + i * 5.4, -22 - row * 5.6, 3.0]);

/* where each kind of objective is done: ring point (a) and the thing to face (f) */
const ZONES = {
  robot:   { name: 'the scientist robot', a: [-4.8, 12.2], f: [-2.5, 13.5] },
  hub:     { name: 'the habitat hub', a: [-5.8, 9.3], f: [-5.65, 5.1] },
  solar:   { name: 'the solar array', a: [-28, -16], f: [-26, -22] },
  dome:    { name: 'the greenhouse dome', a: [-19, -3], f: [-19, -12] },
  tanks:   { name: 'the tank farm', a: [20, -9], f: [24, -14] },
  moduleA: { name: 'life-support module A', a: [-14, 13.5], f: [-14, 5] },
  moduleB: { name: 'workshop module B', a: [-26, 9], f: [-26, 2] },
  moduleC: { name: 'power module C', a: [12, 16], f: [12, 9] },
  moduleD: { name: 'storage module D', a: [30, 1], f: [23, 1] },
  moduleE: { name: 'laboratory module E', a: [-3, -30], f: [-3, -19] },
  tower:   { name: 'the comms tower', a: [17, -4], f: [13, -10] },
  pad:     { name: 'the landing pad', a: [17, 26], f: [28, 22] },
  rover:   { name: 'the rover', a: [-8.6, 17.6], f: ROVER_BAY }
};
const SURVEY = [[-34, 24], [-14, 32], [8, 36], [44, 8], [42, -10], [30, -30], [8, -40], [-18, -42], [-46, -14], [-48, 10], [-24, 40], [46, 32]];

/* ordered keyword rules: first match decides where the objective is performed */
const RULES = [
  [/^accept|briefing/i, 'robot'],
  [/submit|upload|deliver|science station|return and|return to the scientist/i, 'robot'],
  [/\brover\b|wheel|engine|cargo/i, 'rover'],
  [/solar|panel|array|dust/i, 'solar'],
  [/greenhouse|crop|seed|plant|growing|hydroponic|harvest|tray/i, 'dome'],
  [/water|recycler|tank|filter|pipe|refill/i, 'tanks'],
  [/oxygen|life[- ]support|habitat|shelter|seal|cabin|crew|door/i, 'hub'],
  [/battery|storage rack|backup|charging|power|energy|distribution|consumption|low-light|night/i, 'moduleC'],
  [/communications|navigation|research|mars|technolog/i, 'tower'],
  [/construct|module|assembl|component|install|prototype|robotic|helper|connection|connect/i, 'moduleB'],
  [/supplies|inventory|food|tools|spare|emergency/i, 'moduleE'],
  [/scan|survey|sample|collect|locat|site|marked|deposit|terrain|measure|record|temperature|radiation|mineral|soil|material|compare|mark|classif|analys|simulation|plan/i, 'survey']
];
const DRIVE_RE = /\bdrive\b|driving|checkpoint|navigate around|transport/i;

const hyp = Math.hypot;
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

/* push a position out of every building / rock and keep it on the playable moon */
function collide(a, pad) {
  for (const o of OBST) {
    const dx = a.x - o[0], dz = a.z - o[1], d = hyp(dx, dz), min = o[2] + pad;
    if (d < min) {
      if (d < 1e-4) { a.x = o[0] + min; }
      else { a.x = o[0] + dx / d * min; a.z = o[1] + dz / d * min; }
    }
  }
  const rr = hyp(a.x, a.z);
  if (rr > WORLD_R) { a.x *= WORLD_R / rr; a.z *= WORLD_R / rr; }
}

/* ------------------------------------------------------------------ objective planning */
function planStep(label, chapter, mi, si, prevVehicle) {
  let zone = 'survey';
  for (const [re, z] of RULES) if (re.test(label)) { zone = z; break; }
  let vehicle = DRIVE_RE.test(label) || (prevVehicle && zone !== 'robot' && zone !== 'rover');
  const enter = zone === 'rover' && /enter/i.test(label);
  if (enter) vehicle = false;
  let a, f, name;
  if (zone === 'survey') {
    const p = SURVEY[(chapter * 7 + mi * 3 + si * 2) % SURVEY.length];
    a = p; f = [p[0] + 3, p[1] + 2]; name = 'a marked survey site';
  } else { a = ZONES[zone].a; f = ZONES[zone].f; name = ZONES[zone].name; }
  if (vehicle && zone === 'rover') { const p = SURVEY[(chapter * 5 + mi + si) % SURVEY.length]; a = p; f = [p[0] + 3, p[1] + 2]; name = 'a marked survey site'; zone = 'survey'; }
  let dur = 2.4 + Math.min(1.8, label.length / 28);
  if (zone === 'robot') dur = /^accept/i.test(label) ? 2.2 : 3;
  if (enter) dur = 1;
  return { zone, a, f, name, vehicle, enter, dur };
}

/* ------------------------------------------------------------------ the runner */
function createRunner() {
  const store = (typeof localStorage !== 'undefined') ? localStorage : null;
  const S = { chapter: CHAPTERS[0], mi: 0, step: 0, completed: [], unpaid: [], running: true, finished: false };
  const M = { phase: 'gap', timer: 2, work: 0, dur: 5, plan: null, activity: 'Get ready, Explorer! Your first mission is about to begin.', prevVehicle: false, started: false, arrived: false, lost: 0, near: false, nearDoor: false, dist: 0 };
  const astro = { x: START[0], z: START[1], heading: Math.atan2(-START[0], -START[1]), visible: true, mode: 'idle', speedNow: 0, pace: 0 };
  const rover = { x: ROVER_BAY[0], z: ROVER_BAY[1], heading: 0.6, speed: 0, driven: false };
  const marker = { x: 0, z: 0, active: false, progress: 0, inside: false };
  // Inside the habitat the player walks in room coordinates; the outdoor astronaut waits at the door.
  const I = { active: false, x: SPAWN_IN.x, z: SPAWN_IN.z, heading: SPAWN_IN.heading, speedNow: 0, pace: 0, station: null, nearExit: false, justSwitched: 0 };
  const AXES = { kb: [0, 0], pad: [0, 0] };           // [right, forward] relative to the camera
  let camTheta = 0, running = false;
  let subs = new Set(), evs = new Set(), snap = null, lastPub = 0, lastSave = 0, timerId = 0, rafId = 0;

  const mission = (c = S.chapter, i = S.mi) => FIELD_CAMPAIGNS[c]?.missions[i];
  const key = (c, i) => `${c}-${i}`;
  const nextOf = (c, i) => { if (FIELD_CAMPAIGNS[c].missions[i + 1]) return [c, i + 1]; const k = CHAPTERS.indexOf(c); return CHAPTERS[k + 1] ? [CHAPTERS[k + 1], 0] : null; };
  const firstOpen = () => { for (const c of CHAPTERS) for (let i = 0; i < FIELD_CAMPAIGNS[c].missions.length; i++) if (!S.completed.includes(key(c, i))) return [c, i]; return null; };

  function load() {
    let saved = null, old = null;
    try { saved = JSON.parse(store?.getItem(KEY) || 'null'); } catch (e) { }
    try { old = JSON.parse(store?.getItem(OLD_KEY) || 'null'); } catch (e) { }
    const src = saved || old;
    if (src) {
      if (Array.isArray(src.completed)) S.completed = src.completed.filter(k => /^\d+-\d+$/.test(k));
      if (saved) { S.unpaid = Array.isArray(saved.unpaid) ? saved.unpaid : []; S.running = saved.running !== false; if (saved.phase === 'choice') { M.phase = 'choice'; M.activity = 'Mission complete! Take a break, explore the base, or choose when to start the next mission.'; } }
    }
    const open = firstOpen();
    if (!open) { S.finished = true; return; }
    if (src && mission(src.chapter, src.missionIndex ?? src.mi) && !S.completed.includes(key(src.chapter, src.missionIndex ?? src.mi))) {
      S.chapter = src.chapter; S.mi = src.missionIndex ?? src.mi; S.step = Math.max(0, Math.min(mission(S.chapter, S.mi)[2].length - 1, Number.isInteger(src.step) ? src.step : 0));
    } else { [S.chapter, S.mi] = open; S.step = 0; }
  }
  function save() {
    lastSave = Date.now();
    try { store?.setItem(KEY, JSON.stringify({ chapter: S.chapter, mi: S.mi, step: S.step, completed: S.completed, unpaid: S.unpaid, running: S.running, phase: M.phase })); } catch (e) { }
  }
  const emit = (type, extra) => evs.forEach(f => { try { f({ type, ...extra }); } catch (e) { console.warn(e); } });

  function buildSnapshot() {
    const m = mission(), steps = m ? m[2] : [];
    const nx = S.finished ? null : nextOf(S.chapter, S.mi);
    const nm = nx ? mission(nx[0], nx[1]) : null;
    const done = S.completed.map(k => { const [c, i] = k.split('-').map(Number), mm = mission(c, i); return mm ? { key: k, chapter: c, index: i, title: mm[0], coins: mm[5], science: mm[6] } : null; }).filter(Boolean);
    const total = CHAPTERS.reduce((s, c) => s + FIELD_CAMPAIGNS[c].missions.length, 0);
    return {
      running: S.running, finished: S.finished, chapter: S.chapter, chapterTitle: FIELD_CAMPAIGNS[S.chapter]?.title, missionIndex: S.mi, step: S.step,
      phase: M.phase, activity: M.activity, stepProgress: M.phase === 'work' ? Math.min(1, M.work / M.dur) : 0,
      driving: rover.driven, nearRover: M.near, nearDoor: M.nearDoor, inside: I.active, station: I.station, nearExit: I.nearExit, dist: Math.round(M.dist),
      mission: m ? { title: m[0], description: m[1], steps, tool: m[3], equipment: m[4], coins: m[5], science: m[6] } : null,
      sideQuest: SIDE_QUESTS[S.chapter]?.[S.mi] || null,
      next: nm ? { chapter: nx[0], index: nx[1], chapterTitle: FIELD_CAMPAIGNS[nx[0]].title, title: nm[0], description: nm[1], coins: nm[5], science: nm[6] } : null,
      completed: done, totalMissions: total,
      earnedCoins: done.reduce((s, d) => s + d.coins, 0), earnedScience: done.reduce((s, d) => s + d.science, 0)
    };
  }
  function publish(force) {
    const n = performance.now ? performance.now() : Date.now();
    if (!force && n - lastPub < 250) return;
    lastPub = n; snap = buildSnapshot(); subs.forEach(f => f());
  }

  /* ---- player movement ---- */
  function worldMove() {
    const r = AXES.kb[0] + AXES.pad[0], f = AXES.kb[1] + AXES.pad[1];
    const len = hyp(r, f);
    if (len < 0.08) return [0, 0, 0];
    const nr = r / len, nf = f / len;
    const fx = -Math.sin(camTheta), fz = -Math.cos(camTheta);   // where the camera looks (on the ground)
    const rx = -fz, rz = fx;                                     // camera's right-hand side
    return [fx * nf + rx * nr, fz * nf + rz * nr, Math.min(1, len)];
  }
  let sprint = false;
  function movePlayer(h) {
    astro.speedNow = 0; astro.pace = 0; rover.speed = 0; I.speedNow = 0; I.pace = 0;
    const [dx, dz, mag] = worldMove();
    if (mag === 0) return;
    if (I.active) {
      const spd = WALK * 0.55 * (sprint ? 1.5 : 1) * mag;
      I.x += dx * spd * h; I.z += dz * spd * h;
      I.heading += angDiff(I.heading, Math.atan2(dx, dz)) * Math.min(1, h * 12);
      collideInterior(I, 0.7);
      I.speedNow = spd; I.pace = spd / WALK;
      return;
    }
    if (!rover.driven) {
      const spd = WALK * (sprint ? RUN_MULT : 1) * mag;
      astro.x += dx * spd * h; astro.z += dz * spd * h;
      astro.heading += angDiff(astro.heading, Math.atan2(dx, dz)) * Math.min(1, h * 12);
      collide(astro, 0.8);
      astro.speedNow = spd; astro.pace = spd / WALK;
    } else {
      const want = Math.atan2(-dz, dx), diff = angDiff(rover.heading, want);
      rover.heading += diff * Math.min(1, h * 3.5);
      const spd = DRIVE * mag * Math.max(0.15, Math.cos(diff));   // slows down while turning around
      rover.x += Math.cos(rover.heading) * spd * h; rover.z += -Math.sin(rover.heading) * spd * h;
      collide(rover, 2.0);
      rover.speed = 1;
    }
  }

  /* ---- mission flow ---- */
  const stepLabel = () => mission()[2][S.step];
  function startMission() {
    M.started = true; M.prevVehicle = false;
    const m = mission();
    emit('mission-start', { chapter: S.chapter, index: S.mi, title: m[0], description: m[1] });
    beginStep();
  }
  function beginStep() {
    const label = stepLabel();
    M.plan = planStep(label, S.chapter, S.mi, S.step, M.prevVehicle);
    M.work = 0; M.dur = M.plan.dur; M.arrived = false; M.lost = 0; M.phase = 'go';
    marker.x = M.plan.a[0]; marker.z = M.plan.a[1]; marker.active = true; marker.progress = 0; marker.inside = false;
    emit('step', { chapter: S.chapter, index: S.mi, step: S.step, label, total: mission()[2].length });
    save(); publish(true);
  }
  function finishStep() {
    M.prevVehicle = !!M.plan.vehicle && !(mission()[2].length - 1 === S.step);
    if (S.step + 1 < mission()[2].length) { emit('step-done', { step: S.step }); S.step++; beginStep(); return; }
    // mission complete
    const m = mission(), k = key(S.chapter, S.mi);
    marker.active = false; marker.inside = false;
    if (!S.completed.includes(k)) { S.completed.push(k); S.unpaid.push({ key: k, coins: m[5], science: m[6], title: m[0] }); }
    emit('mission-complete', { chapter: S.chapter, index: S.mi, title: m[0], coins: m[5], science: m[6] });
    const nx = nextOf(S.chapter, S.mi);
    if (nx) {
      if (nx[0] !== S.chapter) emit('chapter-complete', { chapter: S.chapter, next: nx[0] });
      [S.chapter, S.mi] = nx; S.step = 0; M.phase = 'choice'; M.timer = 0; M.plan = null; M.activity = 'Mission complete! Take a break, explore the base, or choose when to start the next mission.';
    } else { S.finished = true; M.phase = 'done'; M.activity = 'Every mission is complete! Explore the Moon as much as you like.'; emit('all-complete', {}); }
    save(); publish(true);
  }

  function missionStep(h) {
    if (M.phase === 'gap') {
      M.timer -= h; M.activity = `Get ready, Explorer! Next mission in ${Math.max(0, Math.ceil(M.timer))}…`;
      if (M.timer <= 0) startMission();
      return;
    }
    if (M.phase === 'choice') return;
    if (M.phase === 'done' || !M.plan) return;
    const P = M.plan, drv = rover.driven, pos = drv ? rover : astro;
    const d = hyp(pos.x - marker.x, pos.z - marker.z);
    M.dist = d;
    const inRing = d < RING_R;
    const ok = P.enter ? drv : P.vehicle ? (drv && inRing) : (!drv && inRing);
    marker.inside = ok && !P.enter;
    if (ok) {
      if (!M.arrived && !P.enter) { M.arrived = true; emit('arrive', { name: P.name }); }
      M.phase = 'work'; M.lost = 0;
      if (!drv && !P.enter && astro.speedNow === 0) astro.heading += angDiff(astro.heading, Math.atan2(P.f[0] - astro.x, P.f[1] - astro.z)) * Math.min(1, h * 5);
      M.work += h; marker.progress = Math.min(1, M.work / M.dur);
      M.activity = `${stepLabel()} — ${Math.round(marker.progress * 100)}%`;
      if (M.work >= M.dur) finishStep();
    } else {
      M.phase = 'go'; M.lost += h;
      if (M.lost > 25) { M.lost = 0; emit('nudge', {}); }
      if (P.enter) M.activity = 'Walk to the rover and hop in! Press E or tap the button.';
      else if (P.vehicle && !drv) M.activity = 'This job needs the rover! Walk to it and press E to hop in.';
      else if (P.vehicle && drv) M.activity = `Drive the rover to the glowing ring at ${P.name}.`;
      else if (drv) M.activity = 'Press E to hop out of the rover. This job is done on foot!';
      else M.activity = `Walk to the glowing ring at ${P.name}.`;
    }
  }

  function tickOnce(h) {
    if (!S.running) { astro.speedNow = 0; astro.pace = 0; rover.speed = 0; I.speedNow = 0; I.pace = 0; astro.mode = 'idle'; return; }
    movePlayer(h);
    if (I.active) {
      // Inside the habitat the missions wait for you; walk around, learn, and go back out when you are ready.
      const st = nearestStation(I.x, I.z), ex = nearAirlock(I.x, I.z);
      if (st !== I.station) { I.station = st; if (st) emit('station-near', { id: st }); publish(true); }
      if (ex !== I.nearExit) { I.nearExit = ex; publish(true); }
      astro.mode = I.speedNow > 0 ? 'walk' : 'idle'; astro.speedNow = I.speedNow; astro.pace = I.pace; astro.visible = true;
      return;
    }
    if (!S.finished) missionStep(h);
    else M.dist = 0;
    const working = !S.finished && M.phase === 'work' && marker.inside;
    astro.mode = rover.driven ? 'hidden' : astro.speedNow > 0 ? 'walk' : working ? 'work' : 'idle';
    astro.visible = !rover.driven;
    const near = !rover.driven && hyp(astro.x - rover.x, astro.z - rover.z) < 6.5;
    if (near !== M.near) { M.near = near; publish(true); }
    const nd = !rover.driven && hyp(astro.x - DOOR_OUT.x, astro.z - DOOR_OUT.z) < 5.5;
    if (nd !== M.nearDoor) { M.nearDoor = nd; publish(true); }
  }

  /* ---- going into and out of the habitat ---- */
  function enterHabitat() {
    if (I.active || rover.driven || !S.running || !M.nearDoor) return false;
    I.active = true; I.x = SPAWN_IN.x; I.z = SPAWN_IN.z; I.heading = SPAWN_IN.heading; I.station = null; I.nearExit = false;
    M.savedActivity = M.activity; M.activity = 'Inside the habitat. Your mission waits for you outside.';
    AXES.kb = [0, 0]; AXES.pad = [0, 0];
    emit('habitat-enter', {}); publish(true);
    return true;
  }
  function exitHabitat() {
    if (!I.active) return false;
    I.active = false; I.station = null; I.nearExit = false;
    // step out through the door and stand just outside it, facing away from the habitat
    astro.x = DOOR_OUT.x + DOOR_OUT.nx * 4.6; astro.z = DOOR_OUT.z + DOOR_OUT.nz * 4.6;
    astro.heading = Math.atan2(DOOR_OUT.nx, DOOR_OUT.nz); astro.visible = true; astro.mode = 'idle';
    collide(astro, 0.8);
    M.activity = M.savedActivity || M.activity; M.lost = 0; M.nearDoor = true;
    AXES.kb = [0, 0]; AXES.pad = [0, 0];
    emit('habitat-exit', {}); publish(true);
    return true;
  }

  load();
  function resetCampaign() {
    // Clear both current and legacy progress so the restart genuinely begins at Chapter 1.
    try { store?.removeItem(KEY); store?.removeItem(OLD_KEY); } catch (e) { }
    S.chapter = CHAPTERS[0]; S.mi = 0; S.step = 0;
    S.completed = []; S.unpaid = []; S.running = false; S.finished = false;
    M.phase = 'gap'; M.timer = 2; M.work = 0; M.dur = 5; M.plan = null;
    M.activity = 'New expedition. Get ready, Explorer!'; M.prevVehicle = false;
    M.started = false; M.arrived = false; M.lost = 0; M.near = false; M.nearDoor = false; M.dist = 0;
    I.active = false; I.station = null; I.nearExit = false;
    astro.x = START[0]; astro.z = START[1]; astro.heading = Math.atan2(-START[0], -START[1]);
    astro.visible = true; astro.mode = 'idle'; astro.speedNow = 0; astro.pace = 0;
    rover.x = ROVER_BAY[0]; rover.z = ROVER_BAY[1]; rover.heading = 0.6; rover.speed = 0; rover.driven = false;
    marker.x = 0; marker.z = 0; marker.active = false; marker.progress = 0; marker.inside = false;
    AXES.kb = [0, 0]; AXES.pad = [0, 0]; sprint = false;
    save(); publish(true);
    emit('campaign-reset', {});
  }

  return {
    resetCampaign,
    start() {
      if (running) return;
      running = true;
      let last = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const after = () => { if (Date.now() - lastSave > 3000) save(); publish(); };
      if (typeof requestAnimationFrame === 'function') {
        const loop = (ts) => {
          if (!running) return;
          const dt = Math.min(0.1, Math.max(0, (ts - last) / 1000)); last = ts;
          tickOnce(dt); after();
          rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
      } else {
        timerId = setInterval(() => { tickOnce(0.05); after(); }, 50);
      }
      publish(true);
    },
    stop() { running = false; if (rafId && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId); clearInterval(timerId); rafId = 0; timerId = 0; save(); },
    tick(dt) { let rem = dt; while (rem > 0) { const h = Math.min(rem, 0.1); tickOnce(h); rem -= h; } },   // for tests
    setRunning(v) { S.running = !!v; save(); publish(true); },
    continueMission() { if (M.phase !== 'choice' || S.finished) return; M.phase = 'gap'; M.timer = 0; M.activity = 'Starting the mission you selected…'; startMission(); save(); publish(true); },
    setAxes(src, right, forward) { if (AXES[src]) AXES[src] = [right || 0, forward || 0]; },
    setRun(v) { sprint = !!v; },
    setCameraTheta(t) { camTheta = t; },
    enterHabitat, exitHabitat,
    // the E key / big button: do the most useful thing for where the player is standing
    interact() {
      if (!S.running) return;
      if (I.active) { if (I.nearExit) exitHabitat(); return; }
      if (!rover.driven && M.nearDoor && !M.near) { enterHabitat(); return; }
      this.toggleRover();
    },
    toggleRover() {
      if (!S.running || I.active) return;
      if (rover.driven) {
        rover.driven = false; rover.speed = 0;
        astro.x = rover.x + Math.sin(rover.heading) * 3.6; astro.z = rover.z + Math.cos(rover.heading) * 3.6;
        collide(astro, 0.8); astro.visible = true; astro.heading = rover.heading;
        emit('rover-exit', {}); publish(true);
      } else if (hyp(astro.x - rover.x, astro.z - rover.z) < 6.5) {
        rover.driven = true; astro.visible = false; astro.speedNow = 0; astro.pace = 0;
        emit('rover-enter', {}); publish(true);
      }
    },
    getSnapshot() { return snap || (snap = buildSnapshot()); },
    subscribe(f) { subs.add(f); return () => subs.delete(f); },
    onEvent(f) { evs.add(f); return () => evs.delete(f); },
    drainRewards() { const r = S.unpaid; if (r.length) { S.unpaid = []; save(); } return r; },
    getActors() { return { astro, rover, marker, inside: I }; },
    _state: S, _m: M
  };
}

export const runner = createRunner();
export { OBST, ZONES, SURVEY, planStep, RING_R };
