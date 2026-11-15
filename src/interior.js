/* HABITAT INTERIOR (shared data)
   One place that describes the inside of the habitat: the room size, where each machine stands and what each
   machine reports. The mission runner uses it for walking and collisions, the 3D scene uses it to draw the room
   and its screens, and the React UI uses it for the info card that appears next to a machine. */

export const ROOM = { w: 22, d: 18, h: 5.2 };               // x: -11..11, z: -9..9
export const DOOR_OUT = { x: -5.65, z: 5.08, nx: -0.743, nz: 0.669 };   // habitat entrance on the Moon's surface
export const SPAWN_IN = { x: 0, z: 6.0, heading: Math.PI };  // where you appear inside (facing the machines)
export const AIRLOCK = { x: 0, z: 9, hw: 1.4 };              // exit door in the south wall
export const UNIT_DEPTH = 1.8;
export const NEAR_STATION = 2.3;                             // how close you must be to use a machine
export const NEAR_EXIT = 2.4;

/* wall: N / S / W / E.  at: position along that wall.  span: half the width of the machine. */
export const STATIONS = [
  { id: 'solar',      label: 'Solar Controller',   wall: 'N', at: -8.2, span: 1.6, icon: '☀️' },
  { id: 'battery',    label: 'Battery Bank',       wall: 'N', at: -3.6, span: 2.0, icon: '🔋' },
  { id: 'command',    label: 'Command Console',    wall: 'N', at: 1.8,  span: 1.9, icon: '🖥️' },
  { id: 'power',      label: 'Power Distribution', wall: 'N', at: 6.8,  span: 1.9, icon: '⚡' },
  { id: 'water',      label: 'Water Recycler',     wall: 'W', at: -4.5, span: 2.0, icon: '💧' },
  { id: 'heater',     label: 'Thermal Control',    wall: 'W', at: 1.5,  span: 1.6, icon: '🌡️' },
  { id: 'crew',       label: 'Crew Quarters',      wall: 'W', at: 6.2,  span: 2.0, icon: '🛏️' },
  { id: 'o2',         label: 'Oxygen Generator',   wall: 'E', at: -5.0, span: 1.8, icon: '🌬️' },
  { id: 'greenhouse', label: 'Food Garden',        wall: 'E', at: 0.2,  span: 2.4, icon: '🌱' },
  { id: 'lab',        label: 'Research Bay',       wall: 'E', at: 5.6,  span: 1.9, icon: '🔬' },
  { id: 'shield',     label: 'Radiation Shield',   wall: 'S', at: -6.0, span: 1.5, icon: '🛡️' }
];
export const STATION_BY_ID = Object.fromEntries(STATIONS.map((s) => [s.id, s]));

/* axis-aligned footprint of a machine, used for collisions and "am I standing next to it?" */
export function stationBox(st) {
  const hx = ROOM.w / 2, hz = ROOM.d / 2, dp = UNIT_DEPTH;
  if (st.wall === 'N') return { x0: st.at - st.span, x1: st.at + st.span, z0: -hz, z1: -hz + dp };
  if (st.wall === 'S') return { x0: st.at - st.span, x1: st.at + st.span, z0: hz - dp, z1: hz };
  if (st.wall === 'W') return { x0: -hx, x1: -hx + dp, z0: st.at - st.span, z1: st.at + st.span };
  return { x0: hx - dp, x1: hx, z0: st.at - st.span, z1: st.at + st.span };
}
export const BOXES = [
  ...STATIONS.map(stationBox),
  { x0: -1.3, x1: 1.3, z0: -1.3, z1: 1.3 },                 // holo table in the middle of the room
  { x0: -AIRLOCK.hw - 0.2, x1: AIRLOCK.hw + 0.2, z0: ROOM.d / 2 - 0.5, z1: ROOM.d / 2 }   // airlock frame
];
export const STATION_BOXES = STATIONS.map(stationBox);

export function distToBox(b, x, z) {
  const dx = Math.max(b.x0 - x, 0, x - b.x1), dz = Math.max(b.z0 - z, 0, z - b.z1);
  return Math.hypot(dx, dz);
}

/* push a point out of a box (circle of radius pad around the point) */
export function pushOutOfBox(a, b, pad) {
  const cx = Math.min(Math.max(a.x, b.x0), b.x1), cz = Math.min(Math.max(a.z, b.z0), b.z1);
  const dx = a.x - cx, dz = a.z - cz, d = Math.hypot(dx, dz);
  if (d >= pad) return;
  if (d > 1e-4) { a.x = cx + dx / d * pad; a.z = cz + dz / d * pad; return; }
  // centre is inside the box: leave through the nearest side
  const opts = [[a.x - b.x0, -1, 0], [b.x1 - a.x, 1, 0], [a.z - b.z0, 0, -1], [b.z1 - a.z, 0, 1]].sort((p, q) => p[0] - q[0])[0];
  a.x += opts[1] * (opts[0] + pad); a.z += opts[2] * (opts[0] + pad);
}

/* keep the player inside the room walls and out of every machine */
export function collideInterior(a, pad = 0.7) {
  const hx = ROOM.w / 2 - pad, hz = ROOM.d / 2 - pad;
  for (let i = 0; i < 2; i++) {
    for (const b of BOXES) pushOutOfBox(a, b, pad);
    a.x = Math.min(hx, Math.max(-hx, a.x)); a.z = Math.min(hz, Math.max(-hz, a.z));
  }
}

/* nearest machine within reach, or null */
export function nearestStation(x, z) {
  let best = null, bd = NEAR_STATION;
  STATIONS.forEach((st, i) => { const d = distToBox(STATION_BOXES[i], x, z); if (d < bd) { bd = d; best = st.id; } });
  return best;
}
export const nearAirlock = (x, z) => Math.hypot(x - AIRLOCK.x, z - AIRLOCK.z) < NEAR_EXIT + 0.6;

/* ------------------------------------------------------------------------------------------------
   What each machine says. sim = { s: game.state, rates: game.getNetRates(), isDay: boolean }
   status: ok | warn | bad | off.   bars: [{ label, v (0..1), color }]
   ------------------------------------------------------------------------------------------------ */
const SYS_LABEL = { lifeSupport: 'Life support', waterRecycler: 'Water recycler', heater: 'Heater', greenhouse: 'Greenhouse', scienceLab: 'Science lab' };
const SYS_DRAW = { lifeSupport: 2.0, waterRecycler: 0.8, heater: 1.5, greenhouse: 2.0, scienceLab: 1.5 };
const pctOf = (s, k) => Math.max(0, Math.min(1, s.res[k] / s.max[k]));
const sign = (n) => (n > 0 ? '+' : '') + n;
const levelStatus = (v) => (v < 0.18 ? 'bad' : v < 0.35 ? 'warn' : 'ok');
const barColor = (v) => (v < 0.18 ? '#ff6a5a' : v < 0.35 ? '#ffd24a' : '#5dff9a');

export function stationReadout(id, sim) {
  if (!sim || !sim.s) return { built: true, status: 'off', lines: [], bars: [], tip: '' };
  const s = sim.s, r = sim.rates || {}, sys = s.systems, res = s.res, mx = s.max;
  const sysState = (k) => (!sys[k].built ? 'NOT BUILT' : !sys[k].enabled ? 'OFF' : sys[k].powered ? 'ON' : 'NO POWER');
  switch (id) {
    case 'solar': {
      const bad = s.panelCondition < 0.6 || s.dust > 0.4;
      return {
        built: true, status: s.panels < 1 ? 'off' : bad ? 'warn' : 'ok',
        lines: [['Solar panels', String(s.panels)], ['Making power', `${(s.power.gen || 0).toFixed(1)} /hr`], ['Panel health', `${Math.round(s.panelCondition * 100)}%`], ['Dust on panels', `${Math.round(s.dust * 100)}%`], ['Sunlight', sim.isDay ? 'Daytime' : 'Night: none']],
        bars: [{ label: 'Panel health', v: s.panelCondition, color: barColor(s.panelCondition) }],
        tip: 'Solar panels turn sunlight into electricity. Moon dust and space-rock hits make them weaker until they are cleaned or repaired.'
      };
    }
    case 'battery': {
      const v = pctOf(s, 'power'), racks = Math.max(1, Math.min(6, 1 + Math.round((mx.power - 200) / 100)));
      return {
        built: true, status: levelStatus(v),
        lines: [['Stored power', `${Math.round(res.power)} / ${mx.power}`], ['Battery racks', `${racks} of 6`], ['Right now', `${sign(r.power ?? 0)} /hr`], ['Time of day', sim.isDay ? 'Daytime' : 'Lunar night']],
        bars: [{ label: 'Charge', v, color: barColor(v) }], racks,
        tip: 'Batteries store energy in the daytime so the base keeps running through the 2-week lunar night. Build more Battery Banks to store more.'
      };
    }
    case 'command': {
      const bars = ['power', 'oxygen', 'water', 'food', 'health'].map((k) => ({ label: k === 'oxygen' ? 'Oxygen' : k[0].toUpperCase() + k.slice(1), v: pctOf(s, k), color: barColor(pctOf(s, k)) }));
      const worst = Math.min(...bars.slice(0, 4).map((b) => b.v));
      return {
        built: true, status: levelStatus(worst),
        lines: [['Crew on board', String(s.crew)], ['Mission day', String(Math.floor(s.tick / 24) + 1)], ['Outside', sim.isDay ? 'Sunny' : 'Dark night']],
        bars, tip: 'The command console shows everything at a glance. If a bar turns yellow or red, walk to that machine and take a look.'
      };
    }
    case 'power': {
      const gen = s.power.gen || 0, used = s.power.used || 0, net = Number((gen - used).toFixed(1));
      const toggles = Object.keys(SYS_LABEL).map((k) => ({ id: k, label: SYS_LABEL[k], built: sys[k].built, enabled: sys[k].enabled, powered: sys[k].powered, state: sysState(k), draw: SYS_DRAW[k] }));
      return {
        built: true, status: net < 0 && res.power / mx.power < 0.35 ? 'warn' : 'ok',
        lines: [['Power made', `${gen.toFixed(1)} /hr`], ['Power used', `${used.toFixed(1)} /hr`], ['Left over', `${sign(net)} /hr`]],
        bars: [{ label: 'Made vs used', v: Math.max(0, Math.min(1, gen / Math.max(0.1, used))), color: net >= 0 ? '#5dff9a' : '#ffd24a' }],
        toggles, tip: 'Every machine uses power. When power runs low, you can switch machines OFF here. Life support always comes first!'
      };
    }
    case 'o2': {
      const v = pctOf(s, 'oxygen'), on = sys.lifeSupport.powered;
      return {
        built: true, status: !on ? 'bad' : s.leak > 0 ? 'warn' : levelStatus(v),
        lines: [['Oxygen', `${Math.round(res.oxygen)} / ${mx.oxygen}`], ['Right now', `${sign(r.oxygen ?? 0)} /hr`], ['Leak', s.leak > 0 ? `Yes (-${s.leak}/hr)` : 'None'], ['Life support', sysState('lifeSupport')]],
        bars: [{ label: 'Oxygen', v, color: barColor(v) }],
        tip: 'The generator splits water into oxygen for the crew to breathe. It needs power to run, so it is the very first machine to get electricity.'
      };
    }
    case 'water': {
      const b = sys.waterRecycler.built, v = pctOf(s, 'water');
      return {
        built: b, status: !b ? 'off' : !sys.waterRecycler.powered ? 'warn' : levelStatus(v),
        lines: [['Water', `${Math.round(res.water)} / ${mx.water}`], ['Right now', `${sign(r.water ?? 0)} /hr`], ['Recycler', sysState('waterRecycler')]],
        bars: [{ label: 'Water', v, color: barColor(v) }],
        note: 'Empty bay. Build the Water Recycler in the Build screen to save 70% of your water.',
        tip: 'The recycler cleans used water so the crew can drink it again. Water is precious on the Moon!'
      };
    }
    case 'heater': {
      const on = sys.heater.powered;
      return {
        built: true, status: on ? 'ok' : 'bad',
        lines: [['Heater', sysState('heater')], ['Power draw', `${(SYS_DRAW.heater * (sim.isDay ? 1 : 1.2)).toFixed(1)} /hr`], ['Outside', sim.isDay ? 'About 120 °C' : 'About -170 °C'], ['Inside', on ? 'Cosy 21 °C' : 'Getting cold!']],
        bars: [{ label: 'Warmth', v: on ? 1 : 0.1, color: on ? '#ffb25c' : '#ff6a5a' }],
        tip: 'The Moon swings from baking hot to freezing cold. The heater keeps the cabin comfy, especially at night.'
      };
    }
    case 'crew': {
      const v = pctOf(s, 'health');
      return {
        built: true, status: levelStatus(v),
        lines: [['Crew', `${s.crew} astronauts`], ['Health', `${Math.round(res.health)}%`], ['Cabin air', res.oxygen > 20 ? 'Fresh' : 'Thin!']],
        bars: [{ label: 'Crew health', v, color: barColor(v) }],
        tip: 'Astronauts sleep here. Healthy crews need air, water, food and a safe place to rest.'
      };
    }
    case 'greenhouse': {
      const b = sys.greenhouse.built, v = pctOf(s, 'food');
      return {
        built: b, status: !b ? 'off' : !sys.greenhouse.powered ? 'warn' : levelStatus(v),
        lines: [['Food', `${Math.round(res.food)} / ${mx.food}`], ['Right now', `${sign(r.food ?? 0)} /hr`], ['Garden', sysState('greenhouse')]],
        bars: [{ label: 'Food', v, color: barColor(v) }],
        note: 'Empty garden bay. Build the Greenhouse in the Build screen to grow fresh food.',
        tip: 'Plants grow under purple LED lights with no soil at all. This is called hydroponics!'
      };
    }
    case 'lab': {
      const b = sys.scienceLab.built;
      return {
        built: b, status: !b ? 'off' : sys.scienceLab.powered ? 'ok' : 'warn',
        lines: [['Soil samples', String(s.soilSamples)], ['Science lab', sysState('scienceLab')], ['Science points', String(Math.round(s.wallet.points))]],
        bars: [{ label: 'Samples (goal 5)', v: Math.min(1, s.soilSamples / 5), color: '#7fe3ff' }],
        note: 'Empty research bay. Build the Science & Research Lab in the Build screen.',
        tip: 'Rocks and soil from the rover are studied here to learn how the Moon was made.'
      };
    }
    case 'shield': {
      const b = !!s.radiationShield;
      return {
        built: b, status: b ? 'ok' : 'warn',
        lines: [['Shielding', b ? 'INSTALLED' : 'NONE'], ['Storm damage', b ? '-70%' : 'Full']],
        bars: [{ label: 'Protection', v: b ? 1 : 0.1, color: b ? '#7fe3ff' : '#ffd24a' }],
        note: 'No shielding yet. Build Radiation Shielding in the Build screen.',
        tip: 'Space has no air to block radiation from the Sun. Thick walls made of Moon soil keep the crew safe.'
      };
    }
    default: return { built: true, status: 'off', lines: [], bars: [], tip: '' };
  }
}

export const STATUS_COLOR = { ok: '#5dff9a', warn: '#ffd24a', bad: '#ff6a5a', off: '#8892a8' };
