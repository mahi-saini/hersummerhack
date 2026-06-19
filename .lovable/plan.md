# Plan: "Find Your Perfect Match" home + polished flow

## 1. Theme & design system (Alpine Romance)

Update `src/styles.css` tokens:
- `--background` deep forest `#0E3B2E` (light surfaces `#F5EFE3` cream)
- `--primary` warm terracotta `#D97757`
- `--foreground` near-black `#1A1A1A`
- Add `--gradient-romance` (forest → terracotta), `--shadow-elegant`, `--radius` 1.25rem
- Fonts: `Cormorant Garamond` (display, serif) + `Inter` (body) via `<link>` in `__root.tsx`
- Tagline tokens: italic serif headlines, generous tracking, cream cards on forest.

Refactor `AppShell` and `ProductCard` to use new tokens (no hardcoded emerald/sky).

## 2. Home page = onboarding wizard

Rewrite `src/routes/index.tsx`:
- **Returning users** (has trips in localStorage): show "Welcome back" hero with last trip card → `Resume` button + secondary `Start a new match` and `All trips` links. (Resume-last-trip behavior.)
- **First-time / "Start new match"**: render the 5-step wizard inline on the home page.
  - Steps: Trip basics → When & where → About you → Style & budget → Activities
  - Swipeable: framer-motion drag + tap-next; progress bar of 5 hearts/peaks at top
  - Mobile-first: full-viewport card, sticky CTA `Find my match →`, large tap targets (min 48px), one question group per screen
  - On finish: save trip, navigate to `/trips/$tripId` (dashboard) which then leads to swipe deck.
- Hero copy: "Find your perfect match for the mountains." Subhead about AI-curated gear.

Delete the separate `/trips/new` route (or keep as redirect to `/?new=1`). `/trips` list stays for full history.

## 3. Trip dashboard polish (`/trips/$tripId`)

- Replace emerald palette with new tokens
- Big "Your matches" CTA → swipe deck
- Cards for: AI checklist, Packing list, In-store mode, Chat about a product
- Show match progress (X of Y items picked)

## 4. Swipe deck polish (`/trips/$tripId/swipe`)

- "It's a match!" celebratory overlay when liking an item (framer-motion)
- Bigger product image, brand + price + 2 specs
- Use DDG image hook (already built); fallback emoji card
- Bottom bar: ✕ pass · ♥ match · ↶ undo

## 5. In-store experience refinements

- `/store/$tripId`: cleaner zone list with progress chips
- `/store/$tripId/nav`: highlight current zone on SVG map
- `/store/$tripId/scan`: Scandit live view, on match show "Perfect match confirmed ♥"
- `/product/$code`: hero image + streaming chat (already wired) restyled to theme

## 6. Mobile-first guarantees

- All routes wrap in `max-w-md` container with safe-area padding
- Sticky bottom CTAs use `pb-[env(safe-area-inset-bottom)]`
- Touch targets ≥48px, no hover-only affordances
- Verify at 390x844 with `browser--view_preview`

## 7. Fix existing routing artifact

Remove now-orphan `src/routes/trips.new.tsx` (replaced by home-page wizard). Keep `trips.index.tsx` as the history list.

## 8. Verification

- Build passes
- Open `/` at 390x844 → wizard visible, swipeable, completes → dashboard
- Open `/` again with existing trip → "Welcome back" with Resume CTA
- Smoke-test swipe deck, store map, scanner page renders.

## Technical notes

- All localStorage logic stays in `trip-store.ts`
- No backend changes; AI gateway + Scandit unchanged
- New fonts loaded via `<link>` in `__root.tsx` head (per Tailwind v4 rule — no remote `@import`)
- framer-motion already installed
