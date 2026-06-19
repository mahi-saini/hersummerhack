import { ZONE_INFO, orderZones } from "@/lib/store-map";

type Pin = { zone: string; aisle: string; name: string };

export function StoreMap({ pins, route = true }: { pins: Pin[]; route?: boolean }) {
  const zonesVisited = orderZones(pins.map((p) => p.zone));
  const path = ["ENTRANCE", ...zonesVisited, "CHECKOUT", "EXIT"];
  const points = path
    .map((p) => {
      if (p === "ENTRANCE") return { x: 38, y: 95 };
      if (p === "EXIT") return { x: 65, y: 95 };
      if (p === "CHECKOUT") return ZONE_INFO.CHECKOUT.pos;
      return ZONE_INFO[p].pos;
    })
    .filter(Boolean);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-white">
      <svg viewBox="0 0 100 100" className="w-full" preserveAspectRatio="none" style={{ aspectRatio: "16/13" }}>
        {/* zone tiles */}
        {(["A", "B", "C"] as const).map((z, i) => (
          <Tile key={z} z={z} x={6} y={66 - i * 24} w={18} h={20} />
        ))}
        <Tile z="F" x={40} y={20} w={20} h={32} />
        <Tile z="G" x={40} y={56} w={20} h={32} />
        {(["D", "E"] as const).map((z, i) => (
          <Tile key={z} z={z} x={76} y={20 + i * 24} w={18} h={20} />
        ))}
        <rect x={76} y={68} width={18} height={20} rx={3} fill="#eee" stroke="#bbb" />
        <text x={85} y={79} textAnchor="middle" fontSize="4" fontWeight="700" fill="#666">CHECKOUT</text>

        {/* path */}
        {route && (
          <polyline
            points={points.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#dc2626"
            strokeWidth="0.7"
            strokeDasharray="2 1.5"
          />
        )}

        {/* pins */}
        {pins.map((pin, i) => {
          const p = ZONE_INFO[pin.zone].pos;
          return (
            <g key={i} transform={`translate(${p.x} ${p.y})`}>
              <circle r="3" fill="#0f172a" />
              <text textAnchor="middle" y="1" fontSize="3.5" fill="#fff" fontWeight="700">{i + 1}</text>
            </g>
          );
        })}

        {/* entrance/exit labels */}
        <text x={38} y={99} textAnchor="middle" fontSize="3" fill="#666">ENTRANCE</text>
        <text x={65} y={99} textAnchor="middle" fontSize="3" fill="#666">EXIT</text>
      </svg>
    </div>
  );
}

function Tile({ z, x, y, w, h }: { z: keyof typeof ZONE_INFO | string; x: number; y: number; w: number; h: number }) {
  const info = ZONE_INFO[z];
  if (!info) return null;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={3} fill={info.color} opacity="0.55" stroke="#999" strokeWidth="0.2" />
      <text x={x + w / 2} y={y + h / 2 - 1} textAnchor="middle" fontSize="6" fontWeight="800" fill="#222">{z}</text>
      <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize="2.6" fill="#333">{info.name}</text>
    </g>
  );
}
