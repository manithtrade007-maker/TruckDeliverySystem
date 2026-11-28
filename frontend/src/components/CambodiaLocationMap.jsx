import { useMemo, useState } from "react";
import { cambodiaLocationCoordinates } from "../lib/cambodia-locations.js";

const bounds = { west: 102.25, east: 107.65, south: 10.35, north: 14.7 };
const project = ({ longitude, latitude }) => ({
  x: 100 + ((longitude - bounds.west) / (bounds.east - bounds.west)) * 640,
  y: 32 + ((bounds.north - latitude) / (bounds.north - bounds.south)) * 500,
});

// Stylized Cambodia outline and major waterways for an offline report map.
const countryPath = "M173 59 L229 43 292 54 337 39 395 50 431 76 480 72 506 100 545 108 570 139 608 143 618 175 642 196 633 224 658 254 644 283 667 314 646 344 660 376 632 399 636 426 607 450 602 482 573 492 555 520 522 507 501 482 474 479 451 451 415 448 393 424 367 419 353 393 328 388 319 362 288 354 279 327 251 322 247 296 224 284 232 259 207 241 213 216 190 199 201 173 182 150 191 124 174 102 Z";
const lakePath = "M263 318 C282 305 307 307 320 322 C329 339 323 359 309 369 C292 374 277 360 270 344 Z";
const riverPath = "M360 128 C343 165 367 194 352 224 C334 255 364 278 350 307 C337 331 355 356 345 381 C337 402 360 424 353 449";

export function CambodiaLocationMap({ locations, onSelect }) {
  const [selectedKey, setSelectedKey] = useState(null);
  const plotted = useMemo(() => locations.map(location => {
    const coordinate = cambodiaLocationCoordinates.get(location.key);
    return coordinate ? { ...location, ...project(coordinate) } : null;
  }).filter(Boolean), [locations]);
  const missing = locations.length - plotted.length;
  const maxTrips = Math.max(1, ...plotted.map(location => location.trips));
  const active = plotted.find(location => location.key === selectedKey);

  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Delivery locations map">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
      <div><h2 className="font-bold text-slate-900">Delivery locations</h2><p className="text-xs text-slate-500">Cambodia · marker size shows trip volume</p></div>
      <div className="flex items-center gap-2 text-xs text-slate-500"><span className="h-3 w-3 rounded-full bg-teal-700" /> {plotted.length} mapped{missing ? ` · ${missing} need coordinates` : ""}</div>
    </div>
    <div className="relative bg-gradient-to-br from-sky-50 via-cyan-50 to-slate-100 p-2 sm:p-5">
      <svg viewBox="0 0 720 560" role="img" aria-label={`Map of Cambodia showing ${plotted.length} delivery locations`} className="mx-auto block w-full max-w-4xl">
        <defs><linearGradient id="cambodia-land" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fffef9"/><stop offset="1" stopColor="#e9eee5"/></linearGradient><filter id="map-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#0f3f43" floodOpacity=".13"/></filter></defs>
        <path d={countryPath} fill="url(#cambodia-land)" stroke="#75978c" strokeWidth="2.5" filter="url(#map-shadow)" />
        <path d={lakePath} fill="#a9d8e9" stroke="#80b9cd" strokeWidth="1.5" />
        <path d={riverPath} fill="none" stroke="#91c9dc" strokeWidth="5" strokeLinecap="round" opacity=".85" />
        <text x="389" y="327" textAnchor="middle" className="map-country-label">CAMBODIA</text>
        <text x="364" y="391" textAnchor="middle" className="map-water-label">TONLE SAP</text>
        <text x="367" y="419" textAnchor="middle" className="map-city-label">Phnom Penh</text>
        <text x="521" y="337" className="map-neighbor-label">VIETNAM</text><text x="218" y="104" className="map-neighbor-label">THAILAND</text><text x="521" y="121" className="map-neighbor-label">LAOS</text>
        {plotted.map(location => {
          const radius = 5 + Math.sqrt(location.trips / maxTrips) * 7;
          const isActive = selectedKey === location.key;
          return <g key={location.key} className="map-marker" role="button" tabIndex="0" aria-label={`${location.name}: ${location.trips} trips, ${location.trucks} trucks, ${location.tons.toLocaleString(undefined,{maximumFractionDigits:2})} tons`} onClick={() => { setSelectedKey(isActive ? null : location.key); onSelect?.(location); }} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedKey(isActive ? null : location.key); onSelect?.(location); } }}>
            <circle cx={location.x} cy={location.y} r={radius + (isActive ? 5 : 2)} fill="#0f766e" opacity=".13" />
            <circle cx={location.x} cy={location.y} r={radius} fill={isActive ? "#f59e0b" : "#0f766e"} stroke="white" strokeWidth="2.5" />
            <circle cx={location.x} cy={location.y} r="18" fill="transparent" />
          </g>;
        })}
      </svg>
      {active && <div className="absolute bottom-5 left-5 max-w-[calc(100%-2.5rem)] rounded-xl border border-teal-100 bg-white/95 px-4 py-3 shadow-lg backdrop-blur sm:bottom-8 sm:left-8" role="status">
        <div className="font-bold text-slate-900">{active.name}</div><div className="mt-1 flex gap-3 text-xs text-slate-600"><span>{active.trips} trips</span><span>{active.trucks} trucks</span><span>{active.tons.toLocaleString(undefined,{maximumFractionDigits:2})} tons</span></div>
      </div>}
    </div>
    {missing > 0 && <p className="border-t border-slate-100 px-4 py-3 text-xs text-amber-800">{missing} location{missing === 1 ? " is" : "s are"} not mapped yet. Use the table view to see all report locations.</p>}
  </section>;
}
