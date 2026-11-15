import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { fetchApod, fetchSolarFlares, fetchCMEs, fetchMoonImages } from './nasaData.js';

/* Read-only window with live NASA data. It does not touch the simulation or the missions. */
function useNasa(loader) {
  const [st, setSt] = useState({ loading: true, data: null, error: '' });
  useEffect(() => {
    const ctl = new AbortController();
    loader(ctl.signal)
      .then((data) => setSt({ loading: false, data, error: '' }))
      .catch((e) => { if (e.name !== 'AbortError') setSt({ loading: false, data: null, error: e.message || 'Could not reach NASA' }); });
    return () => ctl.abort();
  }, [loader]);
  return st;
}

const Box = ({ title, source, st, children }) => (
  <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
    <div className="flex items-baseline justify-between gap-2">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      <span className="text-[10px] text-slate-500">{source}</span>
    </div>
    <div className="mt-2 text-xs text-slate-300">
      {st.loading ? <p className="text-slate-500">Contacting NASA…</p>
        : st.error ? <p className="text-amber-300">NASA data is not available right now: {st.error}. The game works the same without it.</p>
        : children(st.data)}
    </div>
  </section>
);

const fmt = (t) => (t ? String(t).replace('T', ' ').replace('Z', ' UTC') : '');

export default function NasaPanel({ onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const apod = useNasa(fetchApod);
  const flares = useNasa(fetchSolarFlares);
  const cmes = useNasa(fetchCMEs);
  const images = useNasa(fetchMoonImages);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/90 p-3 backdrop-blur-md sm:p-6">
      <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-sky-400/50 bg-[#07111f] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/95 px-5 py-4">
          <div>
            <div className="text-[10px] tracking-[.25em] text-sky-300">MISSION VOID / NASA OPEN DATA</div>
            <h2 className="text-xl font-black text-white">Real data from NASA</h2>
            <p className="text-[11px] text-slate-400">Live from NASA's public APIs. It is for learning only and never changes your base or missions.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-300 hover:bg-slate-800" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-2">
          <Box title="Space weather: solar flares (last 30 days)" source="NASA DONKI · api.nasa.gov" st={flares}>
            {(rows) => rows.length === 0 ? <p>No solar flares were reported in the last 30 days.</p> : (
              <>
                <p className="mb-2 text-slate-400">{rows.length} flares reported. Class X is the strongest, then M, C, B and A. This is the kind of event behind the Solar Storm alert in the game.</p>
                <ul className="space-y-1">
                  {rows.slice(0, 6).map((f) => (
                    <li key={f.id} className="flex justify-between rounded-md bg-slate-950/70 px-2 py-1"><b className="text-amber-300">Class {f.cls}</b><span className="text-slate-400">{fmt(f.peak)}{f.region ? ` · ${f.region}` : ''}</span></li>
                  ))}
                </ul>
              </>
            )}
          </Box>

          <Box title="Space weather: coronal mass ejections (last 30 days)" source="NASA DONKI · api.nasa.gov" st={cmes}>
            {(rows) => rows.length === 0 ? <p>No coronal mass ejections were reported in the last 30 days.</p> : (
              <>
                <p className="mb-2 text-slate-400">{rows.length} clouds of solar particles were recorded. With no air or magnetic field to protect it, the Moon is hit directly.</p>
                <ul className="space-y-1">
                  {rows.slice(0, 5).map((c) => (
                    <li key={c.id} className="rounded-md bg-slate-950/70 px-2 py-1"><span className="text-sky-300">{fmt(c.start)}</span><span className="text-slate-400">{c.region ? ` · ${c.region}` : ''}{c.speed ? ` · ${c.speed} km/s` : ''}</span></li>
                  ))}
                </ul>
              </>
            )}
          </Box>

          <div className="md:col-span-2">
            <Box title="Astronomy Picture of the Day" source="NASA APOD · api.nasa.gov" st={apod}>
              {(a) => (
                <div className="flex flex-col gap-3 sm:flex-row">
                  {a.mediaType === 'image'
                    ? <a href={a.hdurl || a.url} target="_blank" rel="noreferrer" className="shrink-0"><img src={a.url} alt={a.title} className="h-40 w-full rounded-lg object-cover sm:w-56" /></a>
                    : <a href={a.url} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg border border-sky-400/40 px-3 py-2 text-sky-200">Today's picture is a video. Open it on NASA's site.</a>}
                  <div>
                    <div className="font-bold text-white">{a.title} <span className="font-normal text-slate-500">· {a.date}</span></div>
                    <p className="mt-1 line-clamp-5 text-slate-400">{a.explanation}</p>
                    {a.copyright && <p className="mt-1 text-[10px] text-slate-500">Image credit: {a.copyright}</p>}
                  </div>
                </div>
              )}
            </Box>
          </div>

          <div className="md:col-span-2">
            <Box title="Moon pictures from NASA's archive" source="NASA Image and Video Library · images.nasa.gov" st={images}>
              {(rows) => rows.length === 0 ? <p>No pictures were found.</p> : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {rows.map((i) => (
                    <a key={i.id} href={i.page} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-lg border border-slate-800 bg-slate-950/70 hover:border-sky-400/60">
                      <img src={i.thumb} alt={i.title} loading="lazy" className="h-28 w-full object-cover" />
                      <div className="truncate px-2 py-1 text-[10px] text-slate-300 group-hover:text-white">{i.title}</div>
                    </a>
                  ))}
                </div>
              )}
            </Box>
          </div>
        </div>
        <p className="px-5 pb-4 text-[10px] text-slate-500">Data: NASA Open APIs (api.nasa.gov) and the NASA Image and Video Library. NASA does not endorse this project.</p>
      </div>
    </div>
  );
}
