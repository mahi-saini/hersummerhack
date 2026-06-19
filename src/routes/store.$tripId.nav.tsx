import { AppShell } from "@/components/AppShell";
import { StoreMap, type MapPin } from "@/components/StoreMap";
import { groupByProductId, useProducts } from "@/lib/products";
import { optimizedZoneOrder, slotPosition, ZONE_INFO } from "@/lib/store-map";
import { useTrip, useTripStatus } from "@/lib/trip-store";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { CheckCircle2, ScanLine } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/store/$tripId/nav")({
  head: () => ({ meta: [{ title: "Route — TrailMate" }] }),
  component: Nav,
});

function Nav() {
  const { tripId } = useParams({ from: "/store/$tripId/nav" });
  const trip = useTrip(tripId);
  const tripStatus = useTripStatus(tripId);
  const products = useProducts();
  const groups = useMemo(() => (products.data ? groupByProductId(products.data) : new Map()), [products.data]);
  const codeToProductId = useMemo(
    () => new Map((products.data ?? []).map((p) => [p.product_code, p.product_id])),
    [products.data]
  );

  const resolveGroup = (id: string) => groups.get(id) ?? groups.get(codeToProductId.get(id) ?? "");

  // Source product ids: swiped picks first; fall back to other saved match
  // shapes, then recommendations, so older trips still show a route.
  const routeSource = useMemo(() => {
    const rawTrip = trip as any;
    const candidates = [
      { ids: normalizeProductIds(rawTrip?.picks ?? []), fromPicks: true },
      { ids: normalizeProductIds(rawTrip?.matches ?? []), fromPicks: true },
      { ids: normalizeProductIds(rawTrip?.matched ?? []), fromPicks: true },
      { ids: normalizeProductIds(rawTrip?.shortlist ?? []), fromPicks: true },
      { ids: normalizeProductIds(rawTrip?.shortlisted ?? []), fromPicks: true },
      { ids: normalizeProductIds(rawTrip?.selectedProducts ?? []), fromPicks: true },
      { ids: normalizeProductIds(rawTrip?.confirmedCodes ?? []), fromPicks: true },
      { ids: normalizeProductIds(rawTrip?.recommendations ?? []), fromPicks: false },
    ];

    for (const candidate of candidates) {
      const resolved = candidate.ids.map(resolveGroup).filter(Boolean) as any[];
      if (resolved.length) return { ...candidate, resolved };
    }

    return { ids: [], fromPicks: true, resolved: [] as any[] };
  }, [trip, groups, codeToProductId]);

  const resolved = routeSource.resolved;

  // Optimized walking order: nearest-neighbor across zones, products in same
  // zone grouped together so the shopper doesn't backtrack.
  const ordered = useMemo(() => {
    const zoneOrder = optimizedZoneOrder(resolved.map((p) => p.zone));
    return zoneOrder.flatMap((z) => resolved.filter((p) => p.zone === z));
  }, [resolved]);

  // Distribute pins inside each zone so multiple items don't overlap.
  const pins = useMemo<MapPin[]>(() => {
    const byZone = new Map<string, any[]>();
    for (const g of ordered) {
      const arr = byZone.get(g.zone) ?? [];
      arr.push(g);
      byZone.set(g.zone, arr);
    }
    const slotIndex = new Map<string, number>();
    const confirmed = new Set(trip?.confirmedCodes ?? []);
    return ordered.map((g) => {
      const total = byZone.get(g.zone)!.length;
      const idx = slotIndex.get(g.zone) ?? 0;
      slotIndex.set(g.zone, idx + 1);
      const pos = slotPosition(g.zone, idx, total);
      const done = g.variants.some((v: any) => confirmed.has(v.product_code));
      return { x: pos.x, y: pos.y, zone: g.zone, label: g.name, done };
    });
  }, [ordered, trip?.confirmedCodes]);

  const confirmed = new Set(trip?.confirmedCodes ?? []);
  const isConfirmed = (g: any) => g.variants.some((v: any) => confirmed.has(v.product_code));

  return (
    <AppShell title="Your route" back={`/store/${tripId}`}>
      {tripStatus === "loading" || products.isLoading ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Loading your route…
        </div>
      ) : ordered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No products yet. Go back and generate matches or swipe recommendations first.
        </div>
      ) : (
        <>
          {!routeSource.fromPicks && (
            <div className="mb-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              Showing your AI recommendations — swipe to lock in your picks for a tighter route.
            </div>
          )}
          <StoreMap pins={pins} />
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Optimized path: nearest aisle first, then on to checkout.
          </p>

          <ol className="mt-5 space-y-3">
            {ordered.map((g, i) => {
              const done = isConfirmed(g);
              const zone = ZONE_INFO[g.zone];
              return (
                <li
                  key={g.product_id}
                  className={`flex gap-3 rounded-xl border bg-card p-3 ${done ? "border-emerald-300 bg-emerald-50/40" : "border-border"}`}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: zone?.color ?? "#888" }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{g.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Zone {g.zone} · {zone?.name} · Aisle {g.aisle}
                    </div>
                  </div>
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 self-center text-emerald-500" />
                  ) : (
                    <Link
                      to="/store/$tripId/scan"
                      params={{ tripId }}
                      search={{ expect: g.product_id }}
                      className="self-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                    >
                      <ScanLine className="mr-1 inline h-3 w-3" /> Scan
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>

          <Link
            to="/store/$tripId/scan"
            params={{ tripId }}
            className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 p-4 font-semibold text-white"
          >
            <ScanLine className="h-5 w-5" /> Scan next item
          </Link>
        </>
      )}
    </AppShell>
  );
}

function normalizeProductIds(items: unknown[]): string[] {
  const ids = items
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "product_id" in item) return String((item as { product_id?: unknown }).product_id ?? "");
      return "";
    })
    .map((id) => id.trim())
    .filter(Boolean);
  return Array.from(new Set(ids));
}
