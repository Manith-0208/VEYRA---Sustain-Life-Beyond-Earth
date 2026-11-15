/* NASA OPEN DATA (read-only, display only)
   Live data from NASA's public APIs, shown in the "NASA Data" panel. Nothing here feeds the simulation:
   resources, missions, events and rewards are unchanged.

   Sources
   - Astronomy Picture of the Day (APOD)   https://api.nasa.gov/planetary/apod
   - DONKI space weather: solar flares     https://api.nasa.gov/DONKI/FLR
   - DONKI space weather: coronal mass ejections  https://api.nasa.gov/DONKI/CME
   - NASA Image and Video Library          https://images-api.nasa.gov/search   (no key needed)

   api.nasa.gov works with the shared DEMO_KEY (about 30 requests per hour per IP). For more, get a free key at
   https://api.nasa.gov and put it in a `.env` file as VITE_NASA_API_KEY=your_key (see .env.example).
   Answers are cached in sessionStorage for 30 minutes so reopening the panel does not use up requests. */

const API_KEY = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_NASA_API_KEY) || 'DEMO_KEY';
const TTL_MS = 30 * 60 * 1000;
const ymd = (d) => d.toISOString().slice(0, 10);

async function getJSON(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(res.status === 429 ? 'NASA rate limit reached (try again later or add your own API key)' : `NASA service answered HTTP ${res.status}`);
  return res.json();
}

async function cached(name, loader) {
  const key = `missionvoid-nasa-${name}`;
  try {
    const hit = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (hit && Date.now() - hit.t < TTL_MS) return hit.data;
  } catch (e) { }
  const data = await loader();
  try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), data })); } catch (e) { }
  return data;
}

export function fetchApod(signal) {
  return cached('apod', async () => {
    const d = await getJSON(`https://api.nasa.gov/planetary/apod?api_key=${API_KEY}`, signal);
    return { title: d.title, date: d.date, mediaType: d.media_type, url: d.url, hdurl: d.hdurl, explanation: d.explanation, copyright: d.copyright ? String(d.copyright).trim() : '' };
  });
}

const lastDays = (n) => { const end = new Date(), start = new Date(Date.now() - n * 86400000); return `startDate=${ymd(start)}&endDate=${ymd(end)}`; };

export function fetchSolarFlares(signal) {
  return cached('flr', async () => {
    const list = await getJSON(`https://api.nasa.gov/DONKI/FLR?${lastDays(30)}&api_key=${API_KEY}`, signal);
    const rows = (Array.isArray(list) ? list : []).map((f) => ({ id: f.flrID, cls: f.classType || '?', peak: f.peakTime || f.beginTime, region: f.sourceLocation || '' }));
    rows.sort((a, b) => String(b.peak).localeCompare(String(a.peak)));
    return rows;
  });
}

export function fetchCMEs(signal) {
  return cached('cme', async () => {
    const list = await getJSON(`https://api.nasa.gov/DONKI/CME?${lastDays(30)}&api_key=${API_KEY}`, signal);
    const rows = (Array.isArray(list) ? list : []).map((c) => {
      const a = Array.isArray(c.cmeAnalyses) ? (c.cmeAnalyses.find((x) => x.isMostAccurate) || c.cmeAnalyses[0]) : null;
      return { id: c.activityID, start: c.startTime, region: c.sourceLocation || '', speed: a && Number.isFinite(a.speed) ? Math.round(a.speed) : null, note: (c.note || '').trim() };
    });
    rows.sort((a, b) => String(b.start).localeCompare(String(a.start)));
    return rows;
  });
}

export function fetchMoonImages(signal) {
  return cached('moon-images', async () => {
    const d = await getJSON('https://images-api.nasa.gov/search?q=moon%20surface&media_type=image', signal);
    const items = (d && d.collection && d.collection.items) || [];
    return items
      .filter((i) => i.data && i.data[0] && i.links && i.links[0] && i.links[0].href)
      .slice(0, 6)
      .map((i) => ({ id: i.data[0].nasa_id, title: i.data[0].title, date: (i.data[0].date_created || '').slice(0, 10), thumb: i.links[0].href, page: `https://images.nasa.gov/details/${encodeURIComponent(i.data[0].nasa_id)}` }));
  });
}
