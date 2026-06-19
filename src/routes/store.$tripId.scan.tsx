import { AppShell } from "@/components/AppShell";
import { useProducts, byCode } from "@/lib/products";
import { useTrip, updateTrip } from "@/lib/trip-store";
import { ensureScandit, DataCaptureContext, Camera, FrameSourceState } from "@/lib/scandit";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  BarcodeCapture,
  BarcodeCaptureSettings,
  BarcodeCaptureOverlay,
  Symbology,
  symbologySettingsFromJSON,
  type BarcodeCaptureSession,
} from "@scandit/web-datacapture-barcode";
import { DataCaptureView } from "@scandit/web-datacapture-core";
import { CheckCircle2, MessageSquare, X } from "lucide-react";

export const Route = createFileRoute("/store/$tripId/scan")({
  validateSearch: (s: Record<string, unknown>) => ({ expect: (s.expect as string) ?? undefined }),
  head: () => ({ meta: [{ title: "Scan — TrailMate" }] }),
  component: Scan,
});

function Scan() {
  const { tripId } = useParams({ from: "/store/$tripId/scan" });
  const navigate = useNavigate();
  const trip = useTrip(tripId);
  const products = useProducts();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scanned, setScanned] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cleanup = () => {};
    let cancelled = false;

    (async () => {
      try {
        await ensureScandit();
        if (cancelled) return;
        await DataCaptureContext.forLicenseKey(""); // already configured
        const context = DataCaptureContext.sharedInstance;
        const camera = Camera.default;
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
  const expectedPick = Route.useSearch().expect;

  function confirmScan() {
    if (!product) return;
    const confirmed = new Set(trip?.confirmedCodes ?? []);
    confirmed.add(product.product_code);
    updateTrip(tripId, { confirmedCodes: [...confirmed] });
  }

  const isOnList = product && trip?.picks?.includes(product.product_id);
  const isExpected = product && expectedPick && product.product_id === expectedPick;

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
            onClick={() => { setScanned(null); window.location.reload(); }}
            className="mt-3 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Scan again
          </button>
        </div>
      )}

      {product && (
        <div className="mt-4 space-y-3">
          <div
            className={`rounded-2xl border p-4 ${
              isExpected
                ? "border-emerald-400 bg-emerald-50"
                : isOnList
                ? "border-amber-300 bg-amber-50"
                : "border-border bg-card"
            }`}
          >
            {isExpected && (
              <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                <CheckCircle2 className="h-3 w-3" /> Match
              </div>
            )}
            {!isExpected && isOnList && (
              <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                On your list
              </div>
            )}
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{product.brand}</div>
            <div className="text-base font-semibold">{product.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {product.color} · Size {product.size} · CHF {product.price_chf}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Zone {product.zone} · Aisle {product.aisle} · Stock {product.stock_total}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { confirmScan(); navigate({ to: "/store/$tripId/nav", params: { tripId } }); }}
              className="rounded-xl bg-emerald-600 p-3 text-sm font-semibold text-white"
            >
              <CheckCircle2 className="mr-1 inline h-4 w-4" /> Confirm
            </button>
            <Link
              to="/product/$code"
              params={{ code: product.product_code }}
              className="rounded-xl bg-slate-900 p-3 text-center text-sm font-semibold text-white"
            >
              <MessageSquare className="mr-1 inline h-4 w-4" /> Ask AI
            </Link>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full rounded-xl border border-border p-3 text-sm text-muted-foreground"
          >
            <X className="mr-1 inline h-4 w-4" /> Scan another
          </button>
        </div>
      )}
    </AppShell>
  );
}
