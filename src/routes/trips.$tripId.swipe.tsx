import { AppShell } from "@/components/AppShell";
import { ProductHero, specChips } from "@/components/ProductCard";
import { groupByProductId, useProducts } from "@/lib/products";
import { useTrip, updateTrip } from "@/lib/trip-store";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { Heart, X } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/trips/$tripId/swipe")({
  head: () => ({ meta: [{ title: "Swipe — TrailMate" }] }),
  component: SwipePage,
});

function SwipePage() {
  const { tripId } = useParams({ from: "/trips/$tripId/swipe" });
  const trip = useTrip(tripId);
  const products = useProducts();
  const groups = useMemo(() => (products.data ? groupByProductId(products.data) : new Map()), [products.data]);

  const queue = useMemo(() => {
    if (!trip?.recommendations) return [];
    const seen = new Set([...(trip.picks ?? []), ...(trip.skipped ?? [])]);
    return trip.recommendations
      .filter((r) => !seen.has(r.product_id))
      .map((r) => ({ rec: r, group: groups.get(r.product_id) }))
      .filter((x) => x.group);
  }, [trip, groups]);

  const [idx, setIdx] = useState(0);
  const current = queue[idx];
  const next = queue[idx + 1];

  function decide(keep: boolean) {
    if (!trip || !current) return;
    const picks = new Set(trip.picks ?? []);
    const skipped = new Set(trip.skipped ?? []);
    if (keep) picks.add(current.rec.product_id);
    else skipped.add(current.rec.product_id);
    updateTrip(tripId, { picks: [...picks], skipped: [...skipped] });
    setIdx((i) => i + 1);
  }

  return (
    <AppShell title="Swipe your gear" back={`/trips/${tripId}`}>
      {!current ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <div className="mb-2 text-lg font-semibold">All done!</div>
          <div className="mb-4 text-sm text-muted-foreground">
            You picked {trip?.picks?.length ?? 0} items.
          </div>
          <Link
            to="/trips/$tripId"
            params={{ tripId }}
            className="inline-block rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white"
          >
            Back to trip
          </Link>
        </div>
      ) : (
        <>
          <div className="relative mx-auto h-[68vh] max-h-[640px] w-full">
            {next && <Card key={next.rec.product_id} group={next.group} reason={next.rec.reason} stacked />}
            <SwipeCard
              key={current.rec.product_id}
              group={current.group}
              reason={current.rec.reason}
              onDecide={decide}
            />
          </div>
          <div className="mt-6 flex items-center justify-center gap-6">
            <button
              className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card text-rose-500 shadow"
              onClick={() => decide(false)}
            >
              <X className="h-7 w-7" />
            </button>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              {idx + 1} / {queue.length}
            </div>
            <button
              className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow"
              onClick={() => decide(true)}
            >
              <Heart className="h-7 w-7" />
            </button>
          </div>
        </>
      )}
    </AppShell>
  );
}

function Card({
  group,
  reason,
  stacked,
}: {
  group: any;
  reason: string;
  stacked?: boolean;
}) {
  return (
    <div
      className={`absolute inset-0 rounded-3xl border border-border bg-card shadow-xl ${
        stacked ? "scale-95 opacity-60" : ""
      }`}
    >
      <CardBody group={group} reason={reason} />
    </div>
  );
}

function CardBody({ group, reason }: { group: any; reason: string }) {
  const chips = specChips(group);
  return (
    <div className="flex h-full flex-col">
      <ProductHero group={group} className="rounded-b-none rounded-t-3xl" />
      <div className="flex-1 overflow-auto p-4">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{group.brand}</div>
        <div className="text-lg font-semibold leading-tight">{group.name}</div>
        <div className="mt-1 text-sm text-emerald-700">CHF {group.price_chf}</div>
        <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-xs italic text-emerald-900">
          “{reason}”
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {chips.map((c) => (
            <span key={c} className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{c}</span>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{group.description}</p>
      </div>
    </div>
  );
}

function SwipeCard({
  group,
  reason,
  onDecide,
}: {
  group: any;
  reason: string;
  onDecide: (keep: boolean) => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const likeOpacity = useTransform(x, [40, 140], [0, 1]);
  const nopeOpacity = useTransform(x, [-140, -40], [1, 0]);

  function onEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > 120) onDecide(true);
    else if (info.offset.x < -120) onDecide(false);
  }

  return (
    <motion.div
      className="absolute inset-0 rounded-3xl border border-border bg-card shadow-xl"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={onEnd}
      whileTap={{ cursor: "grabbing" }}
    >
      <motion.div
        style={{ opacity: likeOpacity }}
        className="absolute left-4 top-4 z-10 rounded-md border-4 border-emerald-500 px-3 py-1 text-xl font-extrabold text-emerald-500"
      >
        KEEP
      </motion.div>
      <motion.div
        style={{ opacity: nopeOpacity }}
        className="absolute right-4 top-4 z-10 rounded-md border-4 border-rose-500 px-3 py-1 text-xl font-extrabold text-rose-500"
      >
        SKIP
      </motion.div>
      <CardBody group={group} reason={reason} />
    </motion.div>
  );
}
