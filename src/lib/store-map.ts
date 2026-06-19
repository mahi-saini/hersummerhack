// Store layout: walking order entrance -> A -> B -> C -> top -> D -> E -> F -> G -> checkout -> exit.
// Based on store-map.png.
export const ZONE_ORDER = ["A", "B", "C", "F", "D", "E", "G"] as const;

export const ZONE_INFO: Record<string, { name: string; color: string; pos: { x: number; y: number } }> = {
  A: { name: "Jackets & Shells", color: "#7fb3d5", pos: { x: 15, y: 78 } },
  B: { name: "Footwear", color: "#82c997", pos: { x: 15, y: 55 } },
  C: { name: "Tents & Shelter", color: "#f5b97a", pos: { x: 15, y: 30 } },
  F: { name: "Base Layers & Clothing", color: "#84d4cc", pos: { x: 50, y: 35 } },
  G: { name: "Accessories", color: "#f0d672", pos: { x: 50, y: 70 } },
  D: { name: "Sleep", color: "#bda5f0", pos: { x: 85, y: 30 } },
  E: { name: "Backpacks", color: "#f3a5bd", pos: { x: 85, y: 55 } },
  CHECKOUT: { name: "Checkout", color: "#cccccc", pos: { x: 85, y: 80 } },
};

export function orderZones(zones: string[]): string[] {
  const set = new Set(zones);
  return ZONE_ORDER.filter((z) => set.has(z));
}
