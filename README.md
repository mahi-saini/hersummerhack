# TrailMate — Scandit × HerCode Hackathon

> AI concierge for a Swiss outdoor retailer. Plan your trip at home, get an AI-curated gear checklist, then let TrailMate guide you through the store with Scandit scanning and product chat.

Built for the **Scandit × HerCode 2026 hackathon** on top of:

- **[Scandit Web SDK](https://docs.scandit.com/sdks/web/)** — Barcode Capture for confirm-scan, ready for MatrixScan AR
- **Lovable AI Gateway** — `google/gemini-3-flash-preview` for checklist + packing list + product chat
- **TanStack Start** (React 19, Vite 7) — file-based routing, server functions, streaming chat route
- **Tailwind v4** + **shadcn-style** components, **framer-motion** for the swipe deck

## ✨ The two-phase flow

### Phase I — at home

1. Free-form **onboarding wizard** captures trip context (country, month, weather, sizing, style, days, activities, budget, notes).
2. AI generates a **personalized gear checklist** from the store's `products.json` catalog (249 SKUs, 69 unique products across 7 zones).
3. The user **swipes Tinder-style** through the recommendations to lock in their picks.
4. A second AI pass builds a **grouped packing list** with notes + in-store size availability badges.

### Phase II — in store

1. **Location gate** verifies the shopper is at the selected store (or "I'm here" for demo).
2. **Optimized store route** orders picks along the store's walking path (A → B → C → top → D → E → F → G → checkout).
3. **Scandit Barcode Capture** is wired into the confirm-scan screen. Scanned code → lookup in catalog → match against expected pick / picks / catalog.
4. **Product chat** — scan or open any product, then chat with TrailMate ("Is this warm enough?", "Show me alternatives", "How does the material feel?"). The AI is grounded in the product object + same-category alternatives.

## 🗺 Routes

```
/                       Landing
/trips                  All trips (localStorage)
/trips/new              Onboarding wizard
/trips/$tripId          Trip dashboard + AI checklist trigger
/trips/$tripId/swipe    Swipe deck
/trips/$tripId/packing  AI packing list + size availability
/store/$tripId          In-store hub (location gate)
/store/$tripId/nav      Optimized route + map
/store/$tripId/scan     Scandit Barcode Capture
/store/$tripId/ar       MatrixScan AR (placeholder for v2)
/product/$code          Product detail + chat
/api/chat               Streaming chat endpoint (AI SDK)
```

## 🏗 Architecture

- All trip data lives in `localStorage` (`trailmate:trips`). No accounts.
- `products.json` is bundled at `public/data/products.json` and indexed in-memory.
- AI runs server-side through `createServerFn` (checklist, packing) and a streaming server route `/api/chat` (chat).
- Scandit context is initialized once (singleton in `src/lib/scandit.ts`) and reused across scan/AR screens.
- The store map is rendered as an inline SVG mirroring the layout in `public/store-map.png`.

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for details.

## 🚀 Run it

```bash
bun install
bun dev
```

Open the printed URL. On desktop the camera scan screen will ask for camera permission — best demo is on a real phone over HTTPS (Lovable preview is already HTTPS).

`LOVABLE_API_KEY` is provisioned automatically by the Lovable Cloud AI Gateway. The Scandit license key is embedded in `src/lib/scandit.ts` for the hackathon demo.

See [`docs/SETUP.md`](./docs/SETUP.md) and [`docs/DEMO_SCRIPT.md`](./docs/DEMO_SCRIPT.md).

## 📦 Assets

- `public/data/products.json` — Scandit's sample catalog (249 SKUs)
- `public/store-map.png` — store layout reference
- `public/sample-barcodes.pdf` — printable demo barcodes

## 🛣 Roadmap

- MatrixScan AR shelf overlay (green ring for picks, gray for others)
- Real AI-generated hero photos per product (cached by `product_id`)
- Multi-store selector + Google Maps deep link
- Saved "ideal pack" templates that auto-fill onboarding
- Trip sharing via URL hash

## License

MIT — built for the HerCode hackathon.
