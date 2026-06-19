# TrailMate — In-Store AI Concierge (Hackathon Plan)

A mobile-first PWA that helps Swiss outdoor shoppers plan a trip at home, then guides them through the store with Scandit scanning + AR. No login — all trips/checklists live in `localStorage` for fast hackathon demo.

## Stack

- TanStack Start (already scaffolded) + Tailwind + shadcn/ui
- Lovable AI Gateway (`google/gemini-3-flash-preview`) for AI checklist + product chat
- AI Gateway image generation (`openai/gpt-image-2`, cached to localStorage by `product_id`) for product photos
- Scandit Web SDK: `@scandit/web-datacapture-core`, `@scandit/web-datacapture-barcode` (BarcodeCapture for confirm-scan, MatrixScan AR for shelf highlights)
- Geolocation API for "are you in the store?" gate (hardcoded store coords)
- `products.json` bundled as static asset, indexed in-memory on load
- **License Key to start with Scandit:** “AhNHji+1CE3bEFujtu6n894sXhF6A9okxQTlK+D1UNQSfYeNVWHNjoRSWM4qCSftvk0WdTxiAdjMcT2eG0bkrN1/HOUpPTQEc0nPsqw3YosIMaiLSCbIulsm2zRNM9nqu/FdXoF7N47rNW8dXU28UnN/c67+fqqHyrVfpUnqKMStT3r2hZ8gjsR7HKjuyzDctNbczoxtTHoBiLbIbM5YVQ1HGsn0RrMeo4McjEbXj1xpbH91fsn4lC58C4Lh6BzwOdezNaivzYC8eNwMHV0Rpn7N/dQU5vjjMd2CvBJHP2FitZNxdhl2fAXHhi1i1wKKb7fMC3/IzwTvR0t8ocbjIgMculOCvvcaKTrcDlzK9zufD/wJKWw7m6/tVil5QxqCG92acTwX2suf2bJerNjOj5JXayYMI8v++aIiOtS5uaTD3rt88JLy9euV/BGVS+ZJi8Ap9YhVKAxQJNN5zWVxMMGKpEfiL5q4UUKvz9TCoKJoUuhvRZzdadErqhnLFCWShYisKI3sbLYNokRdHWvrdvb0UXDnjotoTZRbF3NIPI/lX9g1z67XSvdBqdo1bOGNl/ZOQb4cWL+NkTARWFvhqcfbMKrYqzXgMaQDYwJesi753dVwFYLGk8bSPQqk/0aukkKEP/f6Rosu8VJNZWBhLN2PCzZBYxRNDkNZciAtK+x+YVGPE5NbOLqBPetFFcnDXB0t5ele9+PZ34Be4i01JDoyyGp076FLvSGQ2DtMgfdn7UWVUKnPs2/ca2dP52AiRgTIlBEHlkXDasRHJQtgJROnw2KzBQxlnNT/O1Ss”

## App Structure (routes)

```text
/                         Landing → "Plan a trip" / "I'm in the store"
/trips                    All saved trips (cards list, "+ New trip")
/trips/new                Onboarding wizard (multi-step)
/trips/$tripId            Trip dashboard: checklist progress + actions
/trips/$tripId/swipe      Tinder-style swipe deck over AI picks
/trips/$tripId/packing    AI packing list + store size availability
/trips/$tripId/stores     Nearest store recommendation
/store/$tripId            In-store hub: location gate → guided route
/store/$tripId/nav        Store map with optimized path through aisles
/store/$tripId/scan       Scandit BarcodeCapture confirm-scan view
/store/$tripId/ar         MatrixScan AR shelf highlight (optional bonus)
/product/$code            Product detail + chat ("ask about this product")
```

## Phase I — At home

1. **Onboarding wizard** (`/trips/new`): stepper collecting trip name, country, month, expected weather, gender, height, weight, known sizes (free text per brand), style/color prefs, days, activities (multi-select: ski, hike, swim, climb, camp…), budget CHF, free-text notes. Saves to `localStorage.trips[tripId]`.
2. **AI checklist generation**: server function `generateChecklist(trip)` calls Lovable AI with full `products.json` summary (id, name, category, tags, price, waterproof/temp) and trip context, returns ordered list of `product_id`s with rationale. Cached on trip.
3. **Swipe deck** (`/trips/$tripId/swipe`): one card per recommended product. Card shows AI-generated hero image (lazy-generated on first view, cached by `product_id` in localStorage as data URL), name, brand, price, key spec chips. Swipe right → add to `trip.picks`; left → skip. Framer Motion drag.
4. **Packing list + size availability**: AI-generated grouped checklist (clothing/sleep/shelter/accessories). For each pick, show available sizes from products.json (stock_total > 0). Mark out-of-stock.
5. **Nearest store**: mock list of 3 Swiss store coords (Zürich, Bern, Lausanne); Haversine vs user geolocation; show closest with "Open in Maps" link.

## Phase II — In store

1. **Location gate** (`/store/$tripId`): request geolocation, compute distance to selected store, allow override "I'm here" for demo. Once verified → "Start your route".
2. **Optimized route** (`/store/$tripId/nav`): take `trip.picks`, group by zone (A–G), order along the store-map path (A→B→C across top→D→E→F→G→Checkout). Render SVG of the store map (recreated from `store-map.png`) with picks pinned in their zone/aisle and a dashed route line. Tap pin → "Scan to confirm".
3. **Confirm scan** (`/store/$tripId/scan`): Scandit BarcodeCapture. On `didScan`, look up `product_code` in products.json. If it matches the expected pick → ✅ tick it off route; if it's a sibling (same `product_id`, different size/color) → ask "Use this one instead?"; if unrelated → offer chat about the scanned product.
4. **AR mode** (`/store/$tripId/ar`, bonus): MatrixScan AR highlights — green ring for picks on the user's list, gray for others, annotation with name + price. language translation can be done if needed, since we are based in switzerland 
5. **Product chat** (`/product/$code`): full product card + chat. Each message sends `{ product, trip, history, question }` to a server function → Lovable AI with a system prompt scoped to "answer only from product + trip context, suggest in-store alternatives by tag/category if asked". Renders markdown. Suggested-prompt chips: "Is this warm enough?", "Show me alternatives", "How does it compare to X?", "Is my size in stock?".

## Data & state

- `src/lib/products.ts` — loads `products.json`, builds indexes by `product_code`, `product_id`, `zone`, `category`, `tags`.
- `src/lib/store.ts` — localStorage trip store (`trips`, `activeTripId`), zod-validated.
- `src/lib/storeMap.ts` — zone coordinates + ordered traversal path for route optimization.
- `src/lib/imageCache.ts` — `getOrGenerateImage(productId, prompt)` with localStorage cache.

## Server functions / routes

- `POST /api/chat` — streaming product chat (AI SDK `streamText` + `useChat`).
- `createServerFn generateChecklist` — one-shot structured output (`Output.object`) returning `{ picks: [{product_id, reason}] }`.
- `createServerFn generatePackingList` — grouped list with rationale.
- `POST /api/generate-image` — streaming image gen for product hero cards.

`LOVABLE_API_KEY` auto-provisioned (Cloud not required since no DB).

## Scandit integration

- Add packages, init `DataCaptureContext.forLicenseKey(SCANDIT_KEY)` once. Key stored via `add_secret` (`VITE_SCANDIT_LICENSE_KEY` is publishable per Scandit, exposed to client).
- Use `barcode-capture-web` skill for BarcodeCapture page and `matrixscan-ar-web` skill for the AR page. Camera lifecycle managed per-route with cleanup on unmount.

## GitHub docs (written into project)

- `README.md` — project pitch, demo flow, screenshots placeholders, run instructions.
- `docs/ARCHITECTURE.md` — routes, data model, Scandit integration notes, AI prompts.
- `docs/SETUP.md` — env vars (Scandit key, Lovable API key), how to run locally, deploy.
- `docs/DEMO_SCRIPT.md` — 3-minute demo walkthrough using sample-barcodes.pdf.
- `docs/CHALLENGE.md` — original brief + how each requirement is addressed.
- Sample barcodes PDF + store map copied into `public/` and referenced from docs.

You'll `git pull` these into `~/Documents/github/hersummerhack` and push to `suruchithakur/HerCode`.

## Build order (so we can demo even if time runs out)

1. Routes + localStorage trips + onboarding wizard
2. Products loader + swipe deck (placeholder gradient cards first, plug AI images after)
3. AI checklist + packing list (server fn)
4. Store map SVG + optimized route
5. Scandit BarcodeCapture confirm-scan + product chat
6. MatrixScan AR (bonus)
7. Docs

## Open items I'll need from you during build

- Scandit license key (request via `add_secret` as `VITE_SCANDIT_LICENSE_KEY` when we get to step 5). **License Key to start with Scandit:** “AhNHji+1CE3bEFujtu6n894sXhF6A9okxQTlK+D1UNQSfYeNVWHNjoRSWM4qCSftvk0WdTxiAdjMcT2eG0bkrN1/HOUpPTQEc0nPsqw3YosIMaiLSCbIulsm2zRNM9nqu/FdXoF7N47rNW8dXU28UnN/c67+fqqHyrVfpUnqKMStT3r2hZ8gjsR7HKjuyzDctNbczoxtTHoBiLbIbM5YVQ1HGsn0RrMeo4McjEbXj1xpbH91fsn4lC58C4Lh6BzwOdezNaivzYC8eNwMHV0Rpn7N/dQU5vjjMd2CvBJHP2FitZNxdhl2fAXHhi1i1wKKb7fMC3/IzwTvR0t8ocbjIgMculOCvvcaKTrcDlzK9zufD/wJKWw7m6/tVil5QxqCG92acTwX2suf2bJerNjOj5JXayYMI8v++aIiOtS5uaTD3rt88JLy9euV/BGVS+ZJi8Ap9YhVKAxQJNN5zWVxMMGKpEfiL5q4UUKvz9TCoKJoUuhvRZzdadErqhnLFCWShYisKI3sbLYNokRdHWvrdvb0UXDnjotoTZRbF3NIPI/lX9g1z67XSvdBqdo1bOGNl/ZOQb4cWL+NkTARWFvhqcfbMKrYqzXgMaQDYwJesi753dVwFYLGk8bSPQqk/0aukkKEP/f6Rosu8VJNZWBhLN2PCzZBYxRNDkNZciAtK+x+YVGPE5NbOLqBPetFFcnDXB0t5ele9+PZ34Be4i01JDoyyGp076FLvSGQ2DtMgfdn7UWVUKnPs2/ca2dP52AiRgTIlBEHlkXDasRHJQtgJROnw2KzBQxlnNT/O1Ss”
- Approve image-gen cost: 50 product images at low quality ($0.50). Otherwise I'll only generate on first swipe-view. NO CHARGING only generate images if they are able to be completed with credits, otherwise all these products are available online, look for images for google that give a general flat overview of the product. 

Approve and I'll start at step 1.