import { AppShell } from "@/components/AppShell";
import { useProducts, byCode, groupByProductId } from "@/lib/products";
import { useTrip, updateTrip } from "@/lib/trip-store";
import { ensureScanditContext, Camera, FrameSourceState, DataCaptureView } from "@/lib/scandit";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarcodeCapture,
  BarcodeCaptureSettings,
  BarcodeCaptureOverlay,
  Symbology,
  type BarcodeCaptureSession,
} from "@scandit/web-datacapture-barcode";
import { CheckCircle2, Circle, ListPlus, ShoppingBag, Trash2, X, AlertTriangle, Info, ChevronDown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/store/$tripId/scan")({
  head: () => ({ meta: [{ title: "Scan — TrailMate" }] }),
  component: Scan,
});

function Scan() {
  const { tripId } = useParams({ from: "/store/$tripId/scan" });
  const trip = useTrip(tripId);
  const products = useProducts();
  const containerRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<BarcodeCapture | null>(null);
  const [scanned, setScanned] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cleanup = () => {};
    let cancelled = false;

    (async () => {
      try {
        const context = await ensureScanditContext();
        if (cancelled) return;
        const camera = Camera.pickBestGuess();
        const settings = new BarcodeCaptureSettings();
        settings.enableSymbologies([
          Symbology.EAN13UPCA,
          Symbology.EAN8,
          Symbology.UPCE,
          Symbology.Code128,
          Symbology.Code39,
          Symbology.QR,
          Symbology.DataMatrix,
        ]);
        settings.codeDuplicateFilter = 1000;
        await context.setFrameSource(camera);

        const capture = await BarcodeCapture.forContext(context, settings);
        captureRef.current = capture;
        const view = await DataCaptureView.forContext(context);
        if (containerRef.current) view.connectToElement(containerRef.current);
        await BarcodeCaptureOverlay.withBarcodeCaptureForView(capture, view);

        capture.addListener({
          didScan: async (_mode, session: BarcodeCaptureSession) => {
            const code = session.newlyRecognizedBarcode?.data ?? "";
            if (!code) return;
            await capture.setEnabled(false);
            setScanned(code);
          },
        });

        await camera.switchToDesiredState(FrameSourceState.On);
        await capture.setEnabled(true);

        cleanup = () => {
          camera.switchToDesiredState(FrameSourceState.Off).catch(() => {});
          capture.setEnabled(false).catch(() => {});
        };
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  const product = scanned && products.data ? byCode(products.data, scanned) : null;
  const isOnList = !!(product && trip?.picks?.includes(product.product_id));

  async function resumeScanning() {
    setScanned(null);
    try {
      await captureRef.current?.setEnabled(true);
    } catch {
      /* noop */
    }
  }

  function addToPicks() {
    if (!product) return;
    const picks = new Set(trip?.picks ?? []);
    picks.add(product.product_id);
    updateTrip(tripId, { picks: [...picks] });
  }

  function checkOff() {
    if (!product) return;
    const confirmed = new Set(trip?.confirmedCodes ?? []);
    confirmed.add(product.product_code);
    updateTrip(tripId, { confirmedCodes: [...confirmed] });
  }

  async function handleBuyOnList() {
    checkOff();
    toast.success("Checked off your list");
    await resumeScanning();
  }

  async function handleNotNow() {
    await resumeScanning();
  }

  async function handleBuyNew() {
    addToPicks();
    checkOff();
    toast.success("Added & checked off");
    await resumeScanning();
  }

  async function handleAddToList() {
    addToPicks();
    toast.success("Added to your list");
    await resumeScanning();
  }

  async function handleLeaveBehind() {
    await resumeScanning();
  }

  // ---- Manual list management ----
  const pickGroups = useMemo(() => {
    if (!products.data || !trip?.picks) return [];
    const groups = groupByProductId(products.data);
    return trip.picks.map((id) => groups.get(id)).filter(Boolean) as any[];
  }, [products.data, trip?.picks]);

  const confirmedCodes = new Set(trip?.confirmedCodes ?? []);
  const isGroupChecked = (g: any) =>
    g.variants.some((v: any) => confirmedCodes.has(v.product_code));

  function toggleCheck(g: any) {
    const set = new Set(trip?.confirmedCodes ?? []);
    const codes: string[] = g.variants.map((v: any) => v.product_code);
    const checked = codes.some((c) => set.has(c));
    if (checked) {
      codes.forEach((c) => set.delete(c));
    } else {
      // Mark the first variant as confirmed (representative)
      set.add(codes[0]);
    }
    updateTrip(tripId, { confirmedCodes: [...set] });
  }

  function removeFromList(g: any) {
    const picks = (trip?.picks ?? []).filter((id) => id !== g.product_id);
    const codes: string[] = g.variants.map((v: any) => v.product_code);
    const confirmed = (trip?.confirmedCodes ?? []).filter((c) => !codes.includes(c));
    updateTrip(tripId, { picks, confirmedCodes: confirmed });
    toast.success(`Removed ${g.name}`);
  }

  return (
    <AppShell title="Scan" back={`/store/${tripId}`}>
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
        {!scanned && !error && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-xs text-white/80">
            Point the camera at a barcode
          </div>
        )}
      </div>

      {scanned && !product && (
        <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800">
          <div className="font-semibold">Not in catalog</div>
          <div className="mt-1 break-all text-xs">{scanned}</div>
          <button
            onClick={resumeScanning}
            className="mt-3 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Scan again
          </button>
        </div>
      )}

      {product && (
        <div className="mt-4 space-y-4">
          <div
            className={`rounded-2xl border p-4 ${
              isOnList ? "border-emerald-400 bg-emerald-50" : "border-sky-300 bg-sky-50"
            }`}
          >
            <div
              className={`mb-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase text-white ${
                isOnList ? "bg-emerald-600" : "bg-sky-600"
              }`}
            >
              {isOnList ? <CheckCircle2 className="h-3 w-3" /> : <ShoppingBag className="h-3 w-3" />}
              {isOnList ? "On your list" : "New find"}
            </div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{product.brand}</div>
            <div className="text-base font-semibold">{product.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {product.color} · Size {product.size} · CHF {product.price_chf}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Zone {product.zone} · Aisle {product.aisle} · Stock {product.stock_total}
            </div>
          </div>

          {isOnList ? (
            <div className="space-y-2">
              <div className="px-1 text-sm font-semibold">Already on your list! Ready to buy this?</div>
              <button
                onClick={handleBuyOnList}
                className="w-full rounded-xl bg-emerald-600 p-3 text-sm font-semibold text-white"
              >
                <CheckCircle2 className="mr-1.5 inline h-4 w-4" /> Yes, buying it
              </button>
              <button
                onClick={handleNotNow}
                className="w-full rounded-xl border border-border bg-card p-3 text-sm font-semibold"
              >
                No, not now
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="px-1 text-sm font-semibold">
                Ooo this isn't on your list — but it's an excellent choice!
              </div>
              <button
                onClick={handleBuyNew}
                className="w-full rounded-xl bg-emerald-600 p-3 text-sm font-semibold text-white"
              >
                <ShoppingBag className="mr-1.5 inline h-4 w-4" /> Buy it
              </button>
              <button
                onClick={handleAddToList}
                className="w-full rounded-xl border border-border bg-card p-3 text-sm font-semibold"
              >
                <ListPlus className="mr-1.5 inline h-4 w-4" /> Add to list for now
              </button>
              <button
                onClick={handleLeaveBehind}
                className="w-full rounded-xl p-3 text-sm text-muted-foreground"
              >
                <X className="mr-1.5 inline h-4 w-4" /> Leave it behind
              </button>
            </div>
          )}
        </div>
      )}

      {pickGroups.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between px-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Your list
            </div>
            <div className="text-[11px] text-muted-foreground">
              Tap to check off · trash to remove
            </div>
          </div>
          <ul className="space-y-2">
            {pickGroups.map((g) => {
              const checked = isGroupChecked(g);
              return (
                <li
                  key={g.product_id}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                    checked ? "border-emerald-300 bg-emerald-50" : "border-border bg-card"
                  }`}
                >
                  <button
                    onClick={() => toggleCheck(g)}
                    className="shrink-0"
                    aria-label={checked ? "Uncheck" : "Check off"}
                  >
                    {checked ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleCheck(g)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className={`truncate text-sm font-semibold ${checked ? "line-through text-muted-foreground" : ""}`}>
                      {g.name}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {g.brand} · Zone {g.zone} · Aisle {g.aisle}
                    </div>
                  </button>
                  <button
                    onClick={() => removeFromList(g)}
                    className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Remove from list"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </AppShell>
  );
}
