import { useMemo, useState } from "react";
import { cambodiaLocationCoordinates } from "../lib/cambodia-locations.js";

const bounds = { west: 102.25, east: 107.65, south: 10.35, north: 14.7 };
const project = ({ longitude, latitude }) => ({
  x: 80 + ((longitude - bounds.west) / (bounds.east - bounds.west)) * 560,
  y: 34 + ((bounds.north - latitude) / (bounds.north - bounds.south)) * 474,
});

// Stylized Cambodia outline and major waterways for an offline report map.
const countryPath = "M177 57 L231 44 286 53 329 40 382 50 415 73 464 71 488 98 526 108 550 139 586 143 597 174 617 195 610 222 631 251 618 278 638 309 617 338 631 369 606 391 609 416 582 438 578 467 551 476 534 501 503 489 484 465 459 462 438 435 404 431 384 408 360 403 347 379 324 373 315 348 287 340 278 315 252 310 249 286 228 275 235 251 212 234 218 211 197 195 207 170 189 148 197 124 181 103 Z";
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

  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-label="Delivery locations map">
    <div className="relative bg-[#f8faf9] p-2 sm:p-5">
      <svg viewBox="0 0 720 540" role="img" aria-label={`Map of Cambodia showing ${plotted.length} delivery locations`} className="mx-auto block w-full max-w-5xl">
        <defs><linearGradient id="cambodia-land" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#eef6f3"/><stop offset="1" stopColor="#dcebe5"/></linearGradient><filter id="map-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#164e43" floodOpacity=".16"/></filter></defs>
        <path d={countryPath} fill="url(#cambodia-land)" stroke="#557e70" strokeWidth="2.5" filter="url(#map-shadow)" />
        <path d={lakePath} fill="#addbea" stroke="#83bdcf" strokeWidth="1.5" />
        <path d={riverPath} fill="none" stroke="#83c7da" strokeWidth="5" strokeLinecap="round" opacity=".9" />
        {plotted.map(location => {
          const radius = 5 + Math.sqrt(location.trips / maxTrips) * 5;
          const isActive = selectedKey === location.key;
          const label = location.name.replace(/^KH\.|^D\./, "").replace(/\s*\([^)]*\)$/, "");
          const labelWidth = Math.max(48, Math.min(116, label.length * 5.1 + 18));
          return <g key={location.key} className="map-marker" role="button" tabIndex="0" aria-label={`${location.name}: ${location.trips} trips, ${location.trucks} trucks, ${location.tons.toLocaleString(undefined,{maximumFractionDigits:2})} tons`} onClick={() => { setSelectedKey(isActive ? null : location.key); onSelect?.(location); }} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedKey(isActive ? null : location.key); onSelect?.(location); } }}>
            <line x1={location.x} y1={location.y + radius - 1} x2={location.x} y2={location.y + radius + 7} stroke={isActive ? "#c2410c" : "#0f766e"} strokeWidth="1.5" opacity=".8" />
            <circle cx={location.x} cy={location.y} r={radius + (isActive ? 5 : 2)} fill="#0f766e" opacity=".13" />
            <circle cx={location.x} cy={location.y} r={radius} fill={isActive ? "#f97316" : "#0f766e"} stroke="white" strokeWidth="2.5" />
            <rect x={location.x + 7} y={location.y - 8} width={labelWidth} height="18" rx="9" className="map-location-label-bg" />
            <text x={location.x + 14} y={location.y + 4.5} className="map-location-label">{label}</text>
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
