import { useState } from "react";

// Animated Cambodia delivery map. Usage:
// <CambodiaMap from="phnom-penh" to="siem-reap" selected="battambang" onSelect={(c)=>console.log(c)} />
const MAP_PATH = "M312.4 0.0L311.4 6.1L311.5 9.8L310.1 12.5L309.1 15.3L306.6 17.1L305.7 16.3L304.2 17.5L302.7 20.7L302.3 23.5L303.0 25.8L300.4 35.1L301.9 37.4L301.8 41.0L305.7 42.3L307.1 43.8L307.9 46.7L307.9 48.4L308.0 51.9L307.5 54.4L309.5 57.5L312.1 60.7L317.8 78.3L314.9 86.6L309.9 102.5L309.9 103.7L309.2 105.1L310.2 109.1L312.5 112.6L313.5 117.5L315.2 127.8L314.3 131.1L314.6 132.5L312.5 140.3L309.6 143.4L304.8 147.1L300.4 142.5L293.9 143.9L288.2 148.3L284.0 152.4L276.2 158.3L268.6 158.2L265.2 160.5L262.0 164.4L254.3 163.9L248.8 165.1L247.7 163.8L244.8 164.1L247.2 169.0L246.5 172.0L246.3 174.1L245.1 176.5L247.3 181.6L246.0 182.6L243.0 181.0L238.4 181.8L236.2 179.9L230.5 177.5L222.1 176.0L220.5 179.1L218.0 182.9L212.7 182.6L210.3 183.9L208.6 187.0L210.1 188.7L212.7 190.1L213.5 195.7L212.8 199.5L212.6 205.5L214.6 207.5L216.4 210.1L222.0 213.9L225.8 217.7L228.0 217.1L230.8 219.1L232.0 224.1L229.1 224.1L228.7 225.1L228.8 227.7L230.5 235.2L223.9 233.9L219.6 230.7L217.0 229.5L215.2 232.6L212.0 231.0L210.5 227.1L206.4 221.3L201.6 222.5L199.1 223.8L189.6 225.8L186.1 224.6L182.6 227.8L179.4 231.6L173.7 228.8L166.4 226.5L164.5 226.1L162.9 227.4L162.1 231.3L165.2 239.4L157.1 244.4L152.5 250.4L144.7 251.0L136.1 250.4L133.9 252.0L130.2 257.2L128.3 257.1L126.5 255.1L123.0 253.0L119.6 253.6L118.4 249.8L116.6 248.3L115.4 248.4L113.6 249.3L108.0 248.6L99.8 247.3L96.3 245.6L94.7 242.7L93.6 242.4L93.4 241.6L92.7 241.5L93.0 246.0L90.4 249.6L87.2 250.1L85.8 249.3L83.8 248.7L84.6 249.6L84.8 252.2L79.4 252.6L78.1 250.5L77.8 249.2L76.8 249.1L76.0 249.2L74.4 247.1L71.6 246.0L72.4 243.6L74.0 240.9L77.6 238.0L82.5 237.8L81.7 237.2L82.1 233.7L84.0 232.4L84.5 228.6L80.8 220.5L79.9 217.3L76.9 216.4L73.2 212.5L71.5 212.6L71.0 213.9L70.1 213.4L69.7 214.3L69.3 216.3L67.4 220.8L66.2 224.8L66.4 227.0L65.3 229.2L63.3 229.5L61.8 228.5L57.8 226.3L54.6 229.6L52.4 230.0L49.5 229.7L47.8 226.9L47.2 225.2L47.8 222.2L47.3 216.9L48.3 214.4L47.1 211.1L46.8 209.6L44.9 209.1L45.5 208.0L45.5 206.6L49.2 203.3L50.3 203.2L48.7 201.1L47.2 200.9L46.7 198.3L45.1 195.4L45.8 195.8L46.7 195.6L49.0 194.7L51.7 196.7L49.5 192.0L49.1 192.0L48.9 193.6L47.4 193.9L44.6 190.8L44.2 188.5L44.1 186.8L43.4 188.1L42.6 189.7L40.3 190.1L39.7 188.1L41.4 189.3L40.1 187.2L41.7 184.4L43.8 184.3L42.0 183.9L42.2 183.1L41.4 183.1L40.6 181.9L39.7 182.7L39.4 182.3L41.4 179.4L43.0 179.2L45.2 179.8L45.9 178.6L43.7 178.8L40.1 179.4L39.0 177.4L37.2 175.5L35.7 174.4L39.2 180.4L39.1 185.7L38.4 187.3L37.4 185.0L36.9 182.2L34.3 173.8L28.4 162.1L26.3 158.6L24.1 141.7L26.6 138.1L26.9 136.1L23.5 133.5L23.0 131.5L16.5 125.7L10.9 123.0L9.8 120.4L10.9 117.5L11.6 115.0L10.9 113.5L9.9 109.3L9.1 106.6L9.9 105.1L9.2 104.1L10.1 103.4L10.6 102.6L9.0 101.1L4.1 94.1L0.8 81.5L1.0 73.2L0.7 71.5L1.1 68.4L12.0 68.2L17.1 65.9L13.7 62.1L23.1 56.6L23.6 54.2L25.4 51.3L29.0 44.7L33.6 40.3L34.2 37.1L36.0 33.2L36.3 31.1L40.5 29.1L46.3 24.5L53.1 22.6L61.7 21.2L65.7 19.4L67.1 19.6L68.6 19.8L74.2 17.0L77.0 18.0L78.7 16.4L80.0 15.6L81.5 16.5L81.7 19.1L87.7 20.3L90.1 20.2L92.1 20.8L94.3 21.8L95.8 20.9L101.3 21.6L103.9 20.8L108.2 19.6L109.6 20.3L111.7 18.2L112.1 18.3L113.3 19.6L116.0 18.2L127.5 20.6L128.7 20.9L129.6 20.3L131.8 20.0L135.0 20.2L136.9 17.7L140.3 17.7L142.3 16.4L143.6 17.5L146.7 16.3L149.3 16.5L151.5 17.6L153.6 17.6L156.1 18.7L159.9 20.2L159.8 24.2L164.0 29.4L170.5 22.4L172.5 24.8L177.7 32.4L179.4 33.1L182.1 35.9L186.5 35.8L190.6 34.1L193.7 32.7L194.9 34.0L197.8 35.0L199.8 35.5L202.2 36.3L205.8 37.1L208.4 41.7L215.2 46.9L219.6 46.5L225.3 47.3L226.8 42.5L229.7 40.2L229.1 37.1L225.8 31.8L221.9 28.7L221.5 24.9L219.3 22.4L219.6 20.3L224.5 21.4L225.0 19.9L226.9 19.9L231.6 20.1L233.8 17.0L235.4 13.2L240.4 15.6L244.8 14.9L247.2 13.1L247.2 11.9L247.4 10.8L249.4 10.8L249.8 10.3L249.4 9.0L250.2 8.2L252.3 7.2L253.6 11.0L255.7 12.2L258.5 14.8L263.9 16.7L265.1 18.5L269.6 23.5L273.7 22.6L274.9 22.1L277.2 23.1L278.2 22.2L279.9 20.3L282.8 16.2L284.8 17.2L287.2 17.8L291.2 14.2L292.9 12.5L293.0 12.5L295.0 11.2L295.5 9.3L297.5 7.2L301.2 7.6L304.0 9.0L306.9 9.1L307.0 7.6L307.6 6.0L308.7 3.9L312.4 0.0ZM88.3 251.4L89.5 254.5L87.0 254.9L86.3 253.3L86.6 251.9L88.3 251.4ZM59.0 238.4L60.2 239.0L58.8 240.5L57.3 241.5L56.8 239.9L54.0 238.3L53.7 235.7L56.7 236.3L57.7 237.6L58.6 237.9ZM43.4 200.8L44.1 202.4L44.1 204.8L42.6 207.0L41.4 206.1L40.6 202.0L40.6 196.7L40.9 197.5L42.6 197.2L43.4 200.0ZM43.0 192.2L44.2 194.2L43.3 196.4L42.4 196.1L41.3 192.6L42.8 191.1L43.1 191.9ZM61.2 247.2L61.5 247.9L60.6 249.6L58.3 246.3L60.0 245.1L59.9 246.5L59.9 247.5L61.1 247.5Z";
const LON0 = 102.3134, LAT1 = 14.7046, S = 60;
const proj = (lat, lon) => [(lon - LON0) * S, (LAT1 - lat) * S];

// 25 first-level divisions: Phnom Penh (capital) + 24 provinces. Coordinates = provincial capital town.
export const CITIES = [
  { id: "phnom-penh", name: "Phnom Penh", km: "ភ្នំពេញ", lat: 11.5564, lon: 104.9282 },
  { id: "banteay-meanchey", name: "Banteay Meanchey", km: "បន្ទាយមានជ័យ", lat: 13.5867, lon: 102.9728 },
  { id: "battambang", name: "Battambang", km: "បាត់ដំបង", lat: 13.0957, lon: 103.2022 },
  { id: "kampong-cham", name: "Kampong Cham", km: "កំពង់ចាម", lat: 11.9934, lon: 105.4635 },
  { id: "kampong-chhnang", name: "Kampong Chhnang", km: "កំពង់ឆ្នាំង", lat: 12.25, lon: 104.6667 },
  { id: "kampong-speu", name: "Kampong Speu", km: "កំពង់ស្ពឺ", lat: 11.4533, lon: 104.52 },
  { id: "kampong-thom", name: "Kampong Thom", km: "កំពង់ធំ", lat: 12.7112, lon: 104.8887 },
  { id: "kampot", name: "Kampot", km: "កំពត", lat: 10.6104, lon: 104.1815 },
  { id: "kandal", name: "Kandal", km: "កណ្ដាល", lat: 11.4833, lon: 104.95 },
  { id: "kep", name: "Kep", km: "កែប", lat: 10.4829, lon: 104.3167 },
  { id: "koh-kong", name: "Koh Kong", km: "កោះកុង", lat: 11.6153, lon: 102.9846 },
  { id: "kratie", name: "Kratie", km: "ក្រចេះ", lat: 12.4881, lon: 106.0188 },
  { id: "mondulkiri", name: "Mondulkiri", km: "មណ្ឌលគិរី", lat: 12.4558, lon: 107.1881 },
  { id: "oddar-meanchey", name: "Oddar Meanchey", km: "ឧត្តរមានជ័យ", lat: 14.1819, lon: 103.5175 },
  { id: "pailin", name: "Pailin", km: "ប៉ៃលិន", lat: 12.8489, lon: 102.6093 },
  { id: "preah-sihanouk", name: "Preah Sihanouk", km: "ព្រះសីហនុ", lat: 10.6275, lon: 103.5234 },
  { id: "preah-vihear", name: "Preah Vihear", km: "ព្រះវិហារ", lat: 13.807, lon: 104.98 },
  { id: "pursat", name: "Pursat", km: "ពោធិ៍សាត់", lat: 12.5388, lon: 103.9192 },
  { id: "prey-veng", name: "Prey Veng", km: "ព្រៃវែង", lat: 11.4868, lon: 105.3253 },
  { id: "ratanakiri", name: "Ratanakiri", km: "រតនគិរី", lat: 13.7394, lon: 106.9873 },
  { id: "siem-reap", name: "Siem Reap", km: "សៀមរាប", lat: 13.3633, lon: 103.8564 },
  { id: "stung-treng", name: "Stung Treng", km: "ស្ទឹងត្រែង", lat: 13.5259, lon: 105.9683 },
  { id: "svay-rieng", name: "Svay Rieng", km: "ស្វាយរៀង", lat: 11.0878, lon: 105.7993 },
  { id: "takeo", name: "Takeo", km: "តាកែវ", lat: 10.9908, lon: 104.785 },
  { id: "tboung-khmum", name: "Tboung Khmum", km: "ត្បូងឃ្មុំ", lat: 11.902, lon: 105.649 },
];

export default function CambodiaMap({ cities = CITIES, from, to, selected, onSelect, color = "#2563eb" }) {
  const [hover, setHover] = useState(null);
  const get = (id) => cities.find((c) => c.id === id);
  const a = from && get(from), b = to && get(to);
  let route = null;
  if (a && b) {
    const [x1, y1] = proj(a.lat, a.lon), [x2, y2] = proj(b.lat, b.lon);
    const cx = (x1 + x2) / 2 + (y2 - y1) * 0.2, cy = (y1 + y2) / 2 - (x2 - x1) * 0.2;
    route = `M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`;
  }
  return (
    <div style={{ width: "100%", maxWidth: 560 }}>
      <style>{`
        @keyframes khDraw { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }
        @keyframes khFill { from { fill-opacity: 0 } to { fill-opacity: .12 } }
        @keyframes khPulse { 0% { r: 4; opacity: .7 } 100% { r: 20; opacity: 0 } }
        @keyframes khDrop { 0% { transform: translateY(-30px); opacity: 0 } 70% { transform: translateY(3px); opacity: 1 } 100% { transform: translateY(0) } }
        @keyframes khFlow { to { stroke-dashoffset: -24 } }
        .kh-outline { stroke-dasharray: 1; stroke-dashoffset: 1; animation: khDraw 2.2s ease forwards, khFill 1s 1.8s ease forwards; fill-opacity: 0 }
        .kh-pulse { animation: khPulse 1.8s ease-out infinite }
        .kh-pin { animation: khDrop .6s ease-out both }
        .kh-flow { animation: khFlow 1s linear infinite }
      `}</style>
      <svg viewBox="-20 -20 360 300" style={{ width: "100%", height: "auto" }} role="img" aria-label="Map of Cambodia">
        <path d={MAP_PATH} pathLength="1" className="kh-outline" fill={color} stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
        {route && (
          <g>
            <path d={route} fill="none" stroke={color} strokeWidth="2" strokeDasharray="6 6" className="kh-flow" />
            <path id="khRoute" d={route} fill="none" />
            <g>
              <text fontSize="14" textAnchor="middle" dy="5">🚚</text>
              <animateMotion dur="4s" repeatCount="indefinite" rotate="0"><mpath href="#khRoute" /></animateMotion>
            </g>
          </g>
        )}
        {cities.map((c, i) => {
          const [x, y] = proj(c.lat, c.lon);
          const active = c.id === selected || c.id === from || c.id === to;
          const hot = active || hover === c.id;
          return (
            <g key={c.id} transform={`translate(${x} ${y})`} style={{ cursor: "pointer" }}
               onClick={() => onSelect && onSelect(c)} onMouseEnter={() => setHover(c.id)} onMouseLeave={() => setHover(null)}>
              {active && <circle className="kh-pulse" fill="none" stroke="#ef4444" strokeWidth="2" />}
              <g className="kh-pin" style={{ animationDelay: `${1.5 + i * 0.08}s` }}>
                <circle r={hot ? 6 : 4} fill={active ? "#ef4444" : "#fff"} stroke={active ? "#fff" : color} strokeWidth="2" />
                {(hot || c.id === "phnom-penh") && (
                  <text y="-10" textAnchor="middle" fontSize="10" fontWeight="600" fill="#111" stroke="#fff" strokeWidth="3" paintOrder="stroke">{c.name}</text>
                )}
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
