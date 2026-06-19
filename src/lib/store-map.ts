// Store layout: entrance at bottom, checkout at bottom-right.
// Based on store-map.png.
export const ZONE_ORDER = ["A", "B", "C", "F", "D", "E", "G"] as const;

export const ENTRANCE_POS = { x: 38, y: 95 };
export const EXIT_POS = { x: 65, y: 95 };

export const ZONE_INFO: Record<
  string,
  { name: string; color: string; pos: { x: number; y: number }; box: { x: number; y: number; w: number; h: number } }
> = {
  A: { name: "Jackets & Shells", color: "#7fb3d5", pos: { x: 15, y: 78 }, box: { x: 6, y: 66, w: 18, h: 20 } },
  B: { name: "Footwear", color: "#82c997", pos: { x: 15, y: 55 }, box: { x: 6, y: 42, w: 18, h: 20 } },
  C: { name: "Tents & Shelter", color: "#f5b97a", pos: { x: 15, y: 30 }, box: { x: 6, y: 18, w: 18, h: 20 } },
  F: { name: "Base Layers & Clothing", color: "#84d4cc", pos: { x: 50, y: 35 }, box: { x: 40, y: 20, w: 20, h: 32 } },
  G: { name: "Accessories", color: "#f0d672", pos: { x: 50, y: 70 }, box: { x: 40, y: 56, w: 20, h: 32 } },
  D: { name: "Sleep", color: "#bda5f0", pos: { x: 85, y: 30 }, box: { x: 76, y: 20, w: 18, h: 20 } },
  E: { name: "Backpacks", color: "#f3a5bd", pos: { x: 85, y: 55 }, box: { x: 76, y: 44, w: 18, h: 20 } },
  CHECKOUT: { name: "Checkout", color: "#cccccc", pos: { x: 85, y: 80 }, box: { x: 76, y: 68, w: 18, h: 20 } },
};

export function orderZones(zones: string[]): string[] {
  const set = new Set(zones);
  return ZONE_ORDER.filter((z) => set.has(z));
}

/**
 * Nearest-neighbor TSP from the entrance through every unique zone, biased
 * to finish near the checkout. Good enough for ~10 stops and feels natural
 * because the next stop is always the closest unvisited zone.
 */
export function optimizedZoneOrder(zones: string[]): string[] {
  const remaining = Array.from(new Set(zones)).filter((z) => ZONE_INFO[z]);
  const out: string[] = [];
  let cur = ENTRANCE_POS;
  while (remaining.length) {
    let bestI = 0;
    let bestD = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const p = ZONE_INFO[remaining[i]].pos;
      const d = (p.x - cur.x) ** 2 + (p.y - cur.y) ** 2;
      if (d < bestD) {
        bestD = d;
        bestI = i;
      }
    }
    const z = remaining.splice(bestI, 1)[0];
    out.push(z);
    cur = ZONE_INFO[z].pos;
  }
  return out;
}

/**
 * Distribute N product pins inside a zone's box on a small grid so multiple
 * items in the same aisle don't overlap visually.
 */
export function slotPosition(zone: string, index: number, total: number): { x: number; y: number } {
  const info = ZONE_INFO[zone];
  if (!info) return { x: 50, y: 50 };
  const { x, y, w, h } = info.box;
  if (total <= 1) return { x: x + w / 2, y: y + h / 2 };
  const cols = Math.min(3, total);
  const rows = Math.ceil(total / cols);
  const col = index % cols;
  const row = Math.floor(index / cols);
  const padX = w * 0.22;
  const padY = h * 0.22;
  const stepX = cols > 1 ? (w - padX * 2) / (cols - 1) : 0;
  const stepY = rows > 1 ? (h - padY * 2) / (rows - 1) : 0;
  return { x: x + padX + col * stepX, y: y + padY + row * stepY };
}
