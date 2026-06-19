import { AppShell } from "@/components/AppShell";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { Construction } from "lucide-react";

export const Route = createFileRoute("/store/$tripId/ar")({
  head: () => ({ meta: [{ title: "AR — TrailMate" }] }),
  component: AR,
});

function AR() {
  const { tripId } = useParams({ from: "/store/$tripId/ar" });
  return (
    <AppShell title="AR shelf" back={`/store/${tripId}`}>
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <Construction className="mx-auto mb-3 h-10 w-10 text-amber-500" />
        <div className="font-semibold">MatrixScan AR — coming next</div>
        <p className="mt-2 text-sm text-muted-foreground">
          The basic scanner already works in “Scan a product”. AR highlights for picks vs others are the next iteration once we tune the shelf workflow.
        </p>
      </div>
    </AppShell>
  );
}
