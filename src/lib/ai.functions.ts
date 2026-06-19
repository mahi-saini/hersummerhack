import { createServerFn } from "@tanstack/react-start";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { Trip } from "./types";

const TripSchema = z.object({
  name: z.string(),
  country: z.string(),
  month: z.string(),
  weather: z.string(),
  gender: z.string(),
  height_cm: z.string(),
  weight_kg: z.string(),
  sizing_notes: z.string(),
  style: z.string(),
  days: z.string(),
  activities: z.array(z.string()),
  budget_chf: z.string(),
  notes: z.string(),
}) satisfies z.ZodType<Pick<Trip,
  "name" | "country" | "month" | "weather" | "gender" | "height_cm" | "weight_kg" |
  "sizing_notes" | "style" | "days" | "activities" | "budget_chf" | "notes"
>>;

const CatalogItem = z.object({
  product_id: z.string(),
  name: z.string(),
  brand: z.string(),
  category: z.string(),
  price_chf: z.number(),
  tags: z.array(z.string()),
  waterproof_rating_mm: z.number().nullable(),
  temp_rating_c: z.number().nullable(),
  weight_g: z.number().nullable(),
  material: z.string(),
  zone_name: z.string(),
});

export const generateChecklist = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ trip: TripSchema, catalog: z.array(CatalogItem) }).parse(input)
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const system = `You are TrailMate, an expert Swiss outdoor gear advisor for an in-store concierge app.
You are given a shopper trip profile and a catalog of available products in the store.
Recommend a smart, complete gear checklist tailored to the trip. Cover essentials (no duplicates across categories), respect the budget loosely, and match weather/activities/style.
Pick 8-14 items. Return only product_ids from the catalog, each with a one-line reason aimed at the shopper.`;

    const prompt = `TRIP:\n${JSON.stringify(data.trip, null, 2)}\n\nCATALOG (one entry per distinct product_id):\n${JSON.stringify(
      data.catalog
    )}`;

    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system,
      prompt,
      output: Output.object({
        schema: z.object({
          picks: z.array(
            z.object({ product_id: z.string(), reason: z.string() })
          ),
        }),
      }),
    });
    return output;
  });

const PackingItem = z.object({ product_id: z.string(), name: z.string(), category: z.string() });

export const generatePackingList = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ trip: TripSchema, items: z.array(PackingItem) }).parse(input)
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const system = `You are TrailMate. Group the user's selected products into a packing checklist with clear section titles (e.g. "On your body", "Shelter & Sleep", "In your pack", "Accessories"). For each item add a short helpful note (1 sentence max). Use ONLY the provided product_ids.`;

    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system,
      prompt: `TRIP:\n${JSON.stringify(data.trip, null, 2)}\n\nSELECTED ITEMS:\n${JSON.stringify(data.items)}`,
      output: Output.object({
        schema: z.object({
          groups: z.array(
            z.object({
              title: z.string(),
              items: z.array(z.object({ product_id: z.string(), note: z.string() })),
            })
          ),
        }),
      }),
    });
    return output;
  });
