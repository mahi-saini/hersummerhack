import { ENTRANCE_POS, EXIT_POS, MAP_ASPECT_RATIO, MAP_IMAGE_SRC, ZONE_INFO } from "@/lib/store-map";
import { useEffect, useMemo, useState } from "react";

export type MapPin = { x: number; y: number; zone: string; label: string; done?: boolean };

// Aisle corridors (vertical walkways between the zone columns) and the
// top/bottom connectors that join them. Tuned to the store-map.png.
const LEFT_CORRIDOR = 34;
const RIGHT_CORRIDOR = 65;
const TOP_CONNECTOR = 15;
const BOTTOM_CONNECTOR = 92;

type Pt = { x: number; y: number };

function corridorForZone(zone: string, fallback: number): number {
  // Left column zones, middle zones, right column zones — based on box center x.
  const info = ZONE_INFO[zone];
  if (!info) return fallback;
  const cx = info.box.x + info.box.w / 2;
  if (cx < 35) return LEFT_CORRIDOR;
  if (cx > 60) return RIGHT_CORRIDOR;
  // Middle column — stay on whichever corridor we're already walking.
  return fallback;
}

/**
 * Orthogonal route that walks the aisles instead of cutting diagonally
 * through shelves. Produces a list of waypoints from entrance → pins →
 * checkout → exit.
 */
function buildRoute(pins: Pt[], pinZones: string[]): Pt[] {
  const path: Pt[] = [ENTRANCE_POS];
  let corridor = LEFT_CORRIDOR; // entrance sits on the left corridor
  let cur: Pt = { x: corridor, y: BOTTOM_CONNECTOR };
  path.push(cur);

  const visit = (target: Pt, zone: string) => {
    const nextCorridor = corridorForZone(zone, corridor);
    if (nextCorridor !== corridor) {
      // Switch corridors via the closer connector (top or bottom).
      const connector = Math.abs(cur.y - TOP_CONNECTOR) < Math.abs(cur.y - BOTTOM_CONNECTOR)
        ? TOP_CONNECTOR
        : BOTTOM_CONNECTOR;
      path.push({ x: corridor, y: connector });
      path.push({ x: nextCorridor, y: connector });
      corridor = nextCorridor;
      cur = { x: corridor, y: connector };
    }
    // Walk along the corridor to the pin's y, then step into the shelf.
    path.push({ x: corridor, y: target.y });
    path.push({ x: target.x, y: target.y });
    cur = { x: target.x, y: target.y };
  };

  for (let i = 0; i < pins.length; i++) visit(pins[i], pinZones[i]);

  // Head to checkout (right corridor) then exit.
  const checkout = ZONE_INFO.CHECKOUT.pos;
  if (corridor !== RIGHT_CORRIDOR) {
    const connector = Math.abs(cur.y - BOTTOM_CONNECTOR) < Math.abs(cur.y - TOP_CONNECTOR)
      ? BOTTOM_CONNECTOR
      : TOP_CONNECTOR;
    path.push({ x: corridor, y: connector });
    path.push({ x: RIGHT_CORRIDOR, y: connector });
    corridor = RIGHT_CORRIDOR;
  }
  path.push({ x: RIGHT_CORRIDOR, y: checkout.y });
  path.push(checkout);
  path.push({ x: RIGHT_CORRIDOR, y: BOTTOM_CONNECTOR });
  path.push(EXIT_POS);
  return path;
}

function pathLength(pts: Pt[]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    total += Math.hypot(dx, dy);
  }
  return total;
}

export function StoreMap({
  pins,
  route = true,
  selectedIndex,
  onSelect,
}: {
  pins: MapPin[];
  route?: boolean;
  selectedIndex?: number | null;
  onSelect?: (i: number) => void;
}) {
  const nextIndex = useMemo(() => pins.findIndex((p) => !p.done), [pins]);
  const focusIndex = selectedIndex ?? (nextIndex >= 0 ? nextIndex : null);

  const pathPoints = useMemo(
    () => (route ? buildRoute(pins.map((p) => ({ x: p.x, y: p.y })), pins.map((p) => p.zone)) : []),
    [pins, route]
  );

  const pathD = useMemo(
    () => pathPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" "),
    [pathPoints]
  );

  const totalLen = useMemo(() => pathLength(pathPoints), [pathPoints]);

  // Highlight box for the focused pin's zone.
  const focusZone = focusIndex != null ? pins[focusIndex]?.zone : null;
  const focusBox = focusZone ? ZONE_INFO[focusZone]?.box : null;

  // Animated walking dot — runs once on mount and whenever path changes.
  const [tick, setTick] = useState(0);
  useEffect(() => setTick((t) => t + 1), [pathD]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
      style={{ aspectRatio: `${MAP_ASPECT_RATIO}` }}
    >
      <img
        src={MAP_IMAGE_SRC}
        alt="Store map"
        className="absolute inset-0 h-full w-full select-none object-fill"
        draggable={false}
      />

      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <filter id="pinShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0.4" stdDeviation="0.5" floodOpacity="0.35" />
          </filter>
        </defs>

        {focusBox && (
          <rect
            x={focusBox.x}
            y={focusBox.y}
            width={focusBox.w}
            height={focusBox.h}
            rx="2"
            ry="2"
            fill="rgba(220,38,38,0.10)"
            stroke="#dc2626"
            strokeWidth="0.4"
            strokeDasharray="1.2 0.8"
            vectorEffect="non-scaling-stroke"
          >
            <animate attributeName="opacity" values="0.6;1;0.6" dur="1.8s" repeatCount="indefinite" />
          </rect>
        )}

        {route && pathPoints.length > 1 && (
          <g>
            {/* Soft glow under path */}
            <path
              d={pathD}
              fill="none"
              stroke="#dc2626"
              strokeOpacity="0.18"
              strokeWidth="2.4"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            {/* Dashed walking path with draw-on animation */}
            <path
              key={tick}
              d={pathD}
              fill="none"
              stroke="#dc2626"
              strokeWidth="1.1"
              strokeDasharray="2 1.4"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              style={{
                strokeDashoffset: totalLen,
                animation: `tm-draw 1.2s ease-out forwards`,
              }}
            />
          </g>
        )}

        {/* Entrance & exit markers */}
        <g>
          <circle cx={ENTRANCE_POS.x} cy={ENTRANCE_POS.y} r="1.4" fill="#10b981" stroke="#fff" strokeWidth="0.4" />
          <circle cx={EXIT_POS.x} cy={EXIT_POS.y} r="1.4" fill="#0ea5e9" stroke="#fff" strokeWidth="0.4" />
        </g>

        {/* Pins */}
        {pins.map((pin, i) => {
          const isFocus = i === focusIndex;
          const isNext = i === nextIndex && !pin.done;
          const fill = pin.done ? "#10b981" : isNext ? "#dc2626" : "#0f172a";
          return (
            <g
              key={i}
              transform={`translate(${pin.x} ${pin.y})`}
              style={{ cursor: onSelect ? "pointer" : "default" }}
              onClick={() => onSelect?.(i)}
            >
              {isFocus && (
                <circle r="5" fill="none" stroke={fill} strokeWidth="0.5" opacity="0.7">
                  <animate attributeName="r" values="3.6;6.5;3.6" dur="1.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.9;0;0.9" dur="1.6s" repeatCount="indefinite" />
                </circle>
              )}
              <circle
                r={isFocus ? 3.8 : 3.2}
                fill={fill}
                stroke="#fff"
                strokeWidth="0.7"
                filter="url(#pinShadow)"
              />
              <text
                textAnchor="middle"
                y="1.25"
                fontSize="3.6"
                fill="#fff"
                fontWeight="800"
                style={{ pointerEvents: "none" }}
              >
                {pin.done ? "✓" : i + 1}
              </text>
            </g>
          );
        })}

        {/* Walking dot following the path */}
        {route && pathPoints.length > 1 && (
          <circle key={`dot-${tick}`} r="1.1" fill="#dc2626" stroke="#fff" strokeWidth="0.4">
            <animateMotion dur="6s" repeatCount="indefinite" rotate="auto" path={pathD} />
          </circle>
        )}
      </svg>

      {/* Legend */}
      <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-2 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-medium text-slate-700 shadow-sm backdrop-blur">
        <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />Entrance</span>
        <span className="text-slate-300">·</span>
        <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-red-600" />Next stop</span>
        <span className="text-slate-300">·</span>
        <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500" />Exit</span>
      </div>

      <style>{`@keyframes tm-draw { to { stroke-dashoffset: 0; } }`}</style>
    </div>
  );
}
