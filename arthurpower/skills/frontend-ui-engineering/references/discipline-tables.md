# Discipline Tables — Rationalizations + Red Flags

These tables back the **Required Baseline** discipline section. The body keeps only the Required Baseline statement; the full rationalization counter-arguments and the red-flag catalogue live here.

## Rationalization Table

| Excuse | Reality |
|--------|---------|
| "Accessibility is a nice-to-have" | a11y is the floor, not the ceiling. WCAG 2.1 AA is the legal and engineering baseline. Skip it = ship a bug. |
| "I'll add keyboard nav after the prototype works" | Retrofitting keyboard nav is 3x harder than building it. Mouse handlers do not transfer to key handlers. |
| "Just one hardcoded color is fine" | One becomes ten. Use the token. The token exists for a reason. |
| "It's a prototype, polish later" | Prototypes become production. Build the foundation right or rewrite later. |
| "Generic hero with stock copy is fine for now" | Stock copy hides layout problems (length, wrapping, overflow). Real content reveals them. |
| "Color contrast is hard to test, skip it" | axe-core / Lighthouse / browser devtools run it in 5 seconds. Run it. |
| "Spinner works for loading, no need for skeleton" | Spinner blocks perceived speed. Skeleton shows the layout shape. |
| "Component is 250 lines, just one more prop" | >200 lines = split. "One more prop" compounds to 12 "one more props." |
| "img needs `aspect-ratio: 16/9` to reserve space" | Locking aspect-ratio breaks natural images. Use `width:100%; height:auto` and let the browser compute the height. |
| "div with onClick is faster than button" | div is not focusable, not announced, not keyboard-activatable. Use `<button>`. Always. |
| "ARIA role='button' replaces <button>" | ARIA supplements HTML, never replaces it. `<button>` is focusable, ARIA-button is not (without `tabindex` + handlers). |
| "Tailwind classes are fine inline, no need for tokens" | Tailwind config IS the token layer. `text-blue-500` outside the project palette is the same as `#3b82f6`. Both are magic values. |

## Red Flags — Stop and Start Over

- `<div onClick={...}>` or `<span onClick={...}>` for any interactive element
- `<img>` without `alt`, or `alt="image"` / `alt="photo"` (non-descriptive)
- Color used as the only indicator of state (red/green without text or icon)
- `padding: 13px` / `margin-top: 2.3rem` / any value not on the spacing scale
- Raw hex value (`#3b82f6`) inside a component file instead of a token
- Component > 200 lines, or > 8 props, or > 3 levels of prop drilling
- `aspect-ratio` or `padding-bottom` on `img` (locks the natural ratio; breaks on viewport change)
- `width: min(100%, 400px); padding-inline: 1rem` together on the same `img` (compound constraints distort the image)
- Missing loading / empty / error state in a container component
- Heading skip: `h1` → `h3` with no `h2`
- `role="button"` / `role="link"` on a real `<div>` / `<span>` (use the real element)
- Purple/indigo gradient on a hero with no real content
- `rounded-2xl` on every card (corner-radius must match the hierarchy in the design system)
- Stock placeholder copy: "Lorem ipsum" / "Welcome to our platform" / "Get started today"
- Focus not moved to dialog on open, or focus not restored on close
- No keyboard test before merge (Tab through the page is the test)