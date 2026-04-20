import * as React from "react";
import { FormElementProps, FormElementRegistration } from "@vertigis/workflow";
import useAutocomplete from "@mui/material/useAutocomplete";
import Popper from "@mui/material/Popper";

// Accept only a simple JSON array of primitives (string | number)
type Primitive = string | number;

type MaybeMarkdown = string | { markdown: string };

function unwrapString(value?: unknown): string | undefined {
    if (value == null) return undefined;
    const text = typeof value === "string" ? value : (value as any).markdown ?? String(value);
    return text.replace(/\\([\\`*_{}[\]()#+\-.!])/g, "$1");
}

function sortPrimitives(items: Primitive[], sort?: "asc" | "desc" | "none"): Primitive[] {
    if (!sort || sort === "none") return items;
    const sorted = [...items].sort((a, b) =>
        String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" })
    );
    return sort === "desc" ? sorted.reverse() : sorted;
}

interface AutocompleteProps extends FormElementProps<Primitive | Primitive[] | null> {
    /** The list of options as a simple JSON array of strings or numbers. */
    options?: Primitive[];

    // Behavior
    multiple?: boolean;
    freeSolo?: boolean;
    openOnFocus?: boolean;
    clearable?: boolean;
    /** Select input text when focused (see MUI Autocomplete). */
    selectOnFocus?: boolean;
    /** Clear input text on blur when nothing is selected (see MUI Autocomplete). */
    clearOnBlur?: boolean;
    /** Handle Home/End keys to jump to first/last option when popup is open. */
    handleHomeEndKeys?: boolean;

    // Optional helpers (passed through to the MUI hook)
    /** Custom filter; by default a case-insensitive substring match is used. */
    filterOptions?: (options: Primitive[], state: { inputValue: string }) => Primitive[];
    /** Disable specific options. */
    getOptionDisabled?: (option: Primitive) => boolean;
    /** Group header generator (optional). */
    groupBy?: (option: Primitive) => string | null | undefined;

    // UX
    placeholder?: MaybeMarkdown;
    label?: MaybeMarkdown;
    helperText?: MaybeMarkdown;
    autoFocus?: boolean;
    readOnly?: boolean;
    disabled?: boolean;

    /**
     * @displayName Sort Order
     * @description Sort the options list. "asc" = A→Z, "desc" = Z→A, "none" = original order.
     */
    sortOrder?: "asc" | "desc" | "none";
    /**
     * @displayName Default Label
     * @description Option value to pre-select on load. Only applied when no value is already set.
     */
    defaultLabel?: string;

    // Listbox sizing
    listboxMaxHeight?: number;
    listboxWidth?: number;

    // Styling passthroughs
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Autocomplete form element (MUI hook + VertiGIS/Calcite styling) that accepts a simple JSON array.
 * - Controlled input (no reliance on MUI internal setters)
 * - Outlined floating label that shrinks into the border on focus / when a value is present
 * - Transparent popup that inherits Calcite theme, with ✓ for selected items
 * - Popper/portal so the list renders above the form footer
 */
function Autocomplete(props: AutocompleteProps): React.ReactElement {
    const {
        // Workflow
        value,
        setValue,
        raiseEvent,
        disabled = false,
        require = false,
        error: errorProp,

        // Data
        options = [],

        // Behavior
        multiple = false,
        freeSolo = false,
        openOnFocus = false,
        clearable = true,
        selectOnFocus,
        clearOnBlur,
        handleHomeEndKeys,

        // Extras
        filterOptions,
        getOptionDisabled,
        groupBy,

        // UX
        placeholder: placeholderProp,
        label: labelProp,
        helperText: helperTextProp,
        autoFocus = false,
        readOnly = false,

        // Sorting / defaults
        sortOrder = "none",
        defaultLabel,

        // Layout
        listboxMaxHeight = 220,
        listboxWidth,

        // Styling
        className,
        style,
    } = props;

    const label = unwrapString(labelProp);
    const placeholder = unwrapString(placeholderProp) ?? "";
    const helperText = unwrapString(helperTextProp);
    const errorMessage = unwrapString(errorProp);
    const hasError = Boolean(errorMessage);

    const sortedOptions = React.useMemo(() => sortPrimitives(options, sortOrder), [options, sortOrder]);

    // ---- VertiGIS host tokens (first tier) → Calcite fallback → hardcoded ----
    const theme = {
        surface:         "var(--primaryBackground, var(--calcite-ui-foreground-1, #fff))",
        surfaceElevated: "var(--secondaryBackground, var(--calcite-ui-foreground-2, #f5f5f5))",
        disabledBg:      "var(--primaryBackgroundDisabled, var(--calcite-ui-foreground-3, #eee))",
        border:          "var(--primaryBorder, var(--calcite-ui-border-1, #ccc))",
        borderInput:     "var(--inputBorder, var(--primaryBorder, #ccc))",
        text:            "var(--primaryForeground, var(--calcite-ui-text-1, inherit))",
        textMuted:       "var(--secondaryForeground, var(--calcite-ui-text-3, #6a6a6a))",
        brand:           "var(--primaryAccent, var(--calcite-ui-brand, #007ac2))",
        hoverBg:         "var(--itemHoverBackground, var(--calcite-ui-foreground-2, rgba(0,0,0,0.06)))",
        selectedBg:      "var(--itemSelectedBackground, var(--calcite-ui-foreground-2, rgba(0,0,0,0.04)))",
        radius:          "var(--border-radius-small, var(--calcite-border-radius, 4px))",
        shadow:          "var(--calcite-shadow-1, 0 8px 24px rgba(0,0,0,0.08))",
    } as const;

    // Unified event emitter
    const emit = React.useCallback((name: string, payload?: any) => {
        (raiseEvent as any)?.(name as any, payload as any);
    }, [raiseEvent]);

    // Pre-select by value string when defaultLabel is set and no value is currently stored.
    React.useEffect(() => {
        if (!defaultLabel || value != null) return;
        const match = sortedOptions.find(
            o => String(o).localeCompare(defaultLabel, undefined, { sensitivity: "base" }) === 0
        );
        if (match != null) {
            const out = multiple ? [match] : match;
            setValue(out as any);
            emit("changed", { value: out });
        }
    }, [defaultLabel, sortedOptions]); // eslint-disable-line react-hooks/exhaustive-deps

    // Controlled value mapping for the hook
    const hookValue = React.useMemo(() => {
        if (multiple) {
            if (Array.isArray(value)) return value as Primitive[];
            if (value == null) return [] as Primitive[];
            return [value as Primitive];
        }
        return Array.isArray(value) ? ((value[0] as Primitive) ?? null) : (value as Primitive | null);
    }, [value, multiple]);

    // We control popup open state so clicks always open
    const [open, setOpen] = React.useState<boolean>(false);

    // track hover to support custom hover background token
    const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

    // control the input value ourselves to avoid depending on MUI's setInputValue
    const [input, setInput] = React.useState<string>("");

    // local refs for Popper anchoring + themed container
    const [anchorEl, setAnchorElLocal] = React.useState<HTMLElement | null>(null);
    const [portalContainer, setPortalContainer] = React.useState<HTMLElement | null>(null);

    React.useEffect(() => {
        if (!anchorEl) return;
        // Find the nearest ancestor that defines Calcite CSS vars so the Popper inherits theme colors
        let el: HTMLElement | null = anchorEl;
        const doc = el.ownerDocument;
        let found: HTMLElement | null = null;
        while (el) {
            const cs = doc.defaultView?.getComputedStyle(el);
            const fg = cs?.getPropertyValue("--primaryBackground") || cs?.getPropertyValue("--calcite-ui-foreground-1") || cs?.getPropertyValue("--calcite-color-foreground-1");
            if (fg && fg.trim() !== "") { found = el; break; }
            el = el.parentElement as HTMLElement | null;
        }
        setPortalContainer(found ?? doc.body);
    }, [anchorEl]);

    const {
        getRootProps,
        getInputProps,
        getListboxProps,
        getOptionProps,
        getTagProps,
        groupedOptions,
        value: uaValue,
        focused,
        setAnchorEl,
    } = (useAutocomplete as any)({
        multiple,
        freeSolo,
        options: sortedOptions,
        getOptionLabel: (o: Primitive) => String(o),
        filterOptions: filterOptions as any,
        groupBy: groupBy as any,
        value: hookValue as any,
        inputValue: input,
        onChange: (_e: any, newVal: any) => {
            const out = multiple ? (newVal as Primitive[]) : ((newVal as Primitive) ?? null);
            setValue(out as any);
            emit("change", { value: out });
            setInput("");
        },
        onInputChange: (_e: any, newInput: string) => {
            setInput(newInput);
            emit("input", { value: newInput });
        },
        open,
        onOpen: () => { setOpen(true); emit("open", { input }); },
        onClose: () => { setOpen(false); emit("close", { input }); },
        disabled,
        readOnly,
        // Keyboard/UX flags
        selectOnFocus,
        clearOnBlur,
        handleHomeEndKeys,
    });

    const onClickInput = () => {
        if (!disabled && !readOnly) setOpen(true);
    };

    const inputProps = getInputProps();
    const readOnlyOrDisabled = disabled || readOnly;

    // Floating label state: shrink when focused, has typed text, or has a selected value
    const hasValue = multiple
        ? Array.isArray(uaValue) && (uaValue as Primitive[]).length > 0
        : uaValue != null && uaValue !== "";
    const labelShrunk = focused || hasValue || input.length > 0;

    // Match popup width to field, if not provided via prop
    const computedListboxWidth = listboxWidth ?? anchorEl?.clientWidth;

    // ---- Resolve background for the label notch ----
    // CSS variables can't be read synchronously, so we read the computed value from the
    // anchor element to produce a concrete background-color for the label's notch gap.
    const [resolvedSurface, setResolvedSurface] = React.useState<string>("#fff");
    React.useEffect(() => {
        if (!anchorEl) return;
        const cs = anchorEl.ownerDocument.defaultView?.getComputedStyle(anchorEl);
        if (cs) {
            const bg = cs.backgroundColor;
            if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
                setResolvedSurface(bg);
            }
        }
    }, [anchorEl, disabled]);

    return (
        <div {...getRootProps()} className={className} style={{ position: "relative", fontFamily: "inherit", color: theme.text, ...style }} aria-disabled={readOnlyOrDisabled}>
            {/* Fieldset + legend technique for the outlined notch (same as MUI OutlinedInput) */}
            <div
                ref={(el) => {
                    (setAnchorEl as any)?.(el);
                    setAnchorElLocal(el as HTMLElement | null);
                }}
                style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 4,
                    border: `1px solid ${focused ? theme.brand : hasError ? "var(--alertRedBackground, #d32f2f)" : theme.borderInput}`,
                    borderRadius: theme.radius as any,
                    padding: label ? "18px 10px 6px" : "8px 10px",
                    background: disabled ? theme.disabledBg : theme.surface,
                    outline: focused ? `1px solid ${theme.brand}` : hasError ? `1px solid var(--alertRedBackground, #d32f2f)` : "none",
                    transition: "border-color 120ms ease, outline 120ms ease",
                }}
            >
                {/* Floating label */}
                {label && (
                    <span
                        style={{
                            position: "absolute",
                            left: 8,
                            // Resting: vertically centered; shrunk: on the border
                            top: labelShrunk ? 0 : "50%",
                            transform: labelShrunk ? "translateY(-50%) scale(0.85)" : "translateY(-50%) scale(1)",
                            transformOrigin: "left center",
                            fontSize: 14,
                            lineHeight: "1",
                            color: focused ? theme.brand : hasError ? "var(--alertRedBackground, #d32f2f)" : theme.textMuted,
                            pointerEvents: "none",
                            // The notch: a background strip that hides the border behind the label text
                            backgroundColor: labelShrunk ? resolvedSurface : "transparent",
                            padding: labelShrunk ? "0 4px" : "0",
                            zIndex: 1,
                            transition: "top 150ms ease, transform 150ms ease, color 150ms ease, background-color 150ms ease, padding 150ms ease",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {label}
                        {require && (
                            <span style={{ color: "var(--alertRedBackground, #d32f2f)", marginLeft: 2 }} aria-hidden="true">*</span>
                        )}
                    </span>
                )}

                {/* Multi-select chips */}
                {multiple && Array.isArray(uaValue) && uaValue.length > 0 &&
                    (uaValue as Primitive[]).map((opt: Primitive, index: number) => {
                        const { key, ...tagProps } = (getTagProps as any)({ index });
                        return (
                            <span key={key} {...tagProps} style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                borderRadius: 999,
                                border: `1px solid ${theme.border}`,
                                padding: "2px 8px",
                                fontSize: 12,
                                background: theme.surfaceElevated,
                                color: theme.text,
                            }}>
                                {String(opt)}
                                {!readOnlyOrDisabled && (
                                    <button
                                        type="button"
                                        style={{
                                            cursor: "pointer",
                                            border: "none",
                                            background: "transparent",
                                            fontSize: 14,
                                            lineHeight: 1,
                                            color: theme.textMuted,
                                            padding: 0,
                                        }}
                                        onClick={tagProps.onDelete}
                                        aria-label={`Remove ${String(opt)}`}
                                        title={`Remove ${String(opt)}`}
                                    >
                                        ×
                                    </button>
                                )}
                            </span>
                        );
                    })}

                <input
                    {...inputProps}
                    style={{
                        flex: 1,
                        border: "none",
                        outline: "none",
                        background: "transparent",
                        fontSize: 14,
                        padding: 0,
                        minWidth: 60,
                        color: theme.text,
                        fontFamily: "inherit",
                    }}
                    placeholder={!label ? placeholder : ""}
                    disabled={readOnlyOrDisabled}
                    autoFocus={autoFocus}
                    value={input}
                    onChange={(e) => {
                        inputProps.onChange?.(e as any);
                        setInput((e.target as HTMLInputElement).value);
                    }}
                    onFocus={(e) => {
                        inputProps.onFocus?.(e);
                        if (openOnFocus && !open) setOpen(true);
                    }}
                    onClick={(e) => {
                        (inputProps as any).onClick?.(e);
                        onClickInput();
                    }}
                />

                {clearable && !readOnlyOrDisabled && (
                    <button
                        type="button"
                        title="Clear"
                        aria-label="Clear"
                        onClick={() => {
                            const cleared = multiple ? [] : null;
                            setValue(cleared as any);
                            setInput("");
                            emit("clear", { value: cleared });
                            emit("change", { value: cleared });
                        }}
                        style={{ border: "none", background: "transparent", fontSize: 16, cursor: "pointer", color: theme.textMuted, padding: 0 }}
                    >
                        ×
                    </button>
                )}
            </div>

            <Popper
                open={open && (groupedOptions as Primitive[]).length > 0}
                anchorEl={anchorEl}
                container={portalContainer}
                placement="bottom-start"
                disablePortal={false}
                style={{ zIndex: "var(--calcite-floating-ui-z-index, var(--calcite-app-z-index-dropdown, 9999))" }}
            >
                <ul {...getListboxProps()} style={{
                    zIndex: 1,
                    maxHeight: listboxMaxHeight,
                    overflow: "auto",
                    background: theme.surface,
                    border: `1px solid ${theme.border}`,
                    borderRadius: theme.radius as any,
                    boxShadow: theme.shadow as any,
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    width: computedListboxWidth,
                }} role="listbox">
                    {(groupedOptions as Primitive[]).map((opt, index) => {
                        const { key, ...optionProps } = getOptionProps({ option: opt, index });
                        const disabledOpt = getOptionDisabled?.(opt) ?? false;
                        const selected = multiple
                            ? (Array.isArray(uaValue) && (uaValue as Primitive[]).includes(opt))
                            : (uaValue === opt);
                        return (
                            <li
                                key={key}
                                {...optionProps}
                                onMouseEnter={(e) => { (optionProps as any).onMouseEnter?.(e); (optionProps as any).onMouseOver?.(e); setHoveredIndex(index); }}
                                onMouseLeave={(e) => { (optionProps as any).onMouseLeave?.(e); setHoveredIndex((prev) => (prev === index ? null : prev)); }}
                                style={{
                                    padding: "8px 10px",
                                    cursor: disabledOpt ? "not-allowed" : "pointer",
                                    color: disabledOpt ? theme.textMuted : theme.text,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    background:
                                        hoveredIndex === index
                                            ? theme.hoverBg
                                            : selected ? theme.selectedBg : undefined,
                                }}
                                aria-disabled={disabledOpt}
                                aria-selected={selected}
                            >
                                <span style={{ width: 16, display: "inline-block", textAlign: "center", opacity: selected ? 1 : 0 }}>✓</span>
                                <span>{String(opt)}</span>
                            </li>
                        );
                    })}
                </ul>
            </Popper>

            {hasError && (
                <div style={{ marginTop: 4, fontSize: 12, color: "var(--alertRedBackground, #d32f2f)", fontFamily: "var(--defaultFont, inherit)" }}>
                    {errorMessage}
                </div>
            )}
            {!hasError && helperText && (
                <div style={{ marginTop: 4, fontSize: 12, color: theme.textMuted }}>{helperText}</div>
            )}
        </div>
    );
}

const AutocompleteElementRegistration: FormElementRegistration<AutocompleteProps> = {
    component: Autocomplete,
    getInitialProperties: () => ({
        value: null,
        options: [],

        multiple: false,
        freeSolo: false,
        placeholder: "",
        openOnFocus: false,
        clearable: true,

        label: "Select\u2026",
        helperText: "",
        autoFocus: false,
        readOnly: false,
        sortOrder: "none",
        listboxMaxHeight: 220,
    }),
    id: "Autocomplete",
};

export default AutocompleteElementRegistration;
