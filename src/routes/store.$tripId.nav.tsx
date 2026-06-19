import { AppShell } from "@/components/AppShell";
import { StoreMap } from "@/components/StoreMap";
import { groupByProductId, useProducts } from "@/lib/products";
import { orderZones, ZONE_INFO } from "@/lib/store-map";
import { useTrip } from "@/lib/trip-store";
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
  const products = useProducts();
  const groups = useMemo(() => (products.data ? groupByProductId(products.data) : new Map()), [products.data]);

  const picked = (trip?.picks ?? []).map((pid) => groups.get(pid)).filter(Boolean) as any[];
  const ordered = useMemo(() => {
    const order = orderZones(picked.map((p) => p.zone));
    return order.flatMap((z) => picked.filter((p) => p.zone === z));
  }, [picked]);

  const confirmed = new Set(trip?.confirmedCodes ?? []);
  const isConfirmed = (g: any) => g.variants.some((v: any) => confirmed.has(v.product_code));

  return (
    <AppShell title="Your route" back={`/store/${tripId}`}>
      {ordered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No picks yet. Go back and swipe some recommendations first.
        </div>
      ) : (
        <>
          <StoreMap pins={ordered.map((g) => ({ zone: g.zone, aisle: g.aisle, name: g.name }))} />
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Walk up aisle 1, across the top, down aisle 2, then to checkout.
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
