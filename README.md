# VertiGIS Studio Workflow — Custom Form Elements

This repo contains a small library of **custom form elements** for VertiGIS Studio Workflow / Web. Each element is self‑contained and documented with its own README.

## Elements

* **Autocomplete** — theme‑aware, Popper‑based dropdown using MUI’s `useAutocomplete`. Floating outlined label, ✓ selection tick, multi‑select chips, sort order, default pre‑selection, required/error state, and full VertiGIS host token support.
  → See **[`docs/Autocomplete.md`](./docs/Autocomplete.md)**

* **DateTimeRangeList** — date range + time picker that generates a per‑day list of date/time entries. Built on MUI X Date Pickers Pro. Supports weekend exclusion, duplicate replacement, and item removal.

---

## Quick start

```bash
# install dependencies
npm install

# build the Workflow package
npm run build
```

By default this runs `vertigis-workflow-sdk build` and produces an optimized bundle.

### Exporting elements

`src/index.ts` re‑exports each element’s registration and the `main` init gate:

```ts
export { main } from "./main";
export { default as AutocompleteRegistration } from "./elements/Autocomplete";
export { default as DateTimeRangeList } from "./elements/DateTimeRangePicker";
```

---

## Using in VertiGIS Studio

1. Build the package.
2. Load the bundle into your VertiGIS Studio Web app (per your environment).
3. In Workflow Designer, add the element by its **id** (see the element README) and configure its props.

---

## Theming

All elements resolve colors through a three‑tier cascade — no hard‑coded hex values:

```
VertiGIS host variable  →  Calcite fallback  →  hardcoded default
```

**VertiGIS host variables (first tier)** — set automatically by VertiGIS Studio Web on the app shell:

* `--primaryBackground`, `--secondaryBackground`, `--primaryBackgroundDisabled`
* `--primaryForeground`, `--secondaryForeground`
* `--primaryAccent`
* `--primaryBorder`, `--inputBorder`
* `--itemHoverBackground`, `--itemSelectedBackground`
* `--alertRedBackground`
* `--defaultFont`, `--border-radius-small`

**Calcite fallbacks (second tier):**

* `--calcite-ui-foreground-1/2/3`, `--calcite-ui-text-1/3`
* `--calcite-ui-brand`, `--calcite-ui-border-1`
* `--calcite-border-radius`, `--calcite-shadow-1`
* `--calcite-floating-ui-z-index` → `--calcite-app-z-index-dropdown`

See each element’s `docs/` README for the exact token map it uses.

---

## Repo structure

```
src/
  elements/
    Autocomplete.tsx
    DateTimeRangePicker.tsx
  index.ts
  main.ts
  vertigis-license-validation.ts

docs/
  Autocomplete.md
```

---

## Contributing

PRs welcome. Keep styling token‑driven and avoid hard‑coded colors. When adding a new element, include a `docs/<ElementName>.md` describing props, events, theming tokens, and usage.

## License

MIT © Your Company / Contributors
