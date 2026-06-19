import { ENTRANCE_POS, EXIT_POS, ZONE_INFO } from "@/lib/store-map";

export type MapPin = { x: number; y: number; zone: string; label: string; done?: boolean };

export function StoreMap({ pins, route = true }: { pins: MapPin[]; route?: boolean }) {
  const checkout = ZONE_INFO.CHECKOUT.pos;
  const pathPoints = route
    ? [ENTRANCE_POS, ...pins.map((p) => ({ x: p.x, y: p.y })), checkout, EXIT_POS]
    : [];

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-white">
      <svg viewBox="0 0 100 100" className="w-full" preserveAspectRatio="none" style={{ aspectRatio: "16/13" }}>
        {/* zone tiles */}
        {(["A", "B", "C", "F", "G", "D", "E"] as const).map((z) => (
          <Tile key={z} z={z} />
        ))}

        {/* checkout tile */}
        <rect x={76} y={68} width={18} height={20} rx={3} fill="#eee" stroke="#bbb" strokeWidth="0.3" />
        <text x={85} y={79} textAnchor="middle" fontSize="3.4" fontWeight="700" fill="#666">
          CHECKOUT
        </text>

        {/* route */}
        {route && pathPoints.length > 1 && (
          <>
            <polyline
              points={pathPoints.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="#dc2626"
              strokeWidth="0.8"
              strokeDasharray="2 1.4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* direction arrow at the end */}
            <circle cx={checkout.x} cy={checkout.y} r="1.4" fill="#dc2626" />
          </>
        )}

        {/* pins */}
        {pins.map((pin, i) => (
          <g key={i} transform={`translate(${pin.x} ${pin.y})`}>
            <circle r="3.2" fill={pin.done ? "#10b981" : "#0f172a"} stroke="#fff" strokeWidth="0.6" />
            <text textAnchor="middle" y="1.2" fontSize="3.4" fill="#fff" fontWeight="800">
              {i + 1}
            </text>
          </g>
        ))}

        {/* entrance marker */}
        <circle cx={ENTRANCE_POS.x} cy={ENTRANCE_POS.y} r="1.4" fill="#0ea5e9" />
        <text x={ENTRANCE_POS.x} y={99} textAnchor="middle" fontSize="2.8" fill="#666">
          ENTRANCE
        </text>
        <text x={EXIT_POS.x} y={99} textAnchor="middle" fontSize="2.8" fill="#666">
          EXIT
        </text>
      </svg>
    </div>
  );
}

function Tile({ z }: { z: keyof typeof ZONE_INFO | string }) {
  const info = ZONE_INFO[z];
  if (!info) return null;
  const { x, y, w, h } = info.box;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={3} fill={info.color} opacity="0.55" stroke="#999" strokeWidth="0.2" />
      <text x={x + w / 2} y={y + h / 2 - 1} textAnchor="middle" fontSize="5.5" fontWeight="800" fill="#222">
        {z}
      </text>
      <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize="2.4" fill="#333">
        {info.name}
      </text>
    </g>
  );
}
