import { AppShell } from "@/components/AppShell";
import { newTripId, saveTrip } from "@/lib/trip-store";
import type { Trip } from "@/lib/types";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/trips/new")({
  head: () => ({ meta: [{ title: "New trip — TrailMate" }] }),
  component: NewTrip,
});

const ACTIVITIES = ["hike", "ski", "climb", "camp", "trail-run", "swim", "via-ferrata", "bikepack"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function NewTrip() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [t, setT] = useState<Omit<Trip, "id" | "createdAt">>({
    name: "",
    country: "Switzerland",
    month: "",
    weather: "",
    gender: "",
    height_cm: "",
    weight_kg: "",
    sizing_notes: "",
    style: "",
    days: "",
    activities: [],
    budget_chf: "",
    notes: "",
  });

  const set = <K extends keyof typeof t>(k: K, v: (typeof t)[K]) => setT((p) => ({ ...p, [k]: v }));
  const toggleAct = (a: string) =>
    set(
      "activities",
      t.activities.includes(a) ? t.activities.filter((x) => x !== a) : [...t.activities, a]
    );

  const steps = ["Trip", "When & where", "About you", "Style & budget", "Activities"];

  function finish() {
    const trip: Trip = { ...t, id: newTripId(), createdAt: Date.now() };
    saveTrip(trip);
    navigate({ to: "/trips/$tripId", params: { tripId: trip.id } });
  }

  return (
    <AppShell title="New trip" back="/trips">
      <div className="mb-4 flex gap-1">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded ${i <= step ? "bg-emerald-600" : "bg-muted"}`}
          />
        ))}
      </div>
      <h2 className="mb-4 text-lg font-semibold">{steps[step]}</h2>

      {step === 0 && (
        <Field label="Give your trip a name">
          <input
            className={input}
            placeholder="Weekend in Zermatt"
            value={t.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>
      )}
      {step === 1 && (
        <>
          <Field label="Country">
            <input
              className={input}
              value={t.country}
              onChange={(e) => set("country", e.target.value)}
            />
          </Field>
          <Field label="Month">
            <div className="grid grid-cols-4 gap-2">
              {MONTHS.map((m) => (
                <Chip key={m} active={t.month === m} onClick={() => set("month", m)}>
                  {m}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="Number of days">
            <input
              className={input}
              type="number"
              value={t.days}
              onChange={(e) => set("days", e.target.value)}
            />
          </Field>
          <Field label="Expected weather">
            <input
              className={input}
              placeholder="Cold & wet, possible snow"
              value={t.weather}
              onChange={(e) => set("weather", e.target.value)}
            />
          </Field>
        </>
      )}
      {step === 2 && (
        <>
          <Field label="Gender">
            <div className="grid grid-cols-3 gap-2">
              {["women", "men", "unisex"].map((g) => (
                <Chip key={g} active={t.gender === g} onClick={() => set("gender", g)}>
                  {g}
                </Chip>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Height (cm)">
              <input
                className={input}
                type="number"
                value={t.height_cm}
                onChange={(e) => set("height_cm", e.target.value)}
              />
            </Field>
            <Field label="Weight (kg)">
              <input
                className={input}
                type="number"
                value={t.weight_kg}
                onChange={(e) => set("weight_kg", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Sizes you know (optional)">
            <textarea
              className={input}
              rows={2}
              placeholder="Patagonia M jacket, Salomon EU42 shoes…"
              value={t.sizing_notes}
              onChange={(e) => set("sizing_notes", e.target.value)}
            />
          </Field>
        </>
      )}
      {step === 3 && (
        <>
          <Field label="Style & colour preferences">
            <input
              className={input}
              placeholder="Earth tones, minimalist"
              value={t.style}
              onChange={(e) => set("style", e.target.value)}
            />
          </Field>
          <Field label="Budget (CHF)">
            <input
              className={input}
              type="number"
              value={t.budget_chf}
              onChange={(e) => set("budget_chf", e.target.value)}
            />
          </Field>
          <Field label="Anything else?">
            <textarea
              className={input}
              rows={3}
              placeholder="Vegan materials, packing light, kids coming…"
              value={t.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
        </>
      )}
      {step === 4 && (
        <Field label="Activities planned">
          <div className="flex flex-wrap gap-2">
            {ACTIVITIES.map((a) => (
              <Chip key={a} active={t.activities.includes(a)} onClick={() => toggleAct(a)}>
                {a}
              </Chip>
            ))}
          </div>
        </Field>
      )}

      <div className="mt-8 flex gap-2">
        {step > 0 && (
          <button
            className="flex-1 rounded-xl border border-border p-3"
            onClick={() => setStep(step - 1)}
          >
            Back
          </button>
        )}
        {step < steps.length - 1 ? (
          <button
            className="flex-1 rounded-xl bg-emerald-600 p-3 font-semibold text-white"
            onClick={() => setStep(step + 1)}
          >
            Next
          </button>
        ) : (
          <button
            className="flex-1 rounded-xl bg-emerald-600 p-3 font-semibold text-white"
            onClick={finish}
          >
            Create trip
          </button>
        )}
      </div>
    </AppShell>
  );
}

const input =
  "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-emerald-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm capitalize transition ${
        active
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-border bg-card hover:border-emerald-300"
      }`}
    >
      {children}
    </button>
  );
}
