/**
 * Lightweight SVG world map (equirectangular projection) with a marker for each
 * country that has traffic — mirrors the Publytics "Active users" map. No map
 * libraries: a simplified continents backdrop plus country-centroid markers.
 *
 * Longitude/latitude are projected onto a 1000x500 viewBox:
 *   x = (lon + 180) / 360 * 1000
 *   y = (90 - lat) / 180 * 500
 */

// Centroid [lon, lat] for the countries we commonly see. ISO-3166 alpha-2 keys.
const COUNTRY_COORDS = {
  IN: [78.96, 22.0], US: [-98.5, 39.8], GB: [-1.5, 52.5], CA: [-106.3, 56.1],
  AU: [133.8, -25.3], DE: [10.5, 51.2], FR: [2.2, 46.2], BR: [-51.9, -14.2],
  JP: [138.3, 36.2], CN: [104.2, 35.9], RU: [105.3, 61.5], ZA: [24.7, -29.0],
  NG: [8.7, 9.1], AE: [53.8, 23.4], SG: [103.8, 1.35], NL: [5.3, 52.1],
  ES: [-3.7, 40.5], IT: [12.6, 41.9], SE: [18.6, 60.1], MX: [-102.5, 23.6],
  ID: [113.9, -0.8], PK: [69.3, 30.4], BD: [90.4, 23.7], TR: [35.2, 39.0],
  KR: [127.8, 36.5], SA: [45.1, 23.9], PL: [19.1, 51.9], CH: [8.2, 46.8],
  IE: [-8.2, 53.4], NZ: [174.9, -40.9], AR: [-63.6, -38.4], EG: [30.8, 26.8],
  TH: [100.9, 15.9], VN: [108.3, 14.1], PH: [121.8, 12.9], MY: [101.98, 4.2],
  BE: [4.5, 50.5], AT: [14.6, 47.5], NO: [8.5, 60.5], DK: [9.5, 56.3],
  FI: [25.7, 61.9], PT: [-8.2, 39.4], GR: [21.8, 39.1], IL: [34.9, 31.0],
  UA: [31.2, 48.4], CZ: [15.5, 49.8], RO: [24.97, 45.9], HU: [19.5, 47.2],
};

// Simplified continent silhouettes (rough, decorative only).
const CONTINENTS =
  'M150,110 L270,90 L340,120 L360,190 L300,250 L240,240 L190,200 Z ' + // N America
  'M300,270 L350,260 L380,360 L330,430 L300,370 Z ' + // S America
  'M470,110 L560,95 L580,150 L540,165 L480,150 Z ' + // Europe
  'M490,180 L590,170 L620,260 L560,360 L510,300 L500,230 Z ' + // Africa
  'M620,120 L820,110 L860,210 L780,250 L680,220 L630,170 Z ' + // Asia
  'M800,320 L880,310 L900,370 L840,390 L800,360 Z'; // Oceania

const project = (lon, lat) => [((lon + 180) / 360) * 1000, ((90 - lat) / 180) * 500];

export default function WorldMap({ rows = [] }) {
  const points = rows
    .map((r) => {
      const code = String(r.x).toUpperCase();
      const coord = COUNTRY_COORDS[code];
      if (!coord) return null;
      const [cx, cy] = project(coord[0], coord[1]);
      return { code, cx, cy, value: r.y };
    })
    .filter(Boolean);

  const max = Math.max(...points.map((p) => p.value), 1);

  return (
    <div className="worldmap">
      <svg viewBox="0 0 1000 500" className="worldmap__svg" role="img" aria-label="Traffic by country">
        <rect x="0" y="0" width="1000" height="500" className="worldmap__ocean" />
        <path d={CONTINENTS} className="worldmap__land" />
        {points.map((p) => {
          const r = 5 + (p.value / max) * 12;
          return (
            <g key={p.code} className="worldmap__marker">
              <circle cx={p.cx} cy={p.cy} r={r} className="worldmap__pulse" />
              <circle cx={p.cx} cy={p.cy} r={5} className="worldmap__dot" />
              <title>{`${p.code}: ${p.value}`}</title>
            </g>
          );
        })}
      </svg>
      {points.length === 0 && <p className="worldmap__empty">No location data yet</p>}
    </div>
  );
}
