# Procedure — Full 10-Step Build Order

## Step 1. Locate the design tokens

`tokens.css` / `theme.ts` / Tailwind config / CSS variables. Never invent a color. Never write `padding: 13px`.

## Step 2. Pick the state owner first

Local (`useState`) / lifted (2-3 siblings) / context (read-heavy) / URL (`searchParams`) / server cache (React Query, SWR) / global store (Zustand, Redux). Wrong owner = prop drilling or stale data.

## Step 3. Declare the prop contract

Typed props, no `any`, no 8-prop "kitchen-sink" component. Prefer composition over configuration: `<Card><CardHeader>...</CardHeader></Card>` beats `<Card title="..." headerVariant="large">`.

## Step 4. Write semantic HTML first

`<button>` for actions, `<a>` for navigation, `<label htmlFor>` for inputs, headings in order (`h1` → `h2`, no skipping). ARIA only when HTML cannot express the role.

## Step 5. Wire keyboard navigation

Every interactive element reachable by Tab, activatable by Enter/Space. Focus moves to the right place on dialog open / route change / form submit. Focus is trapped in modal dialogs.

## Step 6. Check a11y

Color contrast ≥ 4.5:1 for normal text, ≥ 3:1 for large text and UI components. Color is never the sole indicator (pair with text, icon, or pattern). All images have `alt` (decorative: `alt=""`; meaningful: descriptive).

## Step 7. Handle three states explicitly

Loading (skeleton, not spinner-for-content), empty (icon + message + primary action), error (message + retry). Blank screens are not acceptable.

## Step 8. Container over configuration

Separate data fetching from presentation. `Container` handles `isLoading` / `error` / `empty`; `Component` only renders data.

## Step 9. img containers do not lock aspect-ratio

`img { width: 100%; height: auto; display: block; max-width: 100% }`. The container sets `max-width`; the image keeps its natural aspect ratio. Do not add `aspect-ratio` / `padding-bottom` / `object-fit` tricks that distort on viewport change. Do not lock `width: min(...)` or `padding-inline` together — the constraints compound and break the natural ratio.

## Step 10. No AI slop

No purple/indigo defaults, no `rounded-2xl` on every card, no template hero with stock copy, no excessive gradients. Match the project's actual palette and corner-radius scale. Realistic placeholder content (real product names, real sentence lengths), not "Lorem ipsum."