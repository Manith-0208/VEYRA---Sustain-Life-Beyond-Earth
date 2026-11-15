import React, { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import * as THREE from 'three';
import { initHalcyonRidge } from './outpostScene.js';
import { runner } from './missionRunner.js';
import { STATION_BY_ID, stationReadout, STATUS_COLOR } from './interior.js';
import NasaPanel from './NasaPanel.jsx';
import {
  Zap, Wind, Droplets, Apple, Heart, Coins, Sparkles, Box,
  AlertTriangle, CheckCircle2, Hammer, ArrowUpCircle, FlaskConical,
  Compass, Sun, Moon, ShieldAlert, Wrench, Play, Settings,
  Award, LogOut, ChevronRight, ArrowLeft, Lock, Layers,
  Radio, BatteryCharging, Thermometer, Shield, Eye, RotateCcw,
  Clock, MapPin, HelpCircle, X, Volume2, Maximize2, Orbit,
  Activity, FastForward, Pause
} from 'lucide-react';


// ORION voice companion: browser speech synthesis, started from a user gesture.
// Tuned for kids aged 7-12: a warm, friendly voice that speaks a little slower and clearer.
const VOICE_STYLES = {
  friendly: { label: 'Friendly', pitch: 1.3, rate: 0.93, prefer: /Samantha|Aria|Jenny|Zira|Karen|Tessa|Moira|Fiona|Google UK English Female|Google US English|Female/i },
  robot:    { label: 'Robot',    pitch: 0.55, rate: 0.82, prefer: /Daniel|David|Alex|Fred|Google UK English Male|Male/i },
  squeaky:  { label: 'Squeaky',  pitch: 1.85, rate: 1.04, prefer: /Samantha|Aria|Jenny|Karen|Female/i },
};
const VOICE_ORDER = ['friendly', 'robot', 'squeaky'];
let orionVoiceEnabled = true;
let orionStyle = 'friendly';
try { const saved = localStorage.getItem('missionvoid-orion-style'); if (VOICE_STYLES[saved]) orionStyle = saved; } catch (e) { }

function pickOrionVoice(style) {
  const voices = window.speechSynthesis.getVoices();
  const english = voices.filter((v) => /^en/i.test(v.lang));
  return english.find((v) => /en-US/i.test(v.lang) && style.prefer.test(v.name))
    || english.find((v) => style.prefer.test(v.name))
    || english.find((v) => /en-US/i.test(v.lang))
    || english[0] || null;
}

// queue = true adds to what ORION is already saying; otherwise the new line replaces it.
function speakOrion(message, { queue = false } = {}) {
  if (!orionVoiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  const cleanMessage = String(message || '').replace(/ORION:\s*/gi, '').trim();
  if (!cleanMessage) return false;
  const synth = window.speechSynthesis;
  if (!queue) synth.cancel();
  synth.resume();
  const style = VOICE_STYLES[orionStyle] || VOICE_STYLES.friendly;
  const utterance = new SpeechSynthesisUtterance(cleanMessage);
  utterance.lang = 'en-US';
  utterance.rate = style.rate;
  utterance.pitch = style.pitch;
  const voice = pickOrionVoice(style);
  if (voice) utterance.voice = voice;
  utterance.onerror = (event) => { if (event.error !== 'canceled' && event.error !== 'interrupted') console.warn('ORION speech error:', event.error); };
  synth.speak(utterance);
  return true;
}

const STATION_SPEECH = {
  solar: 'This is the solar controller. Solar panels turn sunlight into electricity. Dust makes them weaker, so keep them clean!',
  battery: 'These are the batteries. They save power in the daytime so the base can keep running through the long lunar night.',
  command: 'This is the command console. It shows your power, oxygen, water, food and crew health all in one place.',
  power: 'This is power distribution. Every machine uses electricity here, and you can switch machines off to save power. Life support always comes first!',
  water: 'This is the water recycler. It cleans used water so the crew can drink it again.',
  heater: 'This is thermal control. It keeps the cabin warm, even when it is freezing outside.',
  crew: 'These are the crew sleeping pods. Healthy astronauts need a safe place to rest.',
  o2: 'This is the oxygen generator. It makes the air that the crew breathes. It is the most important machine on the base!',
  greenhouse: 'This is the food garden. Plants grow under purple lights with no soil. That is called hydroponics!',
  lab: 'This is the research bay. Rocks and soil from the rover are studied here.',
  shield: 'This is the radiation shield monitor. It protects the crew from the sun during solar storms.'
};

function OrionCompanion({ inline = false }) {
  const [muted, setMuted] = useState(!orionVoiceEnabled);
  const [styleKey, setStyleKey] = useState(orionStyle);
  const toggleVoice = () => {
    if (muted) {
      orionVoiceEnabled = true;
      setMuted(false);
      // This click is a direct user gesture, which unlocks speech in browsers
      // that block automatic audio before interaction.
      speakOrion("Hi Explorer! I'm ORION, your robot buddy. I'll talk you through every mission!");
    } else {
      orionVoiceEnabled = false;
      setMuted(true);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }
  };
  const cycleStyle = () => {
    const next = VOICE_ORDER[(VOICE_ORDER.indexOf(styleKey) + 1) % VOICE_ORDER.length];
    orionStyle = next;
    setStyleKey(next);
    try { localStorage.setItem('missionvoid-orion-style', next); } catch (e) { }
    orionVoiceEnabled = true;
    setMuted(false);
    const lines = {
      friendly: "Hi! This is my friendly voice. Let's explore the Moon together!",
      robot: 'Beep boop. This is my robot voice. Ready for the next mission.',
      squeaky: "Wheee! This is my squeaky voice. Moon missions are so much fun!",
    };
    speakOrion(lines[next]);
  };
  return (
    <div className={inline
      ? 'flex shrink-0 items-end gap-2 rounded-xl border border-sky-400/30 bg-slate-950/90 px-2 py-1.5 shadow-[0_0_18px_rgba(37,99,235,.2)]'
      : 'fixed bottom-4 left-4 z-[90] flex items-end gap-2 pointer-events-none'} aria-label="ORION mission assistant">
      <div className={inline
        ? 'relative h-[66px] w-[66px] sm:h-[76px] sm:w-[76px] drop-shadow-[0_0_12px_rgba(37,99,235,.45)]'
        : 'relative h-[104px] w-[104px] sm:h-[124px] sm:w-[124px] drop-shadow-[0_0_18px_rgba(37,99,235,.45)]'}>
        <img src="/orion.gif" alt="ORION robot assistant" className="h-full w-full object-contain" />
        <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-slate-950 bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
      </div>
      <div className="mb-1 flex flex-col gap-1 pointer-events-auto">
        <span className="w-fit rounded-md border border-sky-400/40 bg-slate-950/90 px-2 py-1 text-[10px] font-black tracking-[.22em] text-sky-200 shadow-lg">ORION</span>
        <button type="button" onClick={toggleVoice} className="rounded-md border border-sky-400/40 bg-slate-950/90 px-2 py-1.5 text-[11px] font-semibold text-slate-200 shadow-lg hover:border-sky-300" aria-label={muted ? 'Turn ORION voice on' : 'Mute ORION voice'}>
          {muted ? '🔇 Voice: OFF' : '🔊 Voice: ON'}
        </button>
        <button type="button" onClick={cycleStyle} className="rounded-md border border-cyan-400/30 bg-slate-900/95 px-2 py-1 text-[11px] font-semibold text-cyan-200 shadow-lg hover:border-cyan-300" aria-label="Change ORION's voice style">
          🎙 {VOICE_STYLES[styleKey].label}
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
   1. ENGINE-AGNOSTIC CORE: RESOURCE MANAGEMENT & DECISION SYSTEM
   ============================================================================ */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const CONFIG = {
  ticksPerDay: 24,
  sunDays: 6,
  nightDays: 2,
  perCrewPerTick: { oxygen: 0.30, water: 0.06, food: 0.07 },
  solarPerPanel: 1.8,
  dustPerSunTick: 0.004,
  lifeSupportO2: 1.6,
  recyclerSaving: 0.7,
  greenhouseFood: 0.35,
  damage: { oxygen: 5, water: 2, food: 1, cold: 1.5 },
  regen: 0.25,
  warn: [0.35, 0.18],
};

export const SYSTEM_DEFS = {
  lifeSupport:   { label: 'Life Support',   priority: 1, power: 2.0, category: 'Life Support' },
  waterRecycler: { label: 'Water Recycler', priority: 2, power: 0.8, category: 'Life Support' },
  heater:        { label: 'Thermal Heater', priority: 3, power: 1.5, category: 'Habitation' },
  greenhouse:    { label: 'Greenhouse',     priority: 4, power: 2.0, category: 'Food' },
  scienceLab:    { label: 'Science Lab',    priority: 5, power: 1.5, category: 'Exploration' },
};

export const UPGRADES = {
  greenhouse: {
    id: 'greenhouse',
    label: 'Greenhouse',
    category: 'Habitation',
    subCategory: 'Food',
    desc: 'Grow fresh food for your crew in a controlled hydroponic dome.',
    effectText: `+${(CONFIG.greenhouseFood * CONFIG.ticksPerDay).toFixed(1)} Food / Day`,
    cost: { coins: 300, materials: 65 },
    apply: (g) => { g.state.systems.greenhouse.built = true; }
  },
  waterRecycler: {
    id: 'waterRecycler',
    label: 'Water Recycler',
    category: 'Life Support',
    subCategory: 'Life Support',
    desc: 'Closed-loop filtration system that cuts crew water consumption by 70%.',
    effectText: '-70% Water Drain',
    cost: { coins: 220, materials: 55 },
    apply: (g) => { g.state.systems.waterRecycler.built = true; }
  },
  solarPanels: {
    id: 'solarPanels',
    label: 'Solar Array Expansion',
    category: 'Energy',
    subCategory: 'Energy',
    repeat: true,
    desc: 'Install 2 additional high-efficiency photovoltaic arrays on the lunar ridge.',
    effectText: `+${(2 * CONFIG.solarPerPanel).toFixed(1)} Power / hr (full condition)`,
    cost: { coins: 260, materials: 50 },
    apply: (g) => { g.state.panels += 2; }
  },
  battery: {
    id: 'battery',
    label: 'Battery Bank Module',
    category: 'Energy',
    subCategory: 'Energy',
    repeat: true,
    desc: 'High-density lithium-sulfur storage cells to survive the 48-hour lunar night.',
    effectText: '+100 Max Power',
    cost: { coins: 300, points: 20, materials: 55 },
    apply: (g) => { g.state.max.power += 100; g.add('power', 50); }
  },
  radiationShield: {
    id: 'radiationShield',
    label: 'Radiation Shielding',
    category: 'Safety',
    subCategory: 'Safety',
    desc: 'Reinforce habitat hulls with sintered regolith to block solar particle events.',
    effectText: '-70% Storm Damage',
    cost: { coins: 450, points: 60, materials: 90 },
    apply: (g) => { g.state.radiationShield = true; }
  },
  scienceLab: {
    id: 'scienceLab',
    label: 'Science & Research Lab',
    category: 'Exploration',
    subCategory: 'Research',
    desc: 'Build a research module with a communications mast and analysis dish to turn collected samples into science progress.',
    effectText: 'Unlocks research systems',
    cost: { coins: 350, points: 25, materials: 60 },
    apply: (g) => { g.state.systems.scienceLab.built = true; }
  },
  roverGarage: {
    id: 'roverGarage',
    label: 'Rover Servicing Bay',
    category: 'Exploration',
    subCategory: 'Infrastructure',
    desc: 'Dedicated pressurized maintenance bay that boosts rover range and sample yield.',
    effectText: '+2 Samples / EVA',
    cost: { coins: 320, materials: 60 },
    apply: (g) => { g.state.roverUpgraded = true; }
  },
};

export const EVENTS = [
  {
    id: 'solar_damage',
    cooldown: Infinity,
    when: (g) => g.state.tick >= 6 && !g.state.fired.solar_damage,
    onTrigger: (g) => { g.state.panelCondition = Math.min(g.state.panelCondition, 0.5); },
    title: 'Solar Panel Damaged!',
    warning: 'A micrometeorite dust impact damaged the primary solar array. Repair now or conserve energy for life support?',
    scienceLesson: 'Lunar Micrometeoroids & Dust',
    scienceDetail: 'With no atmosphere to burn up debris, high-velocity dust impacts degrade solar cells unless repaired or shielded.',
    options: [
      {
        id: 'repair',
        label: 'Repair Now',
        cost: { materials: 40, power: 15 },
        run: (g) => {
          g.state.panelCondition = 1.0;
          return 'EVA completed! Solar array repaired to 100% efficiency.';
        }
      },
      {
        id: 'conserve',
        label: 'Conserve Power',
        cost: {},
        run: (g) => {
          g.setEnabled('scienceLab', false);
          return 'Non-essential Science Lab powered down. Solar array remains at 50%.';
        }
      },
    ],
    defaultOption: 'conserve',
  },
  {
    id: 'solar_storm',
    cooldown: 60,
    timeLimitSec: 45,
    when: (g) => g.state.tick > 28 && g.isDay() && g.rng() < 0.03,
    title: 'Solar Storm Incoming!',
    warning: 'Move crew inside the habitat before radiation levels increase.',
    scienceLesson: 'Solar Radiation & Space Weather',
    scienceDetail: 'Coronal Mass Ejections (CMEs) hurl energetic protons across space. Without Earth’s magnetosphere, lunar crews must shelter indoors.',
    options: [
      {
        id: 'shelter',
        label: 'Go Inside',
        cost: { power: 10 },
        run: () => {
          return 'Crew safely sheltered inside the habitat. No radiation damage, but the outdoor task was abandoned.';
        }
      },
      {
        id: 'risk',
        label: 'Ignore',
        cost: {},
        run: (g) => {
          const dmg = g.state.radiationShield ? 8 : 25;
          g.add('health', -dmg);
          g.state.wallet.points += 150;
          g.state.wallet.coins += 300;
          return `Outdoor task finished (+300 coins, +150 science), but the crew suffered -${dmg} radiation damage!`;
        }
      },
    ],
    defaultOption: 'risk',
  },
  {
    id: 'oxygen_leak',
    cooldown: 90,
    when: (g) => g.state.tick >= 36 && !g.state.fired.oxygen_leak,
    onTrigger: (g) => { g.state.leak = 0.65; },
    title: 'Oxygen Leak Detected!',
    warning: 'Airlock seal degradation is venting cabin O₂ into vacuum. Seal the breach immediately or pump emergency O₂ reserves?',
    scienceLesson: 'Pressurized Habitat Integrity',
    scienceDetail: 'Abrasive lunar regolith clings to spacesuits and wears down rubber airlock seals, requiring constant pressure monitoring.',
    options: [
      {
        id: 'repair',
        label: 'Repair Leak',
        cost: { materials: 50 },
        run: (g) => {
          g.state.leak = 0;
          return 'Airlock seal replaced and pressure stabilized!';
        }
      },
      {
        id: 'emergency',
        label: 'Emergency Supply',
        cost: { coins: 150 },
        run: (g) => {
          g.state.leak = 0.25;
          g.add('oxygen', 35);
          return '+35 O₂ pumped into cabin, but a slow micro-leak persists (-0.25/hr).';
        }
      },
    ],
    defaultOption: 'emergency',
  },
  {
    id: 'dust_on_panels',
    cooldown: 48,
    when: (g) => g.state.dust >= 0.45,
    title: 'Lunar Dust Blocking Panels',
    warning: 'Electrostatic lunar regolith is coating the solar arrays and cutting power output. Clean panels or wait?',
    scienceLesson: 'Electrostatic Regolith Adhesion',
    scienceDetail: 'UV sunlight charges sharp lunar dust grains electrostatically, causing them to levitate and cling stubbornly to solar panels.',
    options: [
      {
        id: 'clean',
        label: 'Clean Panels',
        cost: { power: 10 },
        run: (g) => {
          g.state.dust = 0;
          return 'Electrostatic brush sweep completed! Solar output restored to 100%.';
        }
      },
      {
        id: 'wait',
        label: 'Wait',
        cost: {},
        run: () => 'Skipped cleaning. Dust continues reducing solar efficiency.'
      },
    ],
    defaultOption: 'wait',
  },
];

export const CHAPTERS = [
  { id: 1, title: 'Chapter 1 - First Light', subtitle: 'Survive the first lunar day & repair damaged systems.' },
  { id: 2, title: 'Chapter 2 - Explore the Moon', subtitle: 'Deploy the lunar rover & map crater geology.' },
  { id: 3, title: 'Chapter 3 - Power & Protection', subtitle: 'Balance load shedding & survive solar storms.' },
  { id: 4, title: 'Chapter 4 - Grow to Survive', subtitle: 'Construct the Greenhouse & closed-loop water recycler.' },
  { id: 5, title: 'Chapter 5 - Build a Lunar City', subtitle: 'Expand habitat modules & robotic automation.' },
  { id: 6, title: 'Chapter 6 - Mission Beyond', subtitle: 'Complete long-duration readiness for Mars.' },
];

export const MISSIONS = [
  {
    id: 'm1',
    chapter: 1,
    title: 'Repair the Solar Panels',
    desc: 'Inspect the damaged solar array and restore stable power generation.',
    progressText: (g) => `${g.state.panelCondition >= 1 ? 1 : 0}/1`,
    check: (g) => g.state.panelCondition >= 1,
    reward: { coins: 300, points: 50, badge: 'Solar Engineer' },
    scienceLearned: 'Solar Power & Dust Mitigation'
  },
  {
    id: 'm2',
    chapter: 1,
    title: 'Collect 5 Soil Samples',
    desc: 'Deploy the lunar rover to nearby craters and collect 5 regolith samples.',
    progressText: (g) => `${Math.min(5, g.state.soilSamples)}/5`,
    check: (g) => g.state.soilSamples >= 5,
    reward: { coins: 500, points: 150, badge: 'Lunar Geologist' },
    scienceLearned: 'Lunar Regolith Composition'
  },
  {
    id: 'm3',
    chapter: 1,
    title: 'Build the Greenhouse',
    desc: 'Construct a hydroponic Greenhouse dome to establish sustainable crew food production.',
    progressText: (g) => `${g.state.systems.greenhouse.built ? 1 : 0}/1`,
    check: (g) => g.state.systems.greenhouse.built,
    reward: { coins: 500, points: 150, badge: 'Astro-Botanist' },
    scienceLearned: 'Hydroponic Space Agriculture'
  },
  {
    id: 'm4',
    chapter: 1,
    title: 'Survive First Lunar Night',
    desc: 'Manage battery storage and thermal heaters through Day 8 to survive the freezing lunar night.',
    progressText: (g) => `Day ${Math.min(8, Math.floor(g.state.tick / 24) + 1)}/8`,
    check: (g) => g.state.tick >= (CONFIG.sunDays + CONFIG.nightDays) * CONFIG.ticksPerDay,
    reward: { coins: 1000, points: 300, badge: 'First Light Survivor' },
    scienceLearned: 'Lunar Thermal & Energy Storage'
  },
];

const GAME_SAVE_KEY = 'missionvoid-base-state-v1';

export class Game {
  constructor({ seed = 42 } = {}) {
    this.initialSeed = seed;
    this.rng = mulberry32(seed);
    this.listeners = {};
    this.alertLevel = {};
    this.resetState(false);
    this.loadSaved();
  }

  resetState(clearSave = true) {
    this.rng = mulberry32(this.initialSeed);
    this.alertLevel = {};
    this.state = {
      tick: 0,
      chapter: 1,
      over: false,
      res: { power: 120, oxygen: 100, water: 80, food: 90, health: 100 },
      max: { power: 200, oxygen: 100, water: 100, food: 100, health: 100 },
      wallet: { coins: 650, points: 25, materials: 90 },
      crew: 2,
      panels: 1,
      panelCondition: 0.65,
      dust: 0.1,
      leak: 0,
      soilSamples: 0,
      lastRoverTick: -999,
      questAccepted: false,
      roverUpgraded: false,
      radiationShield: false,
      upgrades: [],
      badges: ['Artemis Pioneer'],
      systems: {
        lifeSupport:   { built: true,  enabled: true, powered: true },
        waterRecycler: { built: false, enabled: true, powered: false },
        heater:        { built: true,  enabled: true, powered: true },
        greenhouse:    { built: false, enabled: true, powered: false },
        scienceLab:    { built: false, enabled: true, powered: false },
      },
      pending: [],
      fired: {},
      done: [],
      power: { gen: 4.2, used: 5.0, exactGen: 4.212, exactUsed: 5.0 },
      history: [{ tick: 0, power: 120, oxygen: 100, water: 80, food: 90, health: 100 }],
      logs: [{ tick: 0, type: 'info', msg: 'Outpost Alpha initialized on Lunar South Pole.' }],
    };
    this.allocatePower(true);
    if (clearSave) this.clearSaved();
  }

  /* The mission runner already remembers mission progress; this remembers the base itself
     (coins, materials, buildings, resources) so a reload does not wipe what the missions paid for. */
  loadSaved() {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(GAME_SAVE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      const base = this.state;
      const nums = (o) => o && typeof o === 'object' && Object.values(o).every((v) => Number.isFinite(v));
      if (!saved || !nums(saved.res) || !nums(saved.max) || !nums(saved.wallet) || !saved.systems) return;
      const merged = { ...base, ...saved, res: { ...base.res, ...saved.res }, max: { ...base.max, ...saved.max }, wallet: { ...base.wallet, ...saved.wallet }, systems: {} };
      for (const id of Object.keys(base.systems)) merged.systems[id] = { ...base.systems[id], ...(saved.systems[id] || {}) };
      for (const k of ['history', 'logs', 'done', 'badges', 'upgrades']) if (!Array.isArray(merged[k])) merged[k] = base[k];
      if (!merged.fired || typeof merged.fired !== 'object') merged.fired = {};
      merged.pending = [];
      merged.over = false;
      this.state = merged;
      this.allocatePower(true);
    } catch (e) { /* a broken save is ignored and the base starts fresh */ }
  }

  persist() {
    try {
      const s = this.state;
      if (typeof localStorage === 'undefined' || s.over || s.pending.length) return;
      localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(s));
    } catch (e) { }
  }

  clearSaved() {
    try { if (typeof localStorage !== 'undefined') localStorage.removeItem(GAME_SAVE_KEY); } catch (e) { }
  }

  log(type, msg) {
    this.state.logs = [{ tick: this.state.tick, type, msg }, ...this.state.logs.slice(0, 39)];
  }

  on(evt, fn) { (this.listeners[evt] ||= []).push(fn); return () => this.off(evt, fn); }
  off(evt, fn) { this.listeners[evt] = (this.listeners[evt] || []).filter((f) => f !== fn); }
  emit(evt, data) { (this.listeners[evt] || []).forEach((f) => f(data)); }

  isDay() {
    const cycle = (CONFIG.sunDays + CONFIG.nightDays) * CONFIG.ticksPerDay;
    return this.state.tick % cycle < CONFIG.sunDays * CONFIG.ticksPerDay;
  }

  getDayNumber() {
    return Math.floor(this.state.tick / CONFIG.ticksPerDay) + 1;
  }

  getHourFormatted() {
    const hr = this.state.tick % CONFIG.ticksPerDay;
    return `${String(hr).padStart(2, '0')}:00`;
  }

  add(key, amount) {
    const s = this.state;
    s.res[key] = clamp(s.res[key] + amount, 0, s.max[key]);
  }

  canAfford(cost = {}) {
    return Object.entries(cost).every(([k, v]) =>
      k === 'power' ? this.state.res.power >= v : (this.state.wallet[k] ?? 0) >= v
    );
  }

  pay(cost = {}) {
    for (const [k, v] of Object.entries(cost)) {
      if (k === 'power') this.add('power', -v);
      else this.state.wallet[k] -= v;
    }
  }

  setEnabled(id, on) {
    if (this.state.systems[id]) {
      this.state.systems[id].enabled = on;
      this.allocatePower(true);
      this.log('sys', `${SYSTEM_DEFS[id].label} ${on ? 'ENABLED' : 'SHED (OFF)'}.`);
      this.emit('resource', this.state.res);
    }
  }

  solarOutput() {
    if (!this.isDay()) return 0;
    const s = this.state;
    return s.panels * CONFIG.solarPerPanel * s.panelCondition * (1 - s.dust * 0.7);
  }

  allocatePower(dryRun = false) {
    const s = this.state;
    const gen = this.solarOutput();
    let available = gen + s.res.power;
    let used = 0;

    const list = Object.entries(SYSTEM_DEFS)
      .filter(([id]) => s.systems[id].built && s.systems[id].enabled)
      .sort((a, b) => a[1].priority - b[1].priority);

    for (const id of Object.keys(s.systems)) s.systems[id].powered = false;

    for (const [id, def] of list) {
      const need = def.power * (id === 'heater' && !this.isDay() ? 1.2 : 1);
      if (available >= need) {
        s.systems[id].powered = true;
        available -= need;
        used += need;
      }
    }
    s.power = {
      gen: Number(gen.toFixed(1)),
      used: Number(used.toFixed(1)),
      exactGen: gen,
      exactUsed: used,
    };
    if (!dryRun) {
      s.res.power = clamp(s.res.power + gen - used, 0, s.max.power);
    }
  }

  getNetRates() {
    const s = this.state;
    const sys = s.systems;
    const c = CONFIG;
    const r = c.perCrewPerTick;
    const exactUsed = s.power.exactUsed ?? s.power.used;
    const powerNet = Number((this.solarOutput() - exactUsed).toFixed(1));
    const o2Net = Number(((sys.lifeSupport.powered ? c.lifeSupportO2 : 0) - r.oxygen * s.crew - s.leak).toFixed(2));
    const waterUse = r.water * s.crew * (sys.waterRecycler.built && sys.waterRecycler.powered ? 1 - c.recyclerSaving : 1);
    const waterNet = Number((-waterUse).toFixed(2));
    const foodNet = Number(((sys.greenhouse.built && sys.greenhouse.powered ? c.greenhouseFood : 0) - r.food * s.crew).toFixed(2));
    return { power: powerNet, oxygen: o2Net, water: waterNet, food: foodNet };
  }

  step() {
    const s = this.state;
    if (s.over) return;
    const wasDay = this.isDay();
    this.allocatePower(false);
    const sys = s.systems, c = CONFIG, r = c.perCrewPerTick;

    if (wasDay) s.dust = clamp(s.dust + c.dustPerSunTick, 0, 1);

    const waterUse = r.water * s.crew * (sys.waterRecycler.built && sys.waterRecycler.powered ? 1 - c.recyclerSaving : 1);
    this.add('oxygen', (sys.lifeSupport.powered ? c.lifeSupportO2 : 0) - r.oxygen * s.crew - s.leak);
    this.add('water', -waterUse);
    this.add('food', (sys.greenhouse.built && sys.greenhouse.powered ? c.greenhouseFood : 0) - r.food * s.crew);

    let dmg = 0;
    if (s.res.oxygen <= 0) dmg += c.damage.oxygen;
    if (s.res.water <= 0) dmg += c.damage.water;
    if (s.res.food <= 0) dmg += c.damage.food;
    if (!wasDay && !sys.heater.powered) dmg += c.damage.cold;
    this.add('health', dmg > 0 ? -dmg : c.regen);

    s.tick++;
    this.allocatePower(true);

    if (wasDay !== this.isDay()) {
      this.log('env', this.isDay() ? '☀️ Lunar Dawn: Solar generation resumed.' : '🌑 Lunar Nightfall: 48-hour eclipse begun. Running on batteries!');
    }

    s.history.push({
      tick: s.tick,
      power: Number(s.res.power.toFixed(1)),
      oxygen: Number(s.res.oxygen.toFixed(1)),
      water: Number(s.res.water.toFixed(1)),
      food: Number(s.res.food.toFixed(1)),
      health: Number(s.res.health.toFixed(1)),
    });
    if (s.history.length > 96) s.history.shift();

    this.checkAlerts();
    this.checkEvents();
    this.checkMissions();
    this.emit('resource', s.res);
    if (s.res.health <= 0) {
      s.over = true;
      this.log('crit', 'CRITICAL FAILURE: Crew health depleted.');
      this.emit('gameover', { tick: s.tick });
    }
  }

  advance(ticks = CONFIG.ticksPerDay) {
    let n = 0;
    while (n < ticks && !this.state.over && this.state.pending.length === 0) {
      this.step();
      n++;
    }
    return n;
  }

  checkAlerts() {
    for (const k of ['power', 'oxygen', 'water', 'food']) {
      const f = this.state.res[k] / this.state.max[k];
      const lvl = f <= CONFIG.warn[1] ? 2 : f <= CONFIG.warn[0] ? 1 : 0;
      if (lvl > (this.alertLevel[k] || 0)) {
        this.log('warn', `${k.toUpperCase()} dropped below ${lvl === 2 ? '18% (CRITICAL)' : '35% (WARNING)'}!`);
        this.emit('alert', { resource: k, level: lvl, value: this.state.res[k] });
      }
      this.alertLevel[k] = lvl;
    }
  }

  checkEvents() {
    const s = this.state;
    for (const ev of EVENTS) {
      if (s.pending.includes(ev.id)) continue;
      const last = s.fired[ev.id];
      if (last !== undefined && s.tick - last < ev.cooldown) continue;
      if (!ev.when(this)) continue;
      this.triggerEventById(ev.id);
    }
  }

  triggerEventById(eventId) {
    const s = this.state;
    const ev = EVENTS.find((e) => e.id === eventId);
    if (!ev || s.pending.includes(ev.id)) return;
    if (s.fired[ev.id] === undefined) ev.onTrigger?.(this);
    s.fired[ev.id] = s.tick;
    s.pending.push(ev.id);
    this.allocatePower(true);
    this.log('alert', `CRISIS: ${ev.title}`);
    this.emit('decision', this.describe(ev));
  }

  describe(ev) {
    return {
      id: ev.id,
      title: ev.title,
      warning: ev.warning,
      scienceLesson: ev.scienceLesson,
      scienceDetail: ev.scienceDetail,
      timeLimitSec: ev.timeLimitSec ?? null,
      options: ev.options.map((o) => ({
        id: o.id,
        label: o.label,
        cost: o.cost || {},
        affordable: this.canAfford(o.cost),
      })),
    };
  }

  decide(eventId, optionId, force = false) {
    const ev = EVENTS.find((e) => e.id === eventId);
    const opt = ev?.options.find((o) => o.id === optionId);
    if (!opt || !this.state.pending.includes(eventId)) return { ok: false, reason: 'invalid' };
    if (!force && !this.canAfford(opt.cost)) return { ok: false, reason: 'Insufficient resources' };
    if (this.canAfford(opt.cost)) this.pay(opt.cost);
    const outcome = opt.run(this);
    this.state.pending = this.state.pending.filter((id) => id !== eventId);
    this.allocatePower(true);
    this.log('decision', `Resolved ${ev.title} -> ${opt.label}`);
    this.checkMissions();
    this.emit('outcome', {
      eventId,
      optionId,
      outcome,
      scienceLesson: ev.scienceLesson,
      scienceDetail: ev.scienceDetail,
    });
    this.emit('resource', this.state.res);
    return { ok: true, outcome };
  }

  expire(eventId) {
    const ev = EVENTS.find((e) => e.id === eventId);
    if (!ev) return;
    const pick =
      ev.options.find((o) => o.id === ev.defaultOption && this.canAfford(o.cost)) ||
      ev.options.find((o) => this.canAfford(o.cost));
    if (pick) return this.decide(eventId, pick.id, true);
    const outcome = 'No resources were available to respond. Nothing could be done.';
    this.state.pending = this.state.pending.filter((id) => id !== eventId);
    this.log('warn', `Expired ${ev.title}: ${outcome}`);
    this.emit('outcome', { eventId, optionId: null, outcome, scienceLesson: ev.scienceLesson, scienceDetail: ev.scienceDetail });
    this.emit('resource', this.state.res);
    return { ok: true, outcome };
  }

  buyUpgrade(id) {
    const u = UPGRADES[id], s = this.state;
    if (!u) return { ok: false, reason: 'Unknown upgrade' };
    if (!u.repeat && s.upgrades.includes(id)) return { ok: false, reason: 'Already built' };
    if (!this.canAfford(u.cost)) return { ok: false, reason: 'Not enough Coins, Science Points, or Materials' };
    this.pay(u.cost);
    u.apply(this);
    s.upgrades.push(id);
    this.allocatePower(true);
    this.log('build', `Constructed ${u.label}!`);
    this.checkMissions();
    this.emit('resource', s.res);
    return { ok: true, upgrade: u };
  }

  sendRoverExpedition() {
    const cost = { power: 15 };
    const wait = 24 - (this.state.tick - this.state.lastRoverTick);
    if (wait > 0) return { ok: false, reason: `Rover is recharging and servicing: ready in ${wait} hours` };
    if (!this.canAfford(cost)) return { ok: false, reason: 'Need 15 Power to charge Rover battery' };
    this.pay(cost);
    this.state.lastRoverTick = this.state.tick;
    const bonus = this.state.roverUpgraded ? 2 : 0;
    const samples = 2 + Math.floor(this.rng() * 2) + bonus;
    const mats = 45 + Math.floor(this.rng() * 35);
    this.state.soilSamples += samples;
    this.state.wallet.materials += mats;
    this.state.wallet.coins += 100;
    this.state.wallet.points += 25;
    this.allocatePower(true);
    this.log('eva', `Rover EVA returned: +${samples} Soil Samples, +${mats} Materials.`);
    this.checkMissions();
    this.emit('resource', this.state.res);
    return { ok: true, samples, mats };
  }

  checkMissions() {
    for (const m of MISSIONS) {
      if (this.state.done.includes(m.id) || !m.check(this)) continue;
      this.state.done.push(m.id);
      if (m.reward.coins) this.state.wallet.coins += m.reward.coins;
      if (m.reward.points) this.state.wallet.points += m.reward.points;
      if (m.reward.badge && !this.state.badges.includes(m.reward.badge)) {
        this.state.badges.push(m.reward.badge);
      }
      this.log('mission', `MISSION COMPLETE: ${m.title} (+${m.reward.coins} Coins)`);
      this.emit('mission', m);
    }
  }
}

/* ============================================================================
   2. REAL-TIME 3D WEBGL LUNAR OUTPOST COMPONENT (THREE.JS)
   ============================================================================ */
const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

/* On-screen joystick: drag the round knob to walk (works with a finger or a mouse). */
function Joystick() {
  const ref = useRef(null);
  const activeId = useRef(null);
  const [knob, setKnob] = useState([0, 0]);
  const R = 46;
  const reset = useCallback(() => { activeId.current = null; setKnob([0, 0]); runner.setAxes('pad', 0, 0); }, []);
  useEffect(() => reset, [reset]);
  const update = (e) => {
    const rect = ref.current.getBoundingClientRect();
    let dx = e.clientX - (rect.left + rect.width / 2), dy = e.clientY - (rect.top + rect.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = dx / d * R; dy = dy / d * R; }
    setKnob([dx, dy]);
    runner.setAxes('pad', dx / R, -dy / R);
  };
  return (
    <div
      ref={ref}
      aria-label="Walking joystick"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); activeId.current = e.pointerId; update(e); }}
      onPointerMove={(e) => { if (activeId.current === e.pointerId) update(e); }}
      onPointerUp={reset}
      onPointerCancel={reset}
      style={{ touchAction: 'none' }}
      className="absolute bottom-[112px] left-4 z-30 h-32 w-32 select-none rounded-full border-2 border-sky-300/50 bg-slate-950/55 shadow-[0_0_24px_rgba(56,189,248,.25)] backdrop-blur-sm sm:bottom-[116px] sm:left-6"
    >
      <span className="pointer-events-none absolute left-1/2 top-1.5 -translate-x-1/2 text-[10px] font-black text-sky-200/70">▲</span>
      <span className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] font-black text-sky-200/70">▼</span>
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-sky-200/70">◀</span>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-sky-200/70">▶</span>
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 rounded-full border-2 border-sky-100/70 bg-sky-400/70 shadow-lg"
        style={{ transform: `translate(calc(-50% + ${knob[0]}px), calc(-50% + ${knob[1]}px))` }}
      />
    </div>
  );
}

/* Big friendly button that appears next to the rover (or while driving it). */
function RoverButton() {
  const m = useMissionRunner();
  if (m.inside || (!m.driving && !m.nearRover)) return null;
  return (
    <button
      onClick={() => runner.toggleRover()}
      className="absolute bottom-[124px] left-1/2 z-30 -translate-x-1/2 rounded-full border-2 border-amber-200 bg-amber-400 px-5 py-3 text-sm font-black text-slate-900 shadow-[0_0_26px_rgba(251,191,36,.55)] hover:bg-amber-300 active:scale-95"
    >
      {m.driving ? '🧑‍🚀 Hop out of the rover (E)' : '🚙 Hop into the rover (E)'}
    </button>
  );
}

/* Enter / exit button for the habitat. Appears at the habitat door outside, and at the airlock inside. */
function HabitatControls() {
  const m = useMissionRunner();
  if (m.driving || !m.running) return null;
  const outsideNear = !m.inside && m.nearDoor;
  const insideNear = m.inside && m.nearExit;
  if (!outsideNear && !insideNear) return null;
  const bottom = !m.inside && m.nearRover ? 'bottom-[184px]' : 'bottom-[124px]';
  return (
    <button
      onClick={() => runner.interact()}
      className={`absolute ${bottom} left-1/2 z-30 -translate-x-1/2 rounded-full border-2 border-cyan-200 bg-cyan-400 px-5 py-3 text-sm font-black text-slate-900 shadow-[0_0_26px_rgba(34,211,238,.55)] hover:bg-cyan-300 active:scale-95`}
    >
      {m.inside ? '🌙 Go outside to the Moon (E)' : '🚪 Enter the habitat (E)'}
    </button>
  );
}

/* Quick dark fade whenever you go through the airlock. */
function HabitatFade() {
  const m = useMissionRunner();
  const [on, setOn] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return undefined; }
    setOn(true);
    const id = setTimeout(() => setOn(false), 380);
    return () => clearTimeout(id);
  }, [m.inside]);
  return <div className={`pointer-events-none absolute inset-0 z-[60] bg-slate-950 transition-opacity duration-300 ${on ? 'opacity-100' : 'opacity-0'}`} />;
}

/* Info card for the machine you are standing next to inside the habitat. */
function StationPanel({ game }) {
  const m = useMissionRunner();
  const [, bump] = useState(0);
  useEffect(() => {
    if (!m.inside) return undefined;
    const id = setInterval(() => bump((v) => v + 1), 500);
    return () => clearInterval(id);
  }, [m.inside]);
  if (!m.inside) return null;
  const def = m.station ? STATION_BY_ID[m.station] : null;
  if (!def) {
    return (
      <div className="pointer-events-none absolute left-1/2 top-3 z-30 w-[min(92vw,380px)] -translate-x-1/2 rounded-xl border border-sky-400/40 bg-slate-950/85 px-3 py-2 text-center text-[11px] font-semibold text-sky-100 shadow-lg backdrop-blur-md">
        🏠 Inside the habitat · Walk up to a glowing machine to see how it works · Airlock is the green door
      </div>
    );
  }
  const ro = stationReadout(def.id, { s: game.state, rates: game.getNetRates(), isDay: game.isDay() });
  const col = STATUS_COLOR[ro.status] || '#8892a8';
  return (
    <div className="absolute left-1/2 top-3 z-30 w-[min(92vw,380px)] -translate-x-1/2 rounded-xl border border-sky-400/50 bg-slate-950/90 p-3 text-slate-100 shadow-[0_0_24px_rgba(56,189,248,.25)] backdrop-blur-md">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-black text-sky-100"><span className="text-lg">{def.icon}</span>{def.label}</div>
        <span className="h-3 w-3 rounded-full" style={{ background: col, boxShadow: `0 0 10px ${col}` }} />
      </div>
      {!ro.built ? (
        <p className="mt-2 text-xs text-amber-200">{ro.note}</p>
      ) : (
        <>
          <div className="mt-2 space-y-1">
            {ro.lines.map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs"><span className="text-slate-400">{k}</span><b className="text-white">{v}</b></div>
            ))}
          </div>
          {ro.bars.length > 0 && (
            <div className="mt-2 space-y-1">
              {ro.bars.map((b) => (
                <div key={b.label} className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span className="w-16 shrink-0">{b.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full" style={{ width: `${Math.round(Math.max(0, Math.min(1, b.v)) * 100)}%`, background: b.color }} /></div>
                </div>
              ))}
            </div>
          )}
          {ro.toggles && (
            <div className="mt-3 space-y-1.5">
              {ro.toggles.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-200">{t.label} <span className="text-slate-500">({t.draw}/hr)</span></span>
                  {t.built ? (
                    <button
                      onClick={() => game.setEnabled(t.id, !t.enabled)}
                      disabled={t.id === 'lifeSupport'}
                      title={t.id === 'lifeSupport' ? 'Life support always stays on' : 'Switch this machine on or off'}
                      className={`min-w-[84px] rounded-md border px-2 py-1 text-[10px] font-black ${t.state === 'ON' ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200' : t.state === 'NO POWER' ? 'border-amber-400/60 bg-amber-500/20 text-amber-200' : 'border-slate-600 bg-slate-800 text-slate-300'} disabled:opacity-60`}
                    >
                      {t.state}
                    </button>
                  ) : (
                    <span className="min-w-[84px] text-center text-[10px] font-bold text-slate-500">NOT BUILT</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {ro.tip && <p className="mt-2 border-t border-slate-700/60 pt-2 text-[11px] leading-relaxed text-sky-200/80">💡 {ro.tip}</p>}
    </div>
  );
}

function LunarOutpost3D({ onOpenMissions, controlsEnabled = true, state, game }) {
  const mountRef = useRef(null);
  const buildStateRef = useRef(state);
  buildStateRef.current = state;
  const gameRef = useRef(game);
  gameRef.current = game;
  const [showKeys, setShowKeys] = useState(true);
  const missionSnapshot = useMissionRunner();

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const cleanup = initHalcyonRidge(container, THREE, {
      getActors: () => runner.getActors(),
      getBuildState: () => buildStateRef.current,
      // live numbers for the screens inside the habitat
      getSim: () => { const g = gameRef.current; return g ? { s: g.state, rates: g.getNetRates(), isDay: g.isDay() } : null; },
      setCameraTheta: (t) => runner.setCameraTheta(t),
      // Each chapter/mission receives its own deterministic terrain seed.
      seed: 20261114 + missionSnapshot.chapter * 1009 + missionSnapshot.missionIndex * 7919,
    });
    return () => cleanup?.();
  }, [missionSnapshot.chapter, missionSnapshot.missionIndex]);

  // Keyboard: W A S D / arrow keys walk (or steer the rover), Shift runs, E hops in and out of the rover.
  useEffect(() => {
    runner.setAxes('kb', 0, 0);
    runner.setRun(false);
    if (!controlsEnabled) { runner.setAxes('pad', 0, 0); return undefined; }
    const keys = new Set();
    const typing = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '') || e.target?.isContentEditable;
    const update = () => {
      const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      const r = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      runner.setAxes('kb', r, f);
      runner.setRun(keys.has('ShiftLeft') || keys.has('ShiftRight'));
    };
    const down = (e) => {
      if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (MOVE_KEYS.includes(e.code) || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (e.code.startsWith('Arrow') || e.code.startsWith('Key')) e.preventDefault();
        keys.add(e.code); update();
      } else if (e.code === 'KeyE' && !e.repeat) { runner.interact(); }
    };
    const up = (e) => { if (keys.delete(e.code)) update(); };
    const blur = () => { keys.clear(); update(); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      runner.setAxes('kb', 0, 0); runner.setRun(false);
    };
  }, [controlsEnabled]);

  // The controls reminder fades away on its own after a while.
  useEffect(() => {
    const id = setTimeout(() => setShowKeys(false), 20000);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="relative w-full h-full min-h-[420px] overflow-hidden select-none bg-[#0b0b1c]">
      <div ref={mountRef} className="absolute inset-0">
        <canvas id="scene" aria-label="Halcyon Ridge 3D lunar outpost" className="absolute inset-0 h-full w-full touch-none cursor-grab active:cursor-grabbing" />
        <header className="pointer-events-none absolute left-5 top-5 z-10 max-w-[300px] sm:left-8 sm:top-7">
          <h2 className="mb-1 text-xl font-semibold tracking-tight text-[#f1e6d0] sm:text-2xl">{missionSnapshot.inside ? 'Habitat Core' : 'Halcyon Ridge'}</h2>
          <p className="text-xs leading-relaxed text-[#f1e6d0]/65">{missionSnapshot.inside
            ? 'Power, air, water and food all run from this room. Walk up to a machine to see how it works.'
            : 'Your outpost begins with one habitat. Build modules one at a time; each structure appears in the world when completed.'}</p>
        </header>
        {showKeys && !missionSnapshot.inside && (
          <button
            onClick={() => setShowKeys(false)}
            className="absolute left-1/2 top-3 z-30 max-w-[92%] -translate-x-1/2 rounded-full border border-sky-300/40 bg-slate-950/80 px-4 py-1.5 text-center text-[11px] font-semibold text-sky-100 shadow-lg backdrop-blur-md"
          >
            🎮 Walk: <b>W A S D</b> or <b>arrow keys</b> or the joystick · Run: <b>Shift</b> · Rover or door: <b>E</b> · Drag the screen to look around
          </button>
        )}
        <Joystick />
        <RoverButton />
        <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 origin-bottom scale-[0.85] sm:scale-100">
          <OrionCompanion inline />
        </div>
        <HabitatControls />
        <StationPanel game={game} />
        <HabitatFade />
        <MissionChip onOpen={onOpenMissions} />
      </div>
      <style>{`
        #scene { display: block; }
      `}</style>
    </div>
  );
}

/* ============================================================================
   3. TELEMETRY SPARKLINE CHART COMPONENT
   ============================================================================ */
function TelemetryChart({ history, maxPower }) {
  if (!history || history.length < 2) {
    return (
      <div className="h-24 flex items-center justify-center text-[11px] text-slate-500 border border-slate-800/80 rounded-lg bg-slate-950/60">
        Advance time or start Auto-Sim to record multi-channel telemetry...
      </div>
    );
  }

  const w = 280;
  const h = 88;
  const pad = 6;

  const makePath = (key, maxVal) => {
    return history
      .map((pt, idx) => {
        const x = pad + (idx / Math.max(1, history.length - 1)) * (w - pad * 2);
        const y = h - pad - clamp(pt[key] / maxVal, 0, 1) * (h - pad * 2);
        return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  return (
    <div className="rounded-lg bg-slate-950/90 border border-slate-800 p-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20 overflow-visible">
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={pad}
            x2={w - pad}
            y1={h * f}
            y2={h * f}
            stroke="#1e293b"
            strokeDasharray="2 2"
            strokeWidth="1"
          />
        ))}
        <path d={makePath('power', maxPower)} fill="none" stroke="#fbbf24" strokeWidth="1.8" />
        <path d={makePath('oxygen', 100)} fill="none" stroke="#38bdf8" strokeWidth="1.5" />
        <path d={makePath('water', 100)} fill="none" stroke="#60a5fa" strokeWidth="1.5" />
        <path d={makePath('food', 100)} fill="none" stroke="#34d399" strokeWidth="1.5" />
        <path d={makePath('health', 100)} fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 2" />
      </svg>
      <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-1 border-t border-slate-900">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />Pwr</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400" />O₂</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" />H₂O</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />Food</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" />HP</span>
      </div>
    </div>
  );
}


/* ============================================================================
   MISSION STATUS: objectives are player-controlled; the player chooses when to begin the next mission.
   This window only lets you CHECK the current mission, the next mission and the completed missions.
   ============================================================================ */
function useMissionRunner() {
  return useSyncExternalStore(runner.subscribe, runner.getSnapshot, runner.getSnapshot);
}

function MissionChip({ onOpen }) {
  const m = useMissionRunner();
  const total = m.mission ? m.mission.steps.length : 1;
  const pct = m.finished ? 100 : Math.round(((m.step + m.stepProgress) / total) * 100);
  return (
    <button onClick={onOpen} title="Open my missions" className="absolute right-3 top-[12rem] z-20 w-[220px] max-w-[46vw] rounded-xl border border-sky-400/40 bg-slate-950/85 p-2.5 text-left shadow-lg backdrop-blur-md hover:border-sky-300">
      <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest">
        <span className="text-sky-300">{m.finished ? 'All missions complete' : `Chapter ${m.chapter} · Mission ${m.missionIndex + 1}/5`}</span>
        <span className={m.running ? 'text-emerald-400' : 'text-amber-300'}>{m.running ? '● PLAYING' : 'Ⅱ PAUSED'}</span>
      </div>
      <div className="mt-1 truncate text-xs font-bold text-white">{m.mission ? m.mission.title : 'Campaign finished'}</div>
      <div className="mt-0.5 truncate text-[10px] text-slate-400">{m.activity}</div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-sky-400 transition-all" style={{ width: `${pct}%` }} /></div>
    </button>
  );
}

function MissionStatus({ onClose }) {
  const m = useMissionRunner();
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  const steps = m.mission ? m.mission.steps : [];
  const overall = m.finished ? 100 : Math.round(((m.step + m.stepProgress) / Math.max(1, steps.length)) * 100);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/90 p-3 backdrop-blur-md sm:p-6">
      <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-sky-400/50 bg-[#07111f] shadow-2xl">
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/95 px-5 py-4">
          <div>
            <div className="text-[10px] tracking-[.25em] text-sky-300">MISSION VOID / MY MISSIONS</div>
            <h2 className="text-xl font-black text-white">Mission Control</h2>
            <p className="text-[11px] text-slate-400">You are the astronaut! Walk to the glowing ring to do each job. Closing this window never restarts a mission.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => runner.setRunning(!m.running)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${m.running ? 'border-amber-400/50 text-amber-200 hover:bg-amber-500/10' : 'border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/10'}`}>{m.running ? 'Pause game' : 'Resume game'}</button>
            <button onClick={onClose} className="rounded-lg p-2 text-slate-300 hover:bg-slate-800" aria-label="Close"><X className="h-5 w-5" /></button>
          </div>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            <section className="rounded-xl border border-sky-500/30 bg-slate-900/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Current mission</div>
                  {m.mission ? (<>
                    <h3 className="mt-1 text-lg font-bold text-white">{m.mission.title}</h3>
                    <div className="text-[10px] text-slate-500">Chapter {m.chapter} · {m.chapterTitle} · Mission {m.missionIndex + 1} of 5</div>
                    <p className="mt-2 text-xs text-slate-400">{m.mission.description}</p>
                  </>) : <h3 className="mt-1 text-lg font-bold text-emerald-300">Every mission is complete.</h3>}
                </div>
                {m.mission && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">Reward: {m.mission.coins} coins · {m.mission.science} SP</div>}
              </div>
              {m.mission && (<>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-sky-400 transition-all" style={{ width: `${overall}%` }} /></div>
                <div className="mt-1 flex justify-between text-[10px] text-slate-400"><span>{m.running ? 'You are playing' : 'Paused'}</span><span>{overall}%</span></div>
                <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/70 p-2.5 text-xs text-sky-200"><span className="mr-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Your next move</span>{m.activity}</div>
                {m.phase === 'choice' && m.next && <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3"><div className="text-sm font-bold text-emerald-200">Mission completed — your choice</div><p className="mt-1 text-xs text-slate-300">Take a break, build or explore your outpost, or start the next mission whenever you are ready.</p><button onClick={() => runner.continueMission()} className="mt-3 rounded-lg bg-emerald-400 px-4 py-2 text-xs font-black text-slate-950 hover:bg-emerald-300">Start next mission</button></div>}
                <ol className="mt-3 space-y-1.5">
                  {steps.map((label, i) => {
                    const state = i < m.step ? 'done' : i === m.step ? 'active' : 'todo';
                    return (
                      <li key={label} className={`flex items-start gap-3 rounded-lg p-2 text-xs ${state === 'done' ? 'bg-emerald-500/10 text-emerald-200' : state === 'active' ? 'border border-sky-500/40 bg-sky-500/10 text-white' : 'text-slate-500'}`}>
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-bold">{state === 'done' ? '✓' : i + 1}</span>
                        <span className="flex-1">{label}{state === 'active' && m.phase === 'work' && <span className="mt-1 block h-1 overflow-hidden rounded-full bg-slate-800"><span className="block h-full bg-sky-400 transition-all" style={{ width: `${Math.round(m.stepProgress * 100)}%` }} /></span>}</span>
                      </li>
                    );
                  })}
                </ol>
              </>)}
            </section>
            <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-sky-300">Next mission</div>
              {m.next ? (<>
                <h4 className="mt-1 text-sm font-bold text-white">{m.next.title}</h4>
                <div className="text-[10px] text-slate-500">Chapter {m.next.chapter} · {m.next.chapterTitle} · Mission {m.next.index + 1} of 5</div>
                <p className="mt-1 text-xs text-slate-400">{m.next.description}</p>
                <div className="mt-2 text-[11px] text-amber-200">Reward: {m.next.coins} coins · {m.next.science} SP</div>
              </>) : <p className="mt-1 text-xs text-slate-400">{m.finished ? 'The campaign is finished.' : 'This is the final mission of the campaign.'}</p>}
            </section>
          </div>
          <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between"><div className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Completed missions</div><div className="text-[10px] text-slate-400">{m.completed.length} / {m.totalMissions}</div></div>
            <div className="mt-1 text-[10px] text-slate-500">Earned so far: {m.earnedCoins} coins · {m.earnedScience} SP</div>
            <ul className="mt-3 max-h-[60vh] space-y-1.5 overflow-y-auto pr-1">
              {m.completed.length === 0 && <li className="text-xs text-slate-500">Nothing completed yet.</li>}
              {m.completed.slice().reverse().map((c) => (
                <li key={c.key} className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-white"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />{c.title}</div>
                  <div className="mt-0.5 pl-6 text-[10px] text-slate-400">Chapter {c.chapter} · Mission {c.index + 1} · +{c.coins} coins · +{c.science} SP</div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   4. MAIN APPLICATION & COMPLETE 7-SCREEN UI/UX + SIMULATION LAB
   ============================================================================ */
export default function App() {
  const gameRef = useRef(null);
  if (!gameRef.current) {
    gameRef.current = new Game({ seed: 42 });
  }
  const game = gameRef.current;
  const missionSnapshot = useMissionRunner();

  const [screen, setScreen] = useState('dashboard');
  const [activeModal, setActiveModal] = useState(null);
  const [buildTab, setBuildTab] = useState('Build');
  const [buildCategory, setBuildCategory] = useState('Habitation');
  const [selectedUpgradeId, setSelectedUpgradeId] = useState('greenhouse');
  const [selectedChapter, setSelectedChapter] = useState(1);

  const [simSpeed, setSimSpeed] = useState(0); // 0 = paused, 1 = 1x, 4 = 4x, 12 = 12x
  const [aiPolicy, setAiPolicy] = useState('manual'); // 'manual' | 'optimal' | 'conserve' | 'reckless'

  const [, setVersion] = useState(0);
  const refresh = useCallback(() => { game.persist(); setVersion((v) => v + 1); }, [game]);

  const [activeDecision, setActiveDecision] = useState(null);
  const [completedMission, setCompletedMission] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [toast, setToast] = useState('Welcome to MISSION VOID — 3D Lunar Simulation & Telemetry Active.');
  const announceToast = (message, opts) => { setToast(message); speakOrion(message, opts); };
  const [showHowTo, setShowHowTo] = useState(true);
  const [roverMoving, setRoverMoving] = useState(false);
  const [showFieldOps, setShowFieldOps] = useState(false);
  const [showNasa, setShowNasa] = useState(false);   // read-only NASA open-data window

  // The mission runner lives for as long as the app does: the astronaut keeps working with the status window closed.
  useEffect(() => {
    const pay = () => {
      const rewards = runner.drainRewards();
      if (!rewards.length) return;
      rewards.forEach((r) => {
        game.state.wallet.coins += r.coins;
        game.state.wallet.points += r.science;
        game.log('mission', `${r.title} completed (+${r.coins} coins, +${r.science} science)`);
      });
      refresh();
    };
    const CHEERS = ['Awesome job!', 'Great work, Explorer!', 'You did it!', 'Super moves!', 'Out of this world!', 'Nice one!'];
    let cheer = 0;
    const off = runner.onEvent((e) => {
      if (e.type === 'mission-start') announceToast(`New mission! ${e.title}. ${e.description}`, { queue: true });
      else if (e.type === 'step') { setToast(`Objective ${e.step + 1} of ${e.total}: ${e.label}`); speakOrion(`Objective ${e.step + 1}. ${e.label}. Follow the yellow arrow to the glowing ring!`, { queue: true }); }
      else if (e.type === 'arrive') speakOrion('You made it! Stay inside the ring while you work.');
      else if (e.type === 'step-done') speakOrion(CHEERS[cheer++ % CHEERS.length]);
      else if (e.type === 'nudge') speakOrion('Need help? Follow the yellow arrow floating above you. It points to the glowing ring!');
      else if (e.type === 'rover-enter') speakOrion('Vroom vroom! Steer the rover with the arrow keys or the joystick. Press E to hop out.');
      else if (e.type === 'rover-exit') speakOrion('Nice parking! You can walk again.');
      else if (e.type === 'habitat-enter') speakOrion('Welcome inside the habitat! Walk up to any machine to see how it works. Your mission will wait for you outside.');
      else if (e.type === 'habitat-exit') speakOrion('Back on the Moon! Your mission is ready when you are.');
      else if (e.type === 'station-near' && STATION_SPEECH[e.id]) speakOrion(STATION_SPEECH[e.id]);
      else if (e.type === 'mission-complete') { pay(); announceToast(`Mission complete: ${e.title}! You earned ${e.coins} coins and ${e.science} science points. Fantastic, Explorer!`); }
      else if (e.type === 'chapter-complete') announceToast(`Chapter ${e.chapter} complete! Chapter ${e.next} begins.`, { queue: true });
      else if (e.type === 'all-complete') announceToast('Every mission is complete! You are a real Moon hero!', { queue: true });
    });
    pay();
    runner.setRunning(false);   // paused until the player taps "Let's go!"
    runner.start();
    return () => { off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Execute AI Commander policy for automated simulation testing
  const runAiCommanderPolicy = useCallback((policy) => {
    const s = game.state;
    if (s.over || policy === 'manual') return;

    // 1. Resolve any pending crisis immediately according to policy
    if (s.pending.length > 0) {
      const evId = s.pending[0];
      const ev = EVENTS.find((e) => e.id === evId);
      if (ev) {
        let chosen = ev.defaultOption;
        if (policy === 'optimal') {
          const preferred = ev.options[0];
          chosen = game.canAfford(preferred.cost) ? preferred.id : ev.defaultOption;
        } else if (policy === 'conserve') {
          const freeOpt = ev.options.find((o) => !o.cost || Object.keys(o.cost).length === 0) || ev.options[0];
          chosen = freeOpt.id;
        } else if (policy === 'reckless') {
          chosen = ev.options[ev.options.length - 1].id;
        }
        game.decide(evId, chosen, true);
        setActiveDecision(null);
        setCountdown(null);
        setActiveModal((m) => (m === 'crisis' ? null : m));
      }
    }

    // 2. Proactive upgrades & load-shedding when running Optimal Commander policy
    if (policy === 'optimal') {
      if (!s.systems.waterRecycler.built && game.canAfford(UPGRADES.waterRecycler.cost)) {
        game.buyUpgrade('waterRecycler');
      }
      if (!s.systems.greenhouse.built && game.canAfford(UPGRADES.greenhouse.cost)) {
        game.buyUpgrade('greenhouse');
      }
      if (s.panels < 6 && game.canAfford(UPGRADES.solarPanels.cost)) {
        game.buyUpgrade('solarPanels');
      }
      if (s.soilSamples < 5 && s.res.power >= 60 && s.tick - s.lastRoverTick >= 24) {
        game.sendRoverExpedition();
      }
      const shouldRunLab = game.isDay() && s.res.power > 75;
      if (s.systems.scienceLab.enabled !== shouldRunLab) {
        game.setEnabled('scienceLab', shouldRunLab);
      }
    } else if (policy === 'conserve') {
      if (s.systems.scienceLab.enabled) game.setEnabled('scienceLab', false);
    }
  }, [game]);

  useEffect(() => {
    const unsubRes = game.on('resource', () => refresh());
    const unsubDec = game.on('decision', (ev) => {
      if (aiPolicy !== 'manual') {
        runAiCommanderPolicy(aiPolicy);
        refresh();
        return;
      }
      setActiveDecision(ev);
      setActiveModal('crisis');
      if (ev.timeLimitSec) setCountdown(ev.timeLimitSec);
      refresh();
    });
    const unsubOut = game.on('outcome', (data) => {
      announceToast(data.outcome);
      refresh();
    });
    const unsubMis = game.on('mission', (m) => {
      setCompletedMission(m);
      if (simSpeed === 0) {
        setActiveModal('missionComplete');
      }
      refresh();
    });
    const unsubOver = game.on('gameover', () => {
      setSimSpeed(0);
      setActiveModal('gameover');
      refresh();
    });
    return () => {
      unsubRes();
      unsubDec();
      unsubOut();
      unsubMis();
      unsubOver();
    };
  }, [game, refresh, aiPolicy, simSpeed, runAiCommanderPolicy]);

  // Real-Time Simulation Loop Ticker
  useEffect(() => {
    if (simSpeed <= 0 || screen !== 'dashboard') return;
    const intervalMs = Math.max(90, Math.floor(800 / simSpeed));
    const timer = setInterval(() => {
      if (game.state.over) {
        setSimSpeed(0);
        return;
      }
      if (game.state.pending.length > 0) {
        if (aiPolicy !== 'manual') {
          runAiCommanderPolicy(aiPolicy);
        } else {
          setSimSpeed(0);
          return;
        }
      }
      game.step();
      if (aiPolicy !== 'manual') {
        runAiCommanderPolicy(aiPolicy);
      }
      refresh();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [simSpeed, screen, aiPolicy, game, refresh, runAiCommanderPolicy]);

  // Crisis Countdown Timer
  useEffect(() => {
    if (countdown === null || activeModal !== 'crisis' || !activeDecision) return;
    if (countdown <= 0) {
      game.expire(activeDecision.id);
      setActiveDecision(null);
      setActiveModal((m) => (m === 'crisis' ? null : m));
      setCountdown(null);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, activeModal, activeDecision, game]);

  const s = game.state;
  const rates = game.getNetRates();
  const isDay = game.isDay();
  const currentMission = MISSIONS.find((m) => !s.done.includes(m.id)) || MISSIONS[MISSIONS.length - 1];

  const handleNextDay = () => {
    if (s.over) {
      setActiveModal('gameover');
      return;
    }
    if (s.pending.length > 0) {
      const ev = EVENTS.find((e) => e.id === s.pending[0]);
      if (ev) {
        setActiveDecision(game.describe(ev));
        setActiveModal('crisis');
      }
      return;
    }
    const stepped = game.advance(24);
    announceToast(`Advanced +${stepped} lunar hours (Day ${game.getDayNumber()}).`);
    refresh();
  };

  const handleStepHour = () => {
    if (s.over) {
      setActiveModal('gameover');
      return;
    }
    if (s.pending.length > 0) {
      const ev = EVENTS.find((e) => e.id === s.pending[0]);
      if (ev) {
        setActiveDecision(game.describe(ev));
        setActiveModal('crisis');
      }
      return;
    }
    game.step();
    refresh();
  };

  // Batch 8-Day Lunar Cycle Benchmark Runner
  const handleRunFullCycleSim = () => {
    const policyToUse = aiPolicy === 'manual' ? 'optimal' : aiPolicy;
    setAiPolicy(policyToUse);
    let ticksRun = 0;
    while (ticksRun < 192 && !game.state.over && game.state.tick < 192) {
      runAiCommanderPolicy(policyToUse);
      game.step();
      runAiCommanderPolicy(policyToUse);
      ticksRun++;
    }
    announceToast(`Simulated ${ticksRun} hrs using '${policyToUse.toUpperCase()}' policy! Health: ${Math.round(game.state.res.health)}%`);
    refresh();
  };

  const handleDecisionChoice = (optionId) => {
    if (!activeDecision) return;
    const res = game.decide(activeDecision.id, optionId);
    if (!res.ok) {
      announceToast(`Cannot select: ${res.reason}`);
      return;
    }
    setActiveDecision(null);
    setCountdown(null);
    setActiveModal((m) => (m === 'crisis' ? null : m));
    refresh();
  };

  const handleBuildAction = (upgradeId) => {
    const res = game.buyUpgrade(upgradeId);
    if (!res.ok) {
      announceToast(`Build failed: ${res.reason}`);
      return;
    }
    announceToast(`${res.upgrade.label} constructed! The new structure is now visible on the lunar surface. Check your Materials, Coins and Science Points to see what was spent.`);
    refresh();
  };

  const handleRoverExplore = () => {
    const res = game.sendRoverExpedition();
    if (!res.ok) {
      announceToast(res.reason);
      return;
    }
    setRoverMoving(true);
    setTimeout(() => setRoverMoving(false), 3200);
    announceToast(`Rover EVA Complete! Collected +${res.samples} Soil Samples & +${res.mats} Materials.`);
    refresh();
  };

  const handle3DObjectClick = useCallback((actionType) => {
    if (actionType === 'build') {
      setBuildTab('Build');
      setBuildCategory('Habitation');
      setSelectedUpgradeId('greenhouse');
      setActiveModal('build');
    } else if (actionType === 'build_recycler') {
      setBuildTab('Build');
      setBuildCategory('Life Support');
      setSelectedUpgradeId('waterRecycler');
      setActiveModal('build');
    } else if (actionType === 'upgrade') {
      setBuildTab('Upgrade');
      setActiveModal('build');
    } else if (actionType === 'explore') {
      setActiveModal('sidequest');
    } else if (actionType === 'sidequest') {
      setActiveModal('sidequest');
    } else if (actionType === 'solar') {
      if (game.state.panelCondition < 1) {
        game.triggerEventById('solar_damage');
      } else {
        setBuildTab('Build');
        setBuildCategory('Energy');
        setSelectedUpgradeId('solarPanels');
        setActiveModal('build');
      }
    }
  }, [game]);

  const formatTimer = (sec) => {
    const sNum = Math.max(0, sec || 0);
    return `00:00:${String(sNum).padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-screen bg-[#050811] text-slate-100 font-sans overflow-hidden select-none flex flex-col">

      {/* ====================================================================
          SCREEN 1: MAIN MENU
         ==================================================================== */}
      {screen === 'menu' && (
        <div className="relative flex-1 flex flex-col justify-between p-10 overflow-hidden bg-gradient-to-b from-[#040711] via-[#0b1528] to-[#111827]">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute right-24 top-12 w-72 h-72 rounded-full bg-gradient-to-tr from-blue-700 via-sky-400 to-emerald-200 shadow-[0_0_90px_rgba(56,189,248,0.45)] opacity-90" />
            <div className="absolute bottom-0 inset-x-0 h-56 bg-gradient-to-t from-slate-950 via-slate-900/90 to-transparent" />
          </div>

          <div className="relative z-10 max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/30 text-sky-300 text-xs tracking-widest uppercase mb-3">
              NASA Space Apps Challenge • 3D Simulation Edition
            </div>
            <h1 className="text-5xl font-black tracking-[0.18em] text-white drop-shadow-[0_2px_20px_rgba(56,189,248,0.45)]">
              MISSION
              <span className="block text-6xl text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-cyan-200 to-white tracking-[0.22em]">
                VOID
              </span>
            </h1>

            <div className="mt-8 space-y-2.5 w-72">
              <button
                onClick={() => setScreen('dashboard')}
                className="w-full flex items-center gap-3 px-5 py-3 rounded-lg bg-gradient-to-r from-sky-600/80 to-blue-900/80 border border-sky-400 text-white font-semibold shadow-[0_0_25px_rgba(56,189,248,0.4)] hover:brightness-110 transition"
              >
                <Play className="w-4 h-4 fill-current text-sky-200" />
                <span>Continue Mission</span>
              </button>

              <button
                onClick={() => {
                  setSimSpeed(0);
                  game.resetState();
                  runner.resetCampaign();
                  setActiveDecision(null);
                  setCompletedMission(null);
                  setCountdown(null);
                  setActiveModal(null);
                  setShowFieldOps(false);
                  setShowHowTo(true);      // resetCampaign() pauses the runner; "Let's go!" resumes it
                  setSelectedChapter(1);
                  refresh();
                  setScreen('dashboard');
                }}
                className="w-full flex items-center gap-3 px-5 py-2.5 rounded-lg bg-slate-900/75 hover:bg-slate-800/90 border border-slate-700/80 text-slate-200 text-sm transition"
              >
                <RotateCcw className="w-4 h-4 text-sky-400" />
                <span>New Simulation</span>
              </button>

              <button
                onClick={() => setScreen('destination')}
                className="w-full flex items-center gap-3 px-5 py-2.5 rounded-lg bg-slate-900/75 hover:bg-slate-800/90 border border-slate-700/80 text-slate-200 text-sm transition"
              >
                <Compass className="w-4 h-4 text-sky-400" />
                <span>Choose Destination</span>
              </button>

              <button
                onClick={() => {
                  setScreen('dashboard');
                  setActiveModal('build');
                }}
                className="w-full flex items-center gap-3 px-5 py-2.5 rounded-lg bg-slate-900/75 hover:bg-slate-800/90 border border-slate-700/80 text-slate-200 text-sm transition"
              >
                <Wrench className="w-4 h-4 text-sky-400" />
                <span>Customization</span>
              </button>
            </div>
          </div>

          <div className="relative z-10 text-xs tracking-[0.35em] text-slate-400 uppercase">
            SURVIVE • EXPLORE • BUILD
          </div>
        </div>
      )}

      {/* ====================================================================
          SCREEN 2: CHOOSE YOUR DESTINATION
         ==================================================================== */}
      {screen === 'destination' && (
        <div className="relative flex-1 flex flex-col justify-between p-10 bg-[radial-gradient(ellipse_at_top,#0f172a,#020617)]">
          <div className="text-center mt-2">
            <h2 className="text-3xl font-bold tracking-[0.2em] uppercase text-white">
              CHOOSE YOUR DESTINATION
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select a planetary campaign theater and chapter mission briefing
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full my-auto">
            <div className="relative rounded-2xl bg-slate-900/80 border-2 border-sky-400 shadow-[0_0_40px_rgba(56,189,248,0.28)] p-6 flex flex-col items-center text-center">
              <div className="w-36 h-36 rounded-full bg-gradient-to-br from-slate-200 via-slate-400 to-slate-800 shadow-[inset_-16px_-16px_30px_rgba(0,0,0,0.85),0_0_30px_rgba(148,163,184,0.3)] mb-4" />
              <h3 className="text-2xl font-bold tracking-wider text-white">MOON BASE</h3>
              <p className="text-xs text-sky-300 mt-0.5 mb-4">Survive. Build. Thrive.</p>

              <div className="w-full mb-4 text-left">
                <label className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
                  Select Campaign Chapter (1–6):
                </label>
                <select
                  value={selectedChapter}
                  onChange={(e) => {
                    const ch = Number(e.target.value);
                    setSelectedChapter(ch);
                    game.state.chapter = ch;
                    refresh();
                  }}
                  className="w-full bg-slate-950/90 border border-amber-500/60 text-amber-300 text-xs font-semibold rounded-lg px-3 py-2.5 focus:outline-none"
                >
                  {CHAPTERS.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {CHAPTERS.find((c) => c.id === selectedChapter)?.subtitle}
                </p>
              </div>

              <button
                onClick={() => setScreen('dashboard')}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold text-sm shadow-lg hover:brightness-110 transition flex items-center justify-center gap-2"
              >
                <span>Deploy to 3D Lunar Outpost</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="relative rounded-2xl bg-slate-900/50 border border-slate-700/70 p-6 flex flex-col items-center text-center opacity-80">
              <div className="relative w-36 h-36 rounded-full bg-gradient-to-br from-orange-400 via-red-700 to-amber-950 shadow-[inset_-16px_-16px_30px_rgba(0,0,0,0.85),0_0_25px_rgba(234,88,12,0.25)] mb-4 flex items-center justify-center">
                <div className="w-12 h-12 rounded-xl bg-slate-950/80 border border-amber-500/40 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-amber-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold tracking-wider text-slate-200">MARS BASE</h3>
              <p className="text-xs text-amber-400/90 mt-0.5 mb-4">Coming Soon... (Unlocks after Chapter 6)</p>
              <p className="text-xs text-slate-400 mb-6">
                Complete the Chapter 6 Long-Duration Lunar Survival Simulation & Readiness Report to unlock Deep-Space Mars Operations.
              </p>
              <button
                onClick={() => announceToast('Complete Chapter 6: Mission Beyond the Moon to unlock Mars Base preview!')}
                className="mt-auto w-full py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-xs font-semibold"
              >
                Locked — Requires Chapter 6 Badge
              </button>
            </div>
          </div>

          <div>
            <button
              onClick={() => setScreen('menu')}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-sm hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          SCREEN 3: MAIN GAMEPLAY DASHBOARD WITH REAL-TIME 3D VIEWPORT
         ==================================================================== */}
      {screen === 'dashboard' && (
        <div className="relative flex-1 flex flex-col justify-between overflow-hidden">

          {/* ---- TOP RESOURCE HUD BAR ---- */}
          <header className="relative z-20 h-14 bg-slate-950/85 backdrop-blur-md border-b border-sky-500/25 px-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full bg-gradient-to-b from-sky-400 to-blue-900 p-0.5 shadow-[0_0_12px_rgba(56,189,248,0.5)]">
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-sm font-bold text-sky-200">
                  👨‍🚀
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Lv. {s.chapter}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                    isDay
                      ? 'bg-sky-500/20 text-sky-300 border-sky-400/30'
                      : 'bg-indigo-950/90 text-indigo-300 border-indigo-400/50'
                  }`}>
                    {isDay ? <Sun className="w-3 h-3 text-amber-300" /> : <Moon className="w-3 h-3 text-indigo-300" />}
                    Day {game.getDayNumber()} • {game.getHourFormatted()}
                  </span>
                </div>
                <div className="w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-sky-400 transition-all"
                    style={{ width: `${Math.min(100, (s.done.length / MISSIONS.length) * 100 + 15)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Center Survival Meters (Including Crew Health) */}
            <div className="flex items-center gap-3 lg:gap-5">
              {[
                { key: 'power', label: 'Power', icon: Zap, color: 'text-amber-400', bar: 'bg-amber-400', rate: rates.power },
                { key: 'oxygen', label: 'Oxygen', icon: Wind, color: 'text-sky-400', bar: 'bg-sky-400', rate: rates.oxygen },
                { key: 'water', label: 'Water', icon: Droplets, color: 'text-blue-400', bar: 'bg-blue-400', rate: rates.water },
                { key: 'food', label: 'Food', icon: Apple, color: 'text-emerald-400', bar: 'bg-emerald-400', rate: rates.food },
                { key: 'health', label: 'Health', icon: Heart, color: 'text-rose-400', bar: 'bg-rose-500', rate: null },
              ].map((item) => {
                const Icon = item.icon;
                const val = Math.round(s.res[item.key]);
                const max = s.max[item.key];
                const pct = clamp((val / max) * 100, 0, 100);
                const low = pct <= 30;
                return (
                  <div key={item.key} className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg bg-slate-900 border ${low ? 'border-red-500 animate-pulse' : 'border-slate-800'}`}>
                      <Icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-bold text-white">{val}/{max}</span>
                        {item.rate !== null && (
                          <span className={`text-[10px] font-mono ${item.rate >= 0 ? 'text-emerald-400' : 'text-amber-300'}`}>
                            {item.rate >= 0 ? `+${item.rate}` : item.rate}/h
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">{item.label}</div>
                      <div className="w-16 lg:w-20 h-1 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                        <div className={`h-full transition-all ${low ? 'bg-red-500' : item.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Currencies & Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 border border-amber-500/40 text-xs font-bold text-amber-300">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>{s.wallet.coins.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 border border-purple-500/40 text-xs font-bold text-purple-300">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>{s.wallet.points}</span>
              </div>
              <div className="hidden xl:flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs font-bold text-slate-300">
                <Box className="w-3.5 h-3.5 text-slate-400" />
                <span>{s.wallet.materials}</span>
              </div>

              <button
                onClick={() => setShowNasa(true)}
                className="px-2 py-1.5 rounded-lg bg-sky-950/70 border border-sky-500/50 text-sky-200 hover:bg-sky-900 text-[11px] font-bold flex items-center gap-1"
                title="Live data from NASA"
              >
                <span aria-hidden="true">🛰</span>
                <span className="hidden sm:inline">NASA Data</span>
              </button>
              <button
                onClick={() => {
                  const confirmed = window.confirm('Restart from Chapter 1? This will reset all missions, resources, buildings and campaign progress.');
                  if (!confirmed) return;
                  setSimSpeed(0);
                  game.resetState();
                  runner.resetCampaign();
                  setActiveDecision(null);
                  setCompletedMission(null);
                  setCountdown(null);
                  setActiveModal(null);
                  setShowFieldOps(false);
                  setShowHowTo(true);
                  setSelectedChapter(1);
                  setToast('New expedition started. Welcome back, Explorer!');
                  refresh();
                }}
                className="px-2 py-1.5 rounded-lg bg-rose-950/70 border border-rose-500/50 text-rose-200 hover:bg-rose-900 text-[11px] font-bold flex items-center gap-1"
                title="Restart the entire game from Chapter 1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Restart</span>
              </button>
              <button
                onClick={() => setScreen('menu')}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
                title="Main Menu"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* ---- CENTER REAL-TIME 3D WEBGL LUNAR SCENE ---- */}
          <div className="relative flex-1 overflow-hidden">
            <LunarOutpost3D
              state={s}
              game={game}
              isDay={isDay}
              roverMoving={roverMoving}
              stormActive={activeDecision?.id === 'solar_storm'}
              onOpenMissions={() => setShowFieldOps(true)}
              controlsEnabled={!showHowTo && !showFieldOps && !showNasa && !activeModal && !activeDecision}
              onSelectObject={handle3DObjectClick}
            />

            {/* ---- LEFT HUD STACK ---- */}
            <div className="absolute left-4 top-4 bottom-12 z-10 w-64 flex flex-col justify-between pointer-events-none">
              <div className="space-y-2.5 pointer-events-auto">
                <div
                  onClick={() => {
                    if (currentMission.id === 'm1' && s.panelCondition < 1) {
                      game.triggerEventById('solar_damage');
                    } else if (currentMission.id === 'm2') {
                      setActiveModal('sidequest');
                    } else if (currentMission.id === 'm3') {
                      setActiveModal('build');
                    }
                  }}
                  className="cursor-pointer rounded-xl bg-slate-950/85 backdrop-blur-md border border-amber-500/40 p-3 shadow-lg hover:border-amber-400 transition"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-amber-400 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5" />
                      Current Mission
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs font-semibold text-white">{currentMission.title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    ({currentMission.progressText(game)}) — Click to open
                  </div>
                </div>

                <div
                  onClick={() => setActiveModal('sidequest')}
                  className="cursor-pointer rounded-xl bg-slate-950/85 backdrop-blur-md border border-sky-500/40 p-3 shadow-lg hover:border-sky-400 transition"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-sky-400 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Optional Side Quest
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs font-semibold text-white">{missionSnapshot.sideQuest?.title || 'Campaign complete'}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {missionSnapshot.sideQuest
                      ? `Chapter ${missionSnapshot.chapter} · Mission ${missionSnapshot.missionIndex + 1} • +${missionSnapshot.sideQuest.reward.coins} coins`
                      : 'All side quests completed'}
                  </div>
                </div>

                {(s.res.power <= 80 || s.res.oxygen <= 35 || s.res.water <= 35 || s.res.food <= 35 || s.panelCondition < 1 || s.leak > 0) && (
                  <div
                    onClick={() => {
                      if (s.panelCondition < 1) game.triggerEventById('solar_damage');
                      else if (s.leak > 0) game.triggerEventById('oxygen_leak');
                      else if (s.res.oxygen <= 35 || s.res.water <= 35 || s.res.food <= 35) { setSimSpeed(0); announceToast('Crew supply warning. Simulation paused so you can choose your next action.'); }
                      else {
                        setBuildTab('Upgrade');
                        setActiveModal('build');
                      }
                    }}
                    className="cursor-pointer rounded-xl bg-red-950/85 backdrop-blur-md border border-red-500/70 p-3 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Alert!</span>
                    </div>
                    <div className="text-xs text-red-100 mt-0.5">
                      {s.panelCondition < 1
                        ? 'Solar panel damaged! Click to repair.'
                        : s.leak > 0
                        ? 'Cabin Oxygen leak active!'
                        : s.res.oxygen <= 35
                        ? 'Oxygen reserve low — protect the crew.'
                        : s.res.water <= 35
                        ? 'Water reserve low — build or conserve.'
                        : s.res.food <= 35
                        ? 'Food reserve low — consider a greenhouse.'
                        : 'Power reserves running low!'}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom-Left Circular Compass Radar */}
              <div className="pointer-events-auto flex items-end gap-3">
                <div
                  onClick={() => setActiveModal('sidequest')}
                  className="cursor-pointer relative w-28 h-28 rounded-full bg-slate-950/90 border-2 border-sky-500/40 shadow-[0_0_25px_rgba(56,189,248,0.25)] flex items-center justify-center group"
                  title="Click to launch Rover Expedition"
                >
                  <div className="absolute inset-2 rounded-full border border-sky-500/20" />
                  <div className="absolute inset-6 rounded-full border border-sky-500/15" />
                  <div className="absolute inset-x-2 h-[1px] bg-sky-500/20" />
                  <div className="absolute inset-y-2 w-[1px] bg-sky-500/20" />
                  <span className="absolute top-1 text-[9px] font-bold text-sky-400">N</span>
                  <span className="absolute bottom-1 text-[9px] font-bold text-slate-500">S</span>
                  <span className="absolute left-1.5 text-[9px] font-bold text-slate-500">W</span>
                  <span className="absolute right-1.5 text-[9px] font-bold text-slate-500">E</span>
                  <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
                  <span className="absolute top-6 right-7 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span className="absolute bottom-7 left-6 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
              </div>
            </div>

            {/* ---- RIGHT ACTION BUTTON STACK ---- */}
            <div className="absolute right-4 bottom-12 z-10 flex flex-col gap-2 w-40">
              <button
                onClick={() => setShowFieldOps(true)}
                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-sky-600/90 hover:bg-sky-500 border border-sky-300/50 text-xs font-bold text-white shadow-lg transition"
              >
                <Play className="w-4 h-4" />
                <span>My Missions</span>
              </button>
              <button
                onClick={() => {
                  setBuildTab('Build');
                  setActiveModal('build');
                }}
                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-sky-500/40 text-xs font-semibold text-white shadow-lg transition"
              >
                <Hammer className="w-4 h-4 text-sky-400" />
                <span>Build</span>
              </button>

              <button
                onClick={() => {
                  setBuildTab('Upgrade');
                  setActiveModal('build');
                }}
                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-sky-500/40 text-xs font-semibold text-white shadow-lg transition"
              >
                <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
                <span>Upgrade</span>
              </button>

              <button
                onClick={() => {
                  setBuildTab('Research');
                  setActiveModal('build');
                }}
                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-sky-500/40 text-xs font-semibold text-white shadow-lg transition"
              >
                <FlaskConical className="w-4 h-4 text-purple-400" />
                <span>Research</span>
              </button>

              <button
                onClick={() => setActiveModal('sidequest')}
                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-sky-500/40 text-xs font-semibold text-white shadow-lg transition"
              >
                <Compass className="w-4 h-4 text-amber-400" />
                <span>Explore</span>
              </button>

              <div className="flex gap-1.5 mt-1">
                <button
                  onClick={handleStepHour}
                  className="px-2.5 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-amber-500/40 text-xs font-bold text-amber-300"
                  title="Advance +1 Lunar Hour"
                >
                  +1h
                </button>
                <button
                  onClick={handleNextDay}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 text-slate-950 font-extrabold text-xs shadow-[0_0_25px_rgba(245,158,11,0.45)] transition"
                >
                  {isDay ? <Sun className="w-4 h-4 fill-current" /> : <Moon className="w-4 h-4 fill-current" />}
                  <span>Next Day</span>
                </button>
              </div>
            </div>
          </div>

          {/* ---- BOTTOM DEMO & TELEMETRY BAR ---- */}
          <footer className="relative z-20 h-9 bg-slate-950 border-t border-slate-800 px-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300 truncate">
              <Radio className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="truncate">{toast}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 mr-1 hidden sm:inline">
                Quick Demo Screens:
              </span>
              <button
                onClick={() => setScreen('menu')}
                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-300"
              >
                1. Main Menu
              </button>
              <button
                onClick={() => setScreen('destination')}
                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-300"
              >
                2. Destination
              </button>
              <button
                onClick={() => {
                  setBuildTab('Build');
                  setSelectedUpgradeId('greenhouse');
                  setActiveModal('build');
                }}
                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-sky-300"
              >
                3. Build Greenhouse
              </button>
              <button
                onClick={() => setActiveModal('sidequest')}
                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-emerald-300"
              >
                4. Side Quest
              </button>
              <button
                onClick={() => game.triggerEventById('solar_storm')}
                className="px-2 py-0.5 rounded bg-red-950/90 hover:bg-red-900 border border-red-500/50 text-[11px] text-red-300 font-semibold"
              >
                5. Solar Storm Alert
              </button>
              <button
                onClick={() => {
                  setCompletedMission(MISSIONS[2]);
                  setActiveModal('missionComplete');
                }}
                className="px-2 py-0.5 rounded bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-[11px] text-amber-300"
              >
                6. Mission Complete
              </button>
            </div>
          </footer>
        </div>
      )}

      {/* ====================================================================
          MODAL 1: BUILD / UPGRADE / RESEARCH / DECORATION
         ==================================================================== */}
      {activeModal === 'build' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-[#091326] border-2 border-sky-400/60 shadow-[0_0_60px_rgba(56,189,248,0.25)] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-3.5 bg-slate-950/90 border-b border-slate-800">
              <div className="flex items-center gap-2">
                {[
                  { id: 'Build', icon: Hammer },
                  { id: 'Upgrade', icon: ArrowUpCircle },
                  { id: 'Research', icon: FlaskConical },
                  { id: 'Decoration', icon: Sparkles },
                ].map((t) => {
                  const Icon = t.icon;
                  const active = buildTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setBuildTab(t.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                        active
                          ? 'bg-sky-500/20 border border-sky-400 text-white shadow-[0_0_15px_rgba(56,189,248,0.3)]'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 text-sky-400" />
                      <span>{t.id}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mx-5 mt-4 rounded-xl border border-cyan-500/20 bg-cyan-950/20 px-4 py-3 text-[11px] leading-relaxed text-slate-300">
              <b className="text-cyan-200">Resource guide:</b> Coins = construction currency · Materials = physical parts gathered by rover expeditions · Science Points (SP) = research knowledge earned from missions. Power runs equipment; Oxygen, Water and Food keep the crew alive. Build costs are deducted only when you confirm construction.
            </div>
            {buildTab === 'Build' && (
              <div className="grid grid-cols-12 min-h-[380px]">
                <div className="col-span-4 border-r border-slate-800 p-4 space-y-1.5 bg-slate-950/40">
                  {[
                    { id: 'Habitation', upgrade: 'greenhouse', icon: '🏠' },
                    { id: 'Energy', upgrade: 'solarPanels', icon: '⚡' },
                    { id: 'Life Support', upgrade: 'waterRecycler', icon: '🫧' },
                    { id: 'Food', upgrade: 'greenhouse', icon: '🌱' },
                    { id: 'Exploration', upgrade: 'roverGarage', icon: '🚙' },
                    { id: 'Research', upgrade: 'scienceLab', icon: '🔬' },
                    { id: 'Safety', upgrade: 'radiationShield', icon: '🛡️' },
                    { id: 'Infrastructure', upgrade: 'battery', icon: '🔋' },
                  ].map((cat) => {
                    const active = buildCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setBuildCategory(cat.id);
                          setSelectedUpgradeId(cat.upgrade);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
                          active
                            ? 'bg-sky-500/20 border border-sky-400 text-white'
                            : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.id}</span>
                      </button>
                    );
                  })}
                </div>

                {(() => {
                  const u = UPGRADES[selectedUpgradeId] || UPGRADES.greenhouse;
                  const owned = !u.repeat && s.upgrades.includes(u.id);
                  const affordable = game.canAfford(u.cost);
                  return (
                    <div className="col-span-8 p-6 flex items-center justify-between gap-6">
                      <div className="w-56 h-56 rounded-2xl bg-gradient-to-b from-sky-950/60 to-slate-950 border border-sky-500/30 flex flex-col items-center justify-center p-4 relative">
                        <div className="text-6xl mb-2">
                          {u.id === 'greenhouse' ? '🌿' : u.id === 'waterRecycler' ? '💧' : u.id === 'solarPanels' ? '☀️' : u.id === 'battery' ? '🔋' : u.id === 'radiationShield' ? '🛡️' : u.id === 'scienceLab' ? '🔬' : '🚀'}
                        </div>
                        <span className="text-xs font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-0.5 rounded-full text-center">
                          {u.effectText}
                        </span>
                      </div>

                      <div className="flex-1 flex flex-col justify-between h-56">
                        <div>
                          <h3 className="text-2xl font-bold text-white">{u.label}</h3>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">{u.desc}</p>
                        </div>

                        <div className="space-y-2 my-3">
                          {Object.entries(u.cost).map(([k, v]) => (
                            <div
                              key={k}
                              className={`flex items-center gap-2 text-sm font-bold ${
                                game.canAfford({ [k]: v }) ? 'text-amber-300' : 'text-red-400'
                              }`}
                            >
                              {k === 'materials' ? <Box className="w-4 h-4" /> : k === 'points' ? <Sparkles className="w-4 h-4" /> : k === 'power' ? <Zap className="w-4 h-4" /> : <Coins className="w-4 h-4" />}
                              <span>
                                {v} {k === 'materials' ? 'Materials' : k === 'points' ? 'Science Points' : k === 'power' ? 'Power' : 'Coins'}
                              </span>
                            </div>
                          ))}
                        </div>

                        <button
                          disabled={owned || !affordable}
                          onClick={() => handleBuildAction(u.id)}
                          className={`w-full py-3 rounded-xl font-bold text-sm transition ${
                            owned
                              ? 'bg-emerald-900/50 border border-emerald-500/50 text-emerald-300 cursor-default'
                              : affordable
                              ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:brightness-110 text-white shadow-[0_0_25px_rgba(56,189,248,0.4)]'
                              : 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {owned ? '✓ Module Constructed' : affordable ? 'Build this module' : `Need more ${Object.entries(u.cost).filter(([k,v]) => (k === 'power' ? s.res.power : s.wallet[k] || 0) < v).map(([k]) => k === 'points' ? 'Science Points' : k).join(', ')}`}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {buildTab === 'Upgrade' && (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">Power Network & Priority Load Shedding</h3>
                    <p className="text-xs text-slate-400">
                      Toggle non-essential modules off during low battery or Lunar Night to protect Life Support.
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-emerald-400 font-bold">Gen: +{s.power.gen}/h</span>
                    <span className="mx-2 text-slate-600">|</span>
                    <span className="text-amber-400 font-bold">Load: -{s.power.used}/h</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(SYSTEM_DEFS).map(([id, def]) => {
                    const sys = s.systems[id];
                    return (
                      <div
                        key={id}
                        className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{def.label}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-sky-300">
                              Priority {def.priority}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Draw: {def.power} Power/hr • Status:{' '}
                            {!sys.built ? (
                              <span className="text-slate-500">Not Built</span>
                            ) : sys.powered ? (
                              <span className="text-emerald-400 font-semibold">Online</span>
                            ) : (
                              <span className="text-red-400 font-semibold">Unpowered</span>
                            )}
                          </div>
                        </div>

                        {sys.built && (
                          <button
                            onClick={() => game.setEnabled(id, !sys.enabled)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                              sys.enabled
                                ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300'
                                : 'bg-slate-800 border border-slate-700 text-slate-400'
                            }`}
                          >
                            {sys.enabled ? 'ENABLED' : 'SHED (OFF)'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(buildTab === 'Research' || buildTab === 'Decoration') && (
              <div className="p-6 space-y-4">
                <h3 className="text-lg font-bold text-white">
                  {buildTab === 'Research' ? 'Lunar Science Log & Earned Badges' : 'Outpost Customization & Visual Upgrades'}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {s.badges.map((b) => (
                    <div key={b} className="p-3 rounded-xl bg-slate-900 border border-amber-500/40 flex items-center gap-2.5">
                      <Award className="w-6 h-6 text-amber-400 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-white">{b}</div>
                        <div className="text-[10px] text-amber-300">Unlocked</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 2: SIDE QUEST POPUP
         ==================================================================== */}
      {activeModal === 'sidequest' && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-[#0a1324] border-2 border-sky-400/60 shadow-[0_0_50px_rgba(56,189,248,0.3)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center gap-2 text-sm font-bold text-sky-300">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span>Chapter {missionSnapshot.chapter} · Mission {missionSnapshot.missionIndex + 1} Side Quest</span>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {missionSnapshot.sideQuest ? (
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl bg-gradient-to-b from-slate-800 to-slate-950 border border-sky-500/30 flex items-center justify-center text-5xl">
                    {missionSnapshot.sideQuest.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{missionSnapshot.sideQuest.title}</h3>
                    <p className="mt-1 text-xs text-slate-300 leading-relaxed">{missionSnapshot.sideQuest.description}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
                  <div className="text-[11px] uppercase tracking-widest text-sky-300 font-bold mb-2">Quest objectives</div>
                  <ol className="space-y-2">
                    {missionSnapshot.sideQuest.objectives.map((objective, index) => (
                      <li key={objective} className="flex gap-2 text-xs text-slate-200">
                        <span className="text-sky-400 font-bold">{index + 1}.</span><span>{objective}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">Side quest rewards</div>
                    <div className="mt-1 flex gap-4 text-xs font-bold">
                      <span className="text-amber-300">+{missionSnapshot.sideQuest.reward.coins} coins</span>
                      <span className="text-purple-300">+{missionSnapshot.sideQuest.reward.science} science</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      announceToast(`Side quest accepted: ${missionSnapshot.sideQuest.title}. Follow the objectives to complete it!`);
                      setActiveModal(null);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:brightness-110 text-white font-bold text-xs shadow-[0_0_20px_rgba(56,189,248,0.4)]"
                  >
                    Accept Side Quest
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-sm text-slate-300">All campaign missions are complete. No further side quests are available.</div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 3: SOLAR STORM / CRISIS DECISION POPUP
         ==================================================================== */}
      {activeModal === 'crisis' && activeDecision && (
        <div className="fixed inset-0 z-50 bg-red-950/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-gradient-to-b from-[#2a090d] via-[#140a13] to-[#090d16] border-2 border-red-500/80 shadow-[0_0_70px_rgba(239,68,68,0.45)] p-6 text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-red-500/20 border border-red-500/50 text-red-300 text-xs font-bold uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-red-400 animate-bounce" />
              <span>Emergency Decision Required</span>
            </div>

            <h2 className="text-2xl font-extrabold text-white tracking-wide">
              {activeDecision.title}
            </h2>
            <p className="text-sm text-slate-200 max-w-md mx-auto leading-relaxed">
              {activeDecision.warning}
            </p>

            {countdown !== null && (
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-950/90 border border-red-500/50 text-xl font-mono font-bold text-amber-300">
                <Clock className="w-5 h-5 text-red-400 animate-spin" />
                <span>{formatTimer(countdown)}</span>
              </div>
            )}

            <div className="text-left p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300">
              <strong className="text-sky-400 block mb-0.5">
                NASA Science Note — {activeDecision.scienceLesson}:
              </strong>
              {activeDecision.scienceDetail}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              {activeDecision.options.map((opt, idx) => (
                <button
                  key={opt.id}
                  disabled={!game.canAfford(opt.cost)}
                  onClick={() => handleDecisionChoice(opt.id)}
                  className={`py-3 px-4 rounded-xl font-bold text-sm transition flex flex-col items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed ${
                    idx === 0
                      ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:brightness-110 text-white shadow-[0_0_25px_rgba(56,189,248,0.4)]'
                      : 'bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300'
                  }`}
                >
                  <span>{opt.label}</span>
                  {Object.keys(opt.cost).length > 0 && (
                    <span className="text-[10px] font-normal opacity-85 mt-0.5">
                      Cost: {Object.entries(opt.cost).map(([k, v]) => `${v} ${k}`).join(', ')}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* If the crew cannot pay for any option (and there is no countdown), the window would never close. */}
            {!activeDecision.options.some((opt) => game.canAfford(opt.cost)) && (
              <button
                onClick={() => {
                  game.expire(activeDecision.id);
                  setActiveDecision(null);
                  setCountdown(null);
                  setActiveModal((m) => (m === 'crisis' ? null : m));
                  refresh();
                }}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-bold text-sm"
              >
                Not enough resources to respond. Continue
              </button>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 4: MISSION COMPLETE! SCREEN
         ==================================================================== */}
      {activeModal === 'missionComplete' && completedMission && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-gradient-to-b from-[#0c1933] to-[#060b16] border-2 border-amber-400/70 shadow-[0_0_65px_rgba(245,158,11,0.35)] p-6 text-center space-y-5">
            <h2 className="text-3xl font-extrabold text-white tracking-wide">
              Mission Complete!
            </h2>

            <div className="w-24 h-24 rounded-full bg-gradient-to-b from-amber-300 to-amber-600 mx-auto flex items-center justify-center shadow-[0_0_35px_rgba(245,158,11,0.6)] border-4 border-amber-200">
              <Award className="w-12 h-12 text-slate-950" />
            </div>

            <div className="text-sm font-bold text-amber-300">
              {completedMission.title}
            </div>

            <div className="grid grid-cols-2 gap-4 text-left bg-slate-950/80 border border-slate-800 rounded-xl p-4">
              <div>
                <div className="text-xs text-slate-400 mb-2">Rewards Earned:</div>
                <div className="space-y-1.5 text-xs font-bold">
                  <div className="flex items-center gap-2 text-amber-300">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span>+{completedMission.reward.coins || 500}</span>
                  </div>
                  <div className="flex items-center gap-2 text-purple-300">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>+{completedMission.reward.points || 150}</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-300">
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span>+1 {completedMission.reward.badge}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-2">Science Learned:</div>
                <div className="flex items-start gap-2 text-xs text-sky-300 font-semibold">
                  <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>{completedMission.scienceLearned || 'Solar Radiation & Habitat Engineering'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:brightness-110 text-white font-bold text-sm shadow-[0_0_25px_rgba(56,189,248,0.4)]"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {showFieldOps && <MissionStatus onClose={() => setShowFieldOps(false)} />}
      {showNasa && <NasaPanel onClose={() => setShowNasa(false)} />}
      {showHowTo && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md">
          <div className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-3xl border-2 border-sky-300/60 bg-[#07111f] p-6 text-center shadow-[0_0_60px_rgba(56,189,248,.35)]">
            <img src="/orion.gif" alt="ORION" className="mx-auto h-24 w-24 object-contain" />
            <h1 className="mt-2 text-3xl font-black text-white">Hi, Explorer!</h1>
            <p className="mt-1 text-sm text-sky-200">I'm ORION, your robot buddy. You are the astronaut now, so let's walk on the Moon!</p>
            <div className="mt-5 grid gap-3 text-left text-sm text-slate-200 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3"><div className="text-lg">🚶 Walk</div>Use <b>W A S D</b> or the <b>arrow keys</b>, or drag the round <b>joystick</b>. Hold <b>Shift</b> to run!</div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3"><div className="text-lg">🟡 Follow the arrow</div>The <b>yellow arrow</b> above you points to the <b>glowing ring</b>.</div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3"><div className="text-lg">✅ Do the job</div>Stand inside the ring until it turns <b style={{ color: '#5dff9a' }}>green</b> and the job is finished.</div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3"><div className="text-lg">🚙 Drive the rover</div>Stand next to the rover and press <b>E</b> (or tap the button) to hop in. Press <b>E</b> again to hop out.</div>
            </div>
            <p className="mt-3 text-xs text-slate-400">Drag the screen to look around · scroll or pinch to zoom · tap 🎙 to change my voice.</p>
            <button
              onClick={() => {
                setShowHowTo(false);
                runner.setRunning(true);
                speakOrion("Hi Explorer! I'm ORION, your robot buddy. Walk with the arrow keys or the joystick, and follow the yellow arrow to the glowing ring. Let's go!");
              }}
              className="mt-5 w-full rounded-2xl bg-amber-400 px-6 py-4 text-lg font-black text-slate-900 shadow-lg hover:bg-amber-300 active:scale-[.98]"
            >
              🚀 Let's go!
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 5: GAME OVER & SIMULATION DIAGNOSTIC RECOVERY
         ==================================================================== */}
      {activeModal === 'gameover' && (
        <div className="fixed inset-0 z-50 bg-red-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-950 border-2 border-red-500 p-6 text-center space-y-4 shadow-[0_0_60px_rgba(239,68,68,0.5)]">
            <ShieldAlert className="w-14 h-14 text-red-500 mx-auto animate-pulse" />
            <h2 className="text-2xl font-extrabold text-white">MISSION FAILED</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Outpost Alpha life-support reserves were exhausted on{' '}
              <strong className="text-red-400">Day {game.getDayNumber()} (Tick #{s.tick})</strong>.
              Build the Water Recycler and Greenhouse early, and shed non-essential loads before the 48-hour Lunar Night!
            </p>
            <button
              onClick={() => {
                setSimSpeed(0);
                game.resetState();
                runner.resetCampaign();
                setActiveDecision(null);
                setCompletedMission(null);
                setCountdown(null);
                setShowFieldOps(false);
                setShowHowTo(true);        // resetCampaign() pauses the runner; "Let's go!" resumes it
                setSelectedChapter(1);
                setActiveModal(null);
                refresh();
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:brightness-110 text-white font-bold text-sm"
            >
              Restart Lunar Simulation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}