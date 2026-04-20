# VertiGIS Autocomplete — Custom Workflow Form Element

A theme‑aware Autocomplete for **VertiGIS Studio Workflow / Web**, built on **MUI's `useAutocomplete`**. It honors VertiGIS host CSS variables (with Calcite fallbacks), renders its dropdown above footers/overlays using Popper, and controls the input value internally to avoid MUI internal setter issues.

> **Element ID:** `Autocomplete`
> **Source:** [`src/elements/Autocomplete.tsx`](../src/elements/Autocomplete.tsx)

---

## Features

- **Controlled input** — avoids `setUaInputValue is not a function` runtime error.
- **Floating outlined label** — rests inside the input, floats into the top border on focus or when a value is present (MUI OutlinedInput style).
- **Single & multi‑select**, clearable, optional **free‑solo** text.
- **Sort order** — options can be sorted A→Z, Z→A, or left in original order.
- **Default label** — pre‑selects an option on load by string match; never overwrites an existing value.
- **Required state** — renders a `*` after the label when `require` is set by Workflow Designer.
- **Error state** — shows a red border, red label, and error message when the Workflow runtime sets `error` after form submission.
- Popup rendered with **MUI Popper** (portaled) so it stays above Workflow footers and overlays.
- **VertiGIS host token theming** — reads `--primaryBackground`, `--primaryAccent`, `--inputBorder`, etc. as first tier, with Calcite fallbacks. No hard‑coded colors.
- Selected items show a **✓ tick**.
- Full keyboard support (arrows, Enter/Space select, Esc close, optional Home/End).

---

## Quick Start

```bash
npm install
npm run build
```

Ensure `src/index.ts` re‑exports the element:

```ts
export { default as AutocompleteRegistration } from "./elements/Autocomplete";
```

Then add **Autocomplete** to a form in Workflow Designer and configure its properties.

---

## Props

*All props optional unless noted. Defaults shown where applicable.*

### Data

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `options` | `(string \| number)[]` | `[]` | Items shown in the list. |
| `value` | `string \| number \| (string\|number)[] \| null` | `null` | Current value — single or array when `multiple` is true. |
| `sortOrder` | `"asc" \| "desc" \| "none"` | `"none"` | Sort the options list. `"asc"` = A→Z, `"desc"` = Z→A, `"none"` = original order. |
| `defaultLabel` | `string` | — | Pre‑selects the option whose string value matches this on load. Ignored if a value is already set. |

### Behavior

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `multiple` | `boolean` | `false` | Enable multi‑select; renders chips for selected values. |
| `freeSolo` | `boolean` | `false` | Allow arbitrary text not present in `options`. |
| `openOnFocus` | `boolean` | `false` | Open the dropdown on input focus. |
| `clearable` | `boolean` | `true` | Show a clear (×) button. |
| `selectOnFocus` | `boolean` | MUI default | Select input text when focused. |
| `clearOnBlur` | `boolean` | MUI default | Clear input on blur if nothing is selected. |
| `handleHomeEndKeys` | `boolean` | MUI default | Home/End jump to first/last option when open. |
| `filterOptions` | `(options, state) => options` | MUI default | Custom filter function. |
| `getOptionDisabled` | `(option) => boolean` | — | Conditionally disable specific options. |
| `groupBy` | `(option) => string` | — | Optional group heading generator. |

### UX / Display

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string \| { markdown: string }` | `"Select…"` | Floating label. Accepts plain string or Workflow markdown object. |
| `placeholder` | `string \| { markdown: string }` | `""` | Fallback placeholder shown only when no `label` is set. |
| `helperText` | `string \| { markdown: string }` | `""` | Helper text below the field. Hidden when an error is present. |
| `autoFocus` | `boolean` | `false` | Autofocus the input on mount. |
| `readOnly` | `boolean` | `false` | Read‑only mode — input and clear button are disabled. |
| `disabled` | `boolean` | `false` | Full disabled state. |

### SDK‑provided props (from `FormElementProps`)

These are set by Workflow Designer or the runtime — do not redeclare them.

| Prop | Type | Description |
|------|------|-------------|
| `require` | `boolean` | Set by the **Required** toggle in Designer. Renders a red `*` after the label. |
| `error` | `Text \| undefined` | Set by the Workflow **runtime** after form submission failure. Drives red border/label/message. |

### Layout

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `listboxMaxHeight` | `number` | `220` | Max dropdown height in px. |
| `listboxWidth` | `number` | input width | Override dropdown width. |

---

## Events

Raised via `raiseEvent`:

| Event | Payload | When |
|-------|---------|------|
| `changed` | `{ value }` | Selection changes (including clear and default pre‑select). |
| `input` | `{ value: string }` | User types in the input. |
| `open` | `{ input: string }` | Dropdown opens. |
| `close` | `{ input: string }` | Dropdown closes. |
| `clear` | `{ value: null \| [] }` | Clear button is clicked. |

---

## Theming

The element resolves colors through a three‑tier cascade:

```
VertiGIS host variable  →  Calcite fallback  →  hardcoded default
```

### Token map

| Role | Token (first tier) | Calcite fallback |
|------|--------------------|-----------------|
| Field background | `--primaryBackground` | `--calcite-ui-foreground-1` |
| Disabled background | `--primaryBackgroundDisabled` | `--calcite-ui-foreground-3` |
| Elevated surface (chips) | `--secondaryBackground` | `--calcite-ui-foreground-2` |
| Input border (resting) | `--inputBorder` | `--primaryBorder` → `--calcite-ui-border-1` |
| Primary text | `--primaryForeground` | `--calcite-ui-text-1` |
| Muted text / helper | `--secondaryForeground` | `--calcite-ui-text-3` |
| Accent / focus ring | `--primaryAccent` | `--calcite-ui-brand` |
| Item hover background | `--itemHoverBackground` | `--calcite-ui-foreground-2` |
| Item selected background | `--itemSelectedBackground` | `--calcite-ui-foreground-2` |
| Border radius | `--border-radius-small` | `--calcite-border-radius` → `4px` |
| Dropdown shadow | — | `--calcite-shadow-1` |
| Dropdown z‑index | — | `--calcite-floating-ui-z-index` → `--calcite-app-z-index-dropdown` → `9999` |
| Error color | `--alertRedBackground` | `#d32f2f` |
| Font family | `--defaultFont` | `inherit` |

---

## Troubleshooting

**Popup renders behind a footer or overlay**
Popper portaling is enabled. If it still appears behind, raise `--calcite-floating-ui-z-index` or `--calcite-app-z-index-dropdown` in your app shell.

**Dropdown has no background / appears transparent**
Define `--primaryBackground` in your app theme.

**Error state appears on initial render before the user does anything**
This should not happen — error styling only activates when the Workflow runtime sets `props.error` (after form submission). Never compute required errors yourself.

**Default value keeps re‑applying after the user clears the field**
Ensure the options array passed to the element is stable (same reference). An unstable array causes the `defaultLabel` effect to re‑fire. If options come from a workflow expression that rebuilds the array each render, wrap it in a variable.

---

## License

MIT © Your Company / Contributors
