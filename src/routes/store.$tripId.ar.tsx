import { AppShell } from "@/components/AppShell";
import { useProducts, byCode, groupByProductId } from "@/lib/products";
import { useTrip, updateTrip } from "@/lib/trip-store";
import { ensureScanditContext } from "@/lib/scandit";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarcodeAr,
  BarcodeArSettings,
  BarcodeArView,
  BarcodeArCircleHighlight,
  BarcodeArCircleHighlightPreset,
  Symbology,
  type Barcode,
} from "@scandit/web-datacapture-barcode";
import { Brush, Color } from "@scandit/web-datacapture-core";
import { CheckCircle2, Circle, ScanLine } from "lucide-react";

export const Route = createFileRoute("/store/$tripId/ar")({
  head: () => ({ meta: [{ title: "AR shelf — TrailMate" }] }),
  component: AR,
});

function AR() {
  const { tripId } = useParams({ from: "/store/$tripId/ar" });
  const trip = useTrip(tripId);
  const products = useProducts();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [spotted, setSpotted] = useState<Set<string>>(new Set());

  // Map pick product_ids -> list of product_codes (variants) we should highlight
  const pickCodes = useMemo(() => {
    if (!products.data || !trip?.picks) return new Set<string>();
    const picksSet = new Set(trip.picks);
    return new Set(
      products.data.filter((p) => picksSet.has(p.product_id)).map((p) => p.product_code),
    );
  }, [products.data, trip?.picks]);

  // Picks for the checklist UI
  const pickGroups = useMemo(() => {
    if (!products.data || !trip?.picks) return [];
    const groups = groupByProductId(products.data);
    return trip.picks.map((id) => groups.get(id)).filter(Boolean) as ReturnType<
      typeof groupByProductId
    > extends Map<string, infer V>
      ? V[]
      : never;
  }, [products.data, trip?.picks]);

  // Keep latest pickCodes reachable from the highlight callback (which is created once)
  const pickCodesRef = useRef(pickCodes);
  useEffect(() => {
    pickCodesRef.current = pickCodes;
  }, [pickCodes]);

  useEffect(() => {
    if (!products.data || !trip) return;
    let cleanup = () => {};
    let cancelled = false;

    (async () => {
      try {
        const context = await ensureScanditContext();
        if (cancelled) return;

        const settings = new BarcodeArSettings();
        settings.enableSymbologies([
          Symbology.EAN13UPCA,
          Symbology.EAN8,
          Symbology.UPCE,
          Symbology.Code128,
          Symbology.Code39,
          Symbology.QR,
          Symbology.DataMatrix,
        ]);

        const barcodeAr = await BarcodeAr.forContext(context, settings);

        const emerald = Color.fromHex("#10B981");
        const transparent = Color.fromHex("#00000000");
        const fill = Color.fromHex("#10B98140");
        const pickBrush = new Brush(fill, emerald, 3);

        barcodeAr.highlightProvider = {
          highlightForBarcode: (barcode: Barcode, callback: (h: unknown) => void) => {
            const code = barcode.data ?? "";
            if (pickCodesRef.current.has(code)) {
              const product = byCode(products.data!, code);
              if (product) {
                setSpotted((prev) => {
                  if (prev.has(product.product_id)) return prev;
                  const next = new Set(prev);
                  next.add(product.product_id);
                  // persist as confirmed too
                  const confirmed = new Set(trip.confirmedCodes ?? []);
                  confirmed.add(product.product_code);
                  updateTrip(tripId, { confirmedCodes: [...confirmed] });
                  return next;
                });
              }
              BarcodeArCircleHighlight.create(barcode, BarcodeArCircleHighlightPreset.Dot)
                .then((hl) => {
                  hl.brush = pickBrush;
                  hl.isPulsing = true;
                  callback(hl);
                })
                .catch(() => callback(null));
            } else {
              // non-picks stay neutral (no highlight)
              callback(null);
              void transparent;
            }
          },
        };

        const view = await BarcodeArView.create(containerRef.current!, context, barcodeAr);
        await view.start();

        cleanup = () => {
          view.stop().catch(() => {});
          view.remove();
        };
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [products.data, trip, tripId]);

  const total = pickGroups.length;
  const found = spotted.size;

  return (
    <AppShell title="AR shelf check" back={`/store/${tripId}`}>
      <div className="relative h-[55vh] w-full overflow-hidden rounded-2xl bg-black">
        <div ref={containerRef} className="absolute inset-0" />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center text-sm text-white">
            <div>
              <div className="mb-2 font-semibold">Camera error</div>
              <div className="opacity-80">{error}</div>
            </div>
          </div>
        )}
        {!error && (
          <div className="pointer-events-none absolute inset-x-0 top-3 mx-3 flex items-center justify-between rounded-full bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur">
            <span className="inline-flex items-center gap-1.5">
              <ScanLine className="h-3.5 w-3.5" /> Scan the shelf
            </span>
            <span className="font-semibold">
              {found} / {total} found
            </span>
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Your checklist
        </div>
        {total === 0 && (
          <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            No picks yet — shortlist products first.
          </div>
        )}
        <ul className="space-y-2">
          {pickGroups.map((g) => {
            const isFound = spotted.has(g.product_id);
            return (
              <li
                key={g.product_id}
                className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                  isFound
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-border bg-card"
                }`}
              >
                {isFound ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{g.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {g.brand} · Zone {g.zone} · Aisle {g.aisle}
                  </div>
                </div>
                {isFound && (
                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                    On shelf
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <Link
          to="/store/$tripId"
          params={{ tripId }}
          className="mt-4 block rounded-xl border border-border p-3 text-center text-sm font-semibold"
        >
          Back to store hub
        </Link>
      </div>
    </AppShell>
  );
}
