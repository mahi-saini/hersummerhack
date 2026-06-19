import { AppShell } from "@/components/AppShell";
import { groupByProductId, useProducts } from "@/lib/products";
import { useTrip, updateTrip } from "@/lib/trip-store";
import { generateChecklist } from "@/lib/ai.functions";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Heart, ListChecks, MapPin, ScanLine, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/trips/$tripId")({
  head: () => ({ meta: [{ title: "Trip — TrailMate" }] }),
  component: TripDashboard,
});

function TripDashboard() {
  const { tripId } = useParams({ from: "/trips/$tripId" });
  const trip = useTrip(tripId);
  const products = useProducts();
  const fn = useServerFn(generateChecklist);

  const gen = useMutation({
    mutationFn: async () => {
      if (!trip || !products.data) throw new Error("Not ready");
      const groups = Array.from(groupByProductId(products.data).values());
      const catalog = groups.map((g) => ({
        product_id: g.product_id,
        name: g.name,
        brand: g.brand,
        category: g.category,
        price_chf: g.price_chf,
        tags: g.tags,
        waterproof_rating_mm: g.waterproof_rating_mm,
        temp_rating_c: g.temp_rating_c,
        weight_g: g.weight_g,
        material: g.material,
        zone_name: g.zone_name,
      }));
      const { name, country, month, weather, gender, height_cm, weight_kg, sizing_notes, style, days, activities, budget_chf, notes } = trip;
      return await fn({
        data: {
          trip: { name, country, month, weather, gender, height_cm, weight_kg, sizing_notes, style, days, activities, budget_chf, notes },
          catalog,
        },
      });
    },
    onSuccess: (out) => {
      updateTrip(tripId, { recommendations: out.picks, picks: trip?.picks ?? [], skipped: trip?.skipped ?? [] });
      toast.success(`Got ${out.picks.length} recommendations`);
    },
    onError: (e) => toast.error(String(e instanceof Error ? e.message : e)),
  });

  if (!trip) return <AppShell title="Trip" back="/trips">Loading…</AppShell>;

  const picksCount = trip.picks?.length ?? 0;
  const recCount = trip.recommendations?.length ?? 0;

  return (
    <AppShell title={trip.name || "Trip"} back="/trips">
      <div className="mb-5 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-white">
        <div className="text-xs uppercase tracking-wider opacity-80">{trip.country} · {trip.month} · {trip.days}d</div>
        <div className="mt-1 text-lg font-semibold">{trip.weather || "Plan your gear"}</div>
        <div className="mt-3 flex flex-wrap gap-1">
          {trip.activities?.map((a) => (
            <span key={a} className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] uppercase">{a}</span>
          ))}
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <Stat label="Recommendations" value={recCount} />
        <Stat label="Picks" value={picksCount} />
      </div>

      <div className="space-y-3">
        {recCount === 0 && (
          <button
            className="flex w-full items-center justify-between rounded-2xl bg-emerald-600 p-5 text-left text-white shadow disabled:opacity-60"
            onClick={() => gen.mutate()}
            disabled={gen.isPending || !products.data}
          >
            <div>
              <div className="font-semibold">{gen.isPending ? "Curating…" : "Generate AI checklist"}</div>
              <div className="text-xs opacity-80">From our store catalog of {products.data?.length ?? "…"} variants</div>
            </div>
            <Sparkles className="h-6 w-6" />
          </button>
        )}

        {recCount > 0 && (
          <Action
            to="/trips/$tripId/swipe"
            params={{ tripId }}
            icon={<Heart className="h-5 w-5" />}
            title="Swipe the recommendations"
            subtitle={`${recCount} cards · keep what you love`}
            color="bg-rose-500"
          />
        )}

        {picksCount > 0 && (
          <>
            <Action
              to="/trips/$tripId/packing"
              params={{ tripId }}
              icon={<ListChecks className="h-5 w-5" />}
              title="Packing list & sizes"
              subtitle="AI groups & checks store stock"
              color="bg-indigo-500"
            />
            <Action
              to="/store/$tripId"
              params={{ tripId }}
              icon={<MapPin className="h-5 w-5" />}
              title="I'm at the store"
              subtitle="Optimized route through aisles"
              color="bg-sky-600"
            />
            <Action
              to="/store/$tripId/scan"
              params={{ tripId }}
              icon={<ScanLine className="h-5 w-5" />}
              title="Scan a product"
              subtitle="Confirm or chat about it"
              color="bg-slate-700"
            />
          </>
        )}

        {recCount > 0 && (
          <button
            onClick={() => gen.mutate()}
            disabled={gen.isPending}
            className="w-full rounded-xl border border-border p-3 text-sm text-muted-foreground"
          >
            {gen.isPending ? "Re-generating…" : "Re-generate recommendations"}
          </button>
        )}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Action({
  to,
  params,
  icon,
  title,
  subtitle,
  color,
}: {
  to: string;
  params: Record<string, string>;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
}) {
  return (
    <Link
      to={to as any}
      params={params as any}
      className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:shadow"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${color}`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
      <CheckCircle2 className="h-5 w-5 text-emerald-500 opacity-0" />
    </Link>
  );
}
