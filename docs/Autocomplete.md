# VertiGIS Autocomplete — Custom Workflow Form Element

A theme‑aware Autocomplete for **VertiGIS Studio Workflow / Web**, built on **MUI’s `useAutocomplete`**. It honors Calcite design tokens, renders its dropdown above footers/overlays using Popper, and avoids the `setUaInputValue` runtime by controlling the input value internally.

> **Element ID:** `Autocomplete`
> **Source:** [`src/elements/Autocomplete.tsx`](./src/elements/Autocomplete.tsx)

---

## Features

* **Controlled input** (no reliance on MUI internal setters) → fixes `setUaInputValue is not a function`.
* **Floating outlined label** — the label rests inside the input as placeholder text, then shrinks and floats into the top border when the field is focused or has a value (MUI outlined TextField style).
* **Single & multi‑select**, clearable, optional **free‑solo** text.
* Popup rendered with **MUI Popper** (portaled) so it **stays above** Workflow footers/overlays.
* **Calcite‑aware theming** (no hard‑coded colors).
* **Token‑driven backgrounds**:

  * Dropdown: `--primaryBackground` (with Calcite fallback)
  * Item hover: `--itemHoverBackground`
* Selected items show a **✓ tick**; list has **no bullets**.
* Keyboard support (arrows, Enter/Space select, Esc close, optional Home/End).

---

## Quick Start

```bash
# Install dependencies
npm install

# Build the Workflow package (optimized production build)
npm run build
```

Ensure your `src/index.ts` re‑exports the element (most templates already do this):

```ts
export { default as Autocomplete } from "./elements/Autocomplete";
```

Then add **Autocomplete** to a form in **VertiGIS Studio Workflow Designer** and configure its properties.

---

## Usage (example)

```tsx
import AutocompleteRegistration from "./elements/Autocomplete";

<AutocompleteRegistration.component
  label="Assets"
  options={["Bridge", "Road", "Tunnel"]}
  multiple
  openOnFocus
  clearable
  listboxMaxHeight={280}
  selectOnFocus
  handleHomeEndKeys
/>
```

---

## Props

*All props optional unless noted. Defaults shown where applicable.*

| Prop                | Type                                             |     Default | Description                                              |
| ------------------- | ------------------------------------------------ | ----------: | -------------------------------------------------------- |
| `options`           | `(string \| number)[]`                           |        `[]` | Items shown in the list.                                 |
| `value`             | `string \| number \| (string\|number)[] \| null` |      `null` | Current value (single or multi according to `multiple`). |
| `multiple`          | `boolean`                                        |     `false` | Enable multi‑select; renders chips for selected values.  |
| `freeSolo`          | `boolean`                                        |     `false` | Allow arbitrary text not present in `options`.           |
| `openOnFocus`       | `boolean`                                        |     `false` | Open the dropdown on input focus.                        |
| `clearable`         | `boolean`                                        |      `true` | Show a clear (×) button.                                 |
| `selectOnFocus`     | `boolean`                                        | MUI default | Select input text when focused.                          |
| `clearOnBlur`       | `boolean`                                        | MUI default | Clear input on blur if nothing selected.                 |
| `handleHomeEndKeys` | `boolean`                                        | MUI default | Home/End jump to first/last option when open.            |
| `placeholder`       | `string`                                         |        `""` | Fallback placeholder (shown only when no `label` is set).|
| `label`             | `string`                                         | `"Select…"` | Floating label — rests inside the input, floats into the top border on focus or when a value is present. |
| `helperText`        | `string`                                         |        `""` | Helper text below the field.                             |
| `autoFocus`         | `boolean`                                        |     `false` | Autofocus input on mount.                                |
| `readOnly`          | `boolean`                                        |     `false` | Read‑only mode.                                          |
| `disabled`          | `boolean`                                        |     `false` | Disabled state.                                          |
| `listboxMaxHeight`  | `number`                                         |       `220` | Max dropdown height in px.                               |
| `listboxWidth`      | `number`                                         | input width | Override dropdown width (defaults to input width).       |
| `filterOptions`     | `(options, state) => options`                    | MUI default | Custom filter function.                                  |
| `getOptionDisabled` | `(option) => boolean`                            |           — | Conditionally disable options.                           |
| `groupBy`           | `(option) => string`                             |           — | Optional group headers.                                  |

### Events (raised via `raiseEvent`)

* `input` → `{ value: string }` — when the user types
* `change` → `{ value: any }` — when selection changes
* `open` → `{ input: string }` — when the popup opens
* `close` → `{ input: string }` — when the popup closes
* `clear` → `{ value: null | [] }` — when the clear button is used

---

## Theming

The element reads Calcite tokens so it matches your app automatically. You can also tune two project‑level tokens.

### Calcite tokens used

* `--calcite-ui-brand` (focus ring)
* `--calcite-ui-border-input` (focused border)
* `--calcite-ui-foreground-1`, `--calcite-ui-foreground-2`, `--calcite-ui-foreground-3` (surfaces)
* `--calcite-ui-text-1`, `--calcite-ui-text-3` (text)
* `--calcite-floating-ui-z-index` → `--calcite-app-z-index-dropdown` (popup layering)

### Project tokens

* `--primaryBackground` → **dropdown background**
  Fallback: `--calcite-ui-foreground-2` → `--calcite-color-foreground-2` → `inherit`
* `--itemHoverBackground` → **row hover background**
  Fallback: `--calcite-ui-foreground-2` → `--calcite-color-foreground-2` → `inherit`

#### Example

```css
/* Light */
:root {
  --primaryBackground: var(--calcite-ui-foreground-2);
  --itemHoverBackground: var(--calcite-ui-foreground-2);
}
/* Dark */
.calcite-mode-dark {
  --primaryBackground: var(--calcite-ui-foreground-1);
  --itemHoverBackground: var(--calcite-ui-foreground-2);
}
```

---

## Troubleshooting

**Popup behind footer/overlay**
Popper + portal is enabled. If needed, raise `--calcite-floating-ui-z-index` or `--calcite-app-z-index-dropdown` in your app shell.

**Bullets appear next to items**
The listbox resets the `<ul>` defaults. If bullets persist, a global stylesheet is overriding them; increase specificity.

**Transparent dropdown**
Define `--primaryBackground` to your desired surface color.

**Hover not visible on selected item**
Hover takes precedence using `--itemHoverBackground`; ensure it contrasts with your selected color.

---

## Scripts

* `npm run build` → Production build via `vertigis-workflow-sdk build`

---

## License

MIT © Your Company / Contributors
