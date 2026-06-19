import { ENTRANCE_POS, EXIT_POS, MAP_ASPECT_RATIO, MAP_IMAGE_SRC, ZONE_INFO } from "@/lib/store-map";

export type MapPin = { x: number; y: number; zone: string; label: string; done?: boolean };

export function StoreMap({ pins, route = true }: { pins: MapPin[]; route?: boolean }) {
  const checkout = ZONE_INFO.CHECKOUT.pos;
  const pathPoints = route
    ? [ENTRANCE_POS, ...pins.map((p) => ({ x: p.x, y: p.y })), checkout, EXIT_POS]
    : [];

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-border bg-white"
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
            <circle cx={checkout.x} cy={checkout.y} r="1.4" fill="#dc2626" />
          </>
        )}

        {pins.map((pin, i) => (
          <g key={i} transform={`translate(${pin.x} ${pin.y})`}>
            <circle r="3.2" fill={pin.done ? "#10b981" : "#0f172a"} stroke="#fff" strokeWidth="0.6" />
            <text textAnchor="middle" y="1.2" fontSize="3.6" fill="#fff" fontWeight="800">
              {i + 1}
            </text>
          </g>
        ))}

        <circle cx={ENTRANCE_POS.x} cy={ENTRANCE_POS.y} r="1.2" fill="#0ea5e9" />
      </svg>
    </div>
  );
}
