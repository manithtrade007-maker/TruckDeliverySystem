import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cambodiaLocationCoordinates } from "../lib/cambodia-locations.js";

const artworkBounds = L.latLngBounds([[0, 0], [640, 760]]);
const geoBounds = { west: 102.3, east: 107.7, south: 10.3, north: 14.7 };
const mapXY = location => ({
  x: 35 + ((location.longitude - geoBounds.west) / (geoBounds.east - geoBounds.west)) * 690,
  y: 30 + ((geoBounds.north - location.latitude) / (geoBounds.north - geoBounds.south)) * 580,
});
const mapArtwork = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 640">
<defs><linearGradient id="land" x1="0" y1="0" x2=".85" y2="1"><stop stop-color="#8dc84e"/><stop offset=".58" stop-color="#67ad3e"/><stop offset="1" stop-color="#78b947"/></linearGradient><linearGradient id="highland" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e6d985"/><stop offset="1" stop-color="#c9a95d"/></linearGradient><filter id="shadow" x="-.15" y="-.15" width="1.3" height="1.3"><feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#506b45" flood-opacity=".18"/></filter></defs>
<rect width="760" height="640" fill="#fff"/>
<path d="M42 185 L65 74 170 57 238 67 305 56 369 63 415 48 470 61 518 99 585 91 633 112 661 167 687 208 679 247 714 291 698 338 713 375 688 414 674 449 635 477 603 504 580 538 552 565 524 599 472 590 434 573 400 585 358 571 324 576 287 558 248 568 207 548 169 555 133 535 112 495 91 469 98 425 72 392 63 355 45 322 52 281 38 249 Z" fill="url(#land)" stroke="#5c963c" stroke-width="4" filter="url(#shadow)"/>
<path d="M49 190 L87 173 112 185 99 215 65 224 Z M54 290 L88 274 113 294 97 328 61 330 Z M89 446 L123 424 146 444 130 479 104 480 Z" fill="url(#highland)" opacity=".9"/>
<path d="M421 54 L451 42 469 62 457 91 430 83 Z M621 108 L650 101 669 130 654 167 629 155 Z M664 357 L700 344 709 372 688 398 663 388 Z" fill="url(#highland)" opacity=".82"/>
<g fill="none" stroke="#d5e6ae" stroke-width="2" opacity=".72"><path d="M67 151 Q173 132 276 148 T485 136 T650 160"/><path d="M54 245 Q161 222 264 238 T483 220 T692 244"/><path d="M63 337 Q181 310 293 331 T510 311 T702 326"/><path d="M97 424 Q210 397 324 420 T535 399 T676 420"/><path d="M158 526 Q259 495 362 519 T548 493"/><path d="M194 70 Q179 179 203 270 T197 445 T225 554"/><path d="M311 61 Q291 173 321 272 T305 432 T333 570"/><path d="M439 59 Q418 173 446 272 T428 430 T453 577"/><path d="M558 98 Q538 196 566 286 T544 449 T559 554"/></g>
<path d="M226 233 C247 220 276 226 290 246 C304 268 296 296 310 320 C324 341 324 359 310 372 C293 373 281 354 268 338 C252 319 248 293 230 276 C218 262 213 244 226 233 Z" fill="#27b4d0" stroke="#8fe0df" stroke-width="4" opacity=".9"/>
<path d="M439 107 C429 163 456 198 438 239 C421 275 449 310 432 351 C419 384 445 419 426 454 C414 477 431 500 419 527" fill="none" stroke="#48c7d5" stroke-width="5" opacity=".8"/>
<text x="373" y="294" text-anchor="middle" font-family="Georgia,serif" font-size="34" letter-spacing="5" font-weight="700" fill="#143a28" opacity=".92">CAMBODIA</text>
<g font-family="Arial,sans-serif" font-size="10" font-weight="600" fill="#edf5d9" opacity=".87"><text x="126" y="183">BANTEAY MEANCHEY</text><text x="238" y="163">SIEM REAP</text><text x="384" y="176">PREAH VIHEAR</text><text x="530" y="185">RATANAK KIRI</text><text x="137" y="282">BATTAMBANG</text><text x="359" y="371">KAMPONG THOM</text><text x="501" y="328">KRATIE</text><text x="263" y="457">KAMPONG CHHNANG</text><text x="397" y="470">PHNOM PENH</text><text x="492" y="487">PREY VENG</text><text x="170" y="495">KAMPONG SPEU</text><text x="280" y="540">KAMPOT</text><text x="474" y="550">TAKEO</text></g>
</svg>`;
const number = value => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

function markerIcon(count, active = false) {
  const diameter = count > 1 ? 34 : 18;
  return L.divIcon({
    className: "delivery-map-marker-wrap",
    html: `<span class="delivery-map-marker${active ? " is-active" : ""}${count > 1 ? " is-cluster" : ""}" style="--marker-size:${diameter}px">${count > 1 ? count : '<span class="delivery-map-pin-dot"></span>'}</span>`,
    iconSize: [diameter, diameter],
    iconAnchor: [diameter / 2, diameter / 2],
  });
}

export function CambodiaLocationMap({ locations, onSelect }) {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  const [selectedKey, setSelectedKey] = useState(null);
  const plotted = useMemo(() => locations.map(location => {
    const coordinate = cambodiaLocationCoordinates.get(location.key);
    return coordinate ? { ...location, ...coordinate } : null;
  }).filter(Boolean), [locations]);
  const missing = locations.length - plotted.length;
  const selected = plotted.find(location => location.key === selectedKey);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    if (!hostRef.current || mapRef.current) return undefined;
    const map = L.map(hostRef.current, { crs: L.CRS.Simple, zoomControl: false, scrollWheelZoom: false, zoomSnap: 0.05, preferCanvas: true, maxBounds: artworkBounds, maxBoundsViscosity: 1, minZoom: 0.05, maxZoom: 2.5 })
      .setView([320, 380], 0.06);
    L.imageOverlay(`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(mapArtwork)}`, artworkBounds, { interactive: false }).addTo(map);
    L.control.zoom({ position: "topright" }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const resize = () => map.invalidateSize({ pan: false });
    window.addEventListener("resize", resize);
    const observer = new ResizeObserver(resize);
    observer.observe(hostRef.current);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    setSelectedKey(current => plotted.some(item => item.key === current) ? current : null);
    const renderMarkers = () => {
      layer.clearLayers();
      const zoom = map.getZoom();
      const cellSize = zoom >= 0.5 ? 28 : zoom >= 0 ? 24 : 20;
      const buckets = new Map();
      plotted.forEach(location => {
        const xy = mapXY(location);
        const point = map.project([640 - xy.y, xy.x], zoom);
        const key = `${Math.floor(point.x / cellSize)}:${Math.floor(point.y / cellSize)}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(location);
      });
      for (const items of buckets.values()) {
        const center = items.length === 1 ? mapXY(items[0]) : {
          x: items.reduce((sum, item) => sum + mapXY(item).x, 0) / items.length,
          y: items.reduce((sum, item) => sum + mapXY(item).y, 0) / items.length,
        };
        const centerPoint = [640 - center.y, center.x];
        const marker = L.marker(centerPoint, { icon: markerIcon(items.length), keyboard: true, title: items.length === 1 ? items[0].name : `${items.length} locations` });
        marker.on("click", () => {
          if (items.length > 1 && zoom < 0.9) {
            map.setView(centerPoint, Math.min(zoom + 0.7, 2.5), { animate: true });
            return;
          }
          if (items.length === 1) {
            const location = items[0];
            setSelectedKey(location.key);
            onSelectRef.current?.(location);
            marker.setIcon(markerIcon(1, true));
            marker.bindPopup(`<div class="delivery-map-popup"><strong>${escapeHtml(location.name)}</strong><div class="delivery-map-popup-stats"><span>${number(location.trips)} trips</span><span>${number(location.trucks)} trucks</span><span>${number(location.tons)} tons</span></div></div>`, { closeButton: true, offset: [0, -9], maxWidth: 260 }).openPopup();
          } else {
            const list = items.map(location => `<button type="button" class="delivery-map-list-item" data-location-key="${escapeHtml(location.key)}"><span>${escapeHtml(location.name)}</span><span>${number(location.trips)} trips</span></button>`).join("");
            marker.bindPopup(`<div class="delivery-map-popup"><strong>${items.length} locations in this area</strong><div class="delivery-map-location-list">${list}</div></div>`, { closeButton: true, offset: [0, -9], maxWidth: 300, minWidth: 230 }).openPopup();
            window.setTimeout(() => {
              const popup = marker.getPopup()?.getElement();
              popup?.querySelectorAll("[data-location-key]").forEach(button => button.addEventListener("click", () => {
                const location = items.find(item => item.key === button.dataset.locationKey);
                if (!location) return;
                setSelectedKey(location.key);
                onSelectRef.current?.(location);
                map.closePopup();
              }));
            }, 0);
          }
        });
        marker.addTo(layer);
      }
    };
    renderMarkers();
    map.on("zoomend moveend", renderMarkers);
    return () => map.off("zoomend moveend", renderMarkers);
  }, [plotted]);

  function focusLocation(location) {
    setSelectedKey(location.key);
    onSelectRef.current?.(location);
    const xy = mapXY(location);
    mapRef.current?.setView([640 - xy.y, xy.x], Math.max(0.8, mapRef.current.getZoom()), { animate: true });
  }

  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Delivery locations map">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
      <div><h2 className="font-bold text-slate-900">Delivery locations</h2><p className="text-xs text-slate-500">Select a point or a location to view its report</p></div>
      <div className="flex items-center gap-2 text-xs text-slate-500"><span className="h-2.5 w-2.5 rounded-full bg-teal-700" /> {plotted.length} mapped{missing ? ` · ${missing} need coordinates` : ""}</div>
    </div>
    <div className="grid min-h-[540px] lg:grid-cols-[minmax(0,1fr)_330px]">
      <div className="delivery-map-wrap min-h-[460px] border-b border-slate-200 bg-[#f8faf8] lg:border-b-0 lg:border-r">
        <div ref={hostRef} className="delivery-map mx-auto h-[min(64vh,700px)] min-h-[460px] w-full max-w-[1050px] bg-white" role="application" aria-label="Interactive Cambodia delivery map" />
      </div>
      <aside className="flex min-h-[360px] flex-col" aria-label="Delivered locations">
        <div className="border-b border-slate-100 px-4 py-3"><h3 className="font-bold text-slate-900">Locations delivered</h3><p className="mt-0.5 text-xs text-slate-500">{groupsLabel(plotted.length)} in this report</p></div>
        <div className="max-h-[min(64vh,700px)] flex-1 divide-y divide-slate-100 overflow-y-auto">
          {plotted.map(location => <button key={location.key} type="button" onClick={() => focusLocation(location)} className={`flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-teal-700 ${selectedKey === location.key ? "bg-teal-50" : "bg-white"}`}>
            <span className={`h-3 w-3 shrink-0 rounded-full ring-4 ${selectedKey === location.key ? "bg-orange-500 ring-orange-100" : "bg-teal-700 ring-teal-100"}`} />
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{location.name}</span><span className="mt-0.5 block text-xs text-slate-500">{number(location.trips)} trips · {number(location.trucks)} trucks</span></span>
            <span className="text-xs font-bold tabular-nums text-slate-600">{number(location.tons)} t</span>
          </button>)}
          {!plotted.length && <p className="px-4 py-8 text-center text-sm text-slate-500">No delivered locations for this period. Try another month or All months.</p>}
        </div>
      </aside>
    </div>
    {selected && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3" role="status"><span className="font-semibold text-slate-800">{selected.name}</span><span className="flex gap-3 text-xs text-slate-600"><span>{number(selected.trips)} trips</span><span>{number(selected.trucks)} trucks</span><span>{number(selected.tons)} tons</span></span></div>}
    {missing > 0 && <p className="border-t border-slate-100 px-4 py-3 text-xs text-amber-800">{missing} location{missing === 1 ? " is" : "s are"} not mapped yet. Use the table view to see all report locations.</p>}
  </section>;
}

function groupsLabel(count) { return `${count} location${count === 1 ? "" : "s"}`; }

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}
