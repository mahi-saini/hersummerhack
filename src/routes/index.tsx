import { createFileRoute, Link } from "@tanstack/react-router";
import { Compass, ScanLine, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TrailMate — In-Store AI Concierge for Outdoor Gear" },
      {
        name: "description",
        content:
          "Plan your trip at home, get an AI-built gear checklist, then let TrailMate guide you through the store with scanning and AR.",
      },
      { property: "og:title", content: "TrailMate — In-Store AI Concierge" },
      {
        property: "og:description",
        content: "AI-powered trip planning + in-store scanning for Swiss outdoor retailers.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-background to-sky-50">
      <div className="mx-auto max-w-md px-5 py-12">
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg">
            <Compass className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">TrailMate</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your AI concierge for Swiss outdoor gear — from couch to checkout.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            to="/trips"
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Plan a trip</div>
              <div className="text-xs text-muted-foreground">
                AI builds your gear list. Swipe what you like.
              </div>
            </div>
          </Link>
          <Link
            to="/trips"
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <ScanLine className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">I'm in the store</div>
              <div className="text-xs text-muted-foreground">
                Open a trip, follow the route, scan to confirm.
              </div>
            </div>
          </Link>
        </div>

        <p className="mt-12 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          Built on Scandit · Powered by Lovable AI
        </p>
      </div>
    </div>
  );
}
