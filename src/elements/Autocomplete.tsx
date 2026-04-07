import * as React from "react";
import { FormElementProps, FormElementRegistration } from "@vertigis/workflow";
import useAutocomplete from "@mui/material/useAutocomplete";
import Popper from "@mui/material/Popper";

// Accept only a simple JSON array of primitives (string | number)
type Primitive = string | number;

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
    placeholder?: string;
    label?: string;
    helperText?: string;
    autoFocus?: boolean;
    readOnly?: boolean;
    disabled?: boolean;

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
        placeholder = "",
        label,
        helperText,
        autoFocus = false,
        readOnly = false,

        // Layout
        listboxMaxHeight = 220,
        listboxWidth,

        // Styling
        className,
        style,
    } = props;

    // ---- Calcite/VertiGIS tokens (favor host variables; minimal fallbacks) ----
    const theme = {
        surface: "var(--calcite-ui-foreground-1, var(--calcite-color-foreground-1, inherit))",
        surfaceElevated: "var(--calcite-ui-foreground-2, var(--calcite-color-foreground-2, inherit))",
        border: "var(--calcite-ui-border-1, var(--calcite-color-border-1, currentColor))",
        borderInput: "var(--calcite-ui-border-input, var(--calcite-ui-border-1, currentColor))",
        text: "var(--calcite-ui-text-1, var(--calcite-color-text-1, inherit))",
        textMuted: "var(--calcite-ui-text-3, var(--calcite-color-text-3, inherit))",
        brand: "var(--calcite-ui-brand, var(--calcite-color-brand, currentColor))",
        focusOffset: "var(--calcite-ui-focus-offset-invert, 0)",
        radius: "var(--calcite-border-radius, 8px)",
        shadow: "var(--calcite-shadow-1, 0 8px 24px rgba(0,0,0,0.08))",
        zIndexDropdown: "var(--calcite-floating-ui-z-index, var(--calcite-app-z-index-dropdown, 9999))",
    } as const;

    // Determine whether the floating label should be in the "shrunk" (floated) position
    const hasValue = multiple
        ? Array.isArray(value) && (value as Primitive[]).length > 0
        : value != null && value !== "";

    const styles: Record<string, React.CSSProperties> = {
        root: { position: "relative", fontFamily: "inherit", color: theme.text },
        inputWrap: {
            position: "relative",
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radius as any,
            padding: "16.5px 14px 8.5px",
            background: disabled ? "var(--calcite-ui-foreground-3, var(--calcite-color-foreground-3, inherit))" : theme.surface,
            outline: `2px solid transparent`,
            transition: "outline 120ms ease, background 120ms ease, border-color 120ms ease",
        },
        inputWrapFocused: {
            outline: `2px solid ${theme.brand}`,
            outlineOffset: theme.focusOffset as any,
            border: `1px solid ${theme.borderInput}`,
        },
        floatingLabel: {
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 14,
            color: theme.textMuted,
            pointerEvents: "none",
            transition: "transform 150ms ease, font-size 150ms ease, top 150ms ease, color 150ms ease, background 150ms ease, padding 150ms ease",
            lineHeight: 1,
            zIndex: 1,
            padding: "0 4px",
            background: "transparent",
        },
        floatingLabelShrunk: {
            top: 0,
            transform: "translateY(-50%)",
            fontSize: 12,
            background: disabled ? "var(--calcite-ui-foreground-3, var(--calcite-color-foreground-3, inherit))" : theme.surface,
        },
        floatingLabelFocused: {
            color: theme.brand,
        },
        input: {
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 14,
            padding: 0,
            minWidth: 60,
            color: theme.text,
        },
        clearBtn: { border: "none", background: "transparent", fontSize: 16, cursor: "pointer", color: theme.textMuted },
        listbox: {
            zIndex: 1,
            maxHeight: listboxMaxHeight,
            overflow: "auto",
            background: "var(--primaryBackground, var(--calcite-ui-foreground-2, var(--calcite-color-foreground-2, inherit)))",
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radius as any,
            boxShadow: theme.shadow as any,
            listStyle: "none",
            padding: 0,
            margin: 0,
        },
        option: { padding: "8px 10px", cursor: "pointer", color: theme.text, display: "flex", alignItems: "center", gap: 8 },
        optionDisabled: { padding: "8px 10px", color: theme.textMuted, cursor: "not-allowed", display: "flex", alignItems: "center", gap: 8 },
        helper: { marginTop: 4, fontSize: 12, color: theme.textMuted },
        tag: {
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            borderRadius: 999,
            border: `1px solid ${theme.border}`,
            padding: "2px 8px",
            fontSize: 12,
            background: "var(--calcite-ui-foreground-2, var(--calcite-color-foreground-2, inherit))",
            color: theme.text,
            marginRight: 6,
            marginBottom: 6,
        },
        tagBtn: { cursor: "pointer", border: "none", background: "transparent", fontSize: 14, lineHeight: 1, color: theme.textMuted },
        check: { width: 16, display: "inline-block", textAlign: "center" },
    };

    // Unified event emitter
    const emit = React.useCallback((name: string, payload?: any) => {
        (raiseEvent as any)?.(name as any, payload as any);
    }, [raiseEvent]);

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
            const fg = cs?.getPropertyValue("--calcite-ui-foreground-1") || cs?.getPropertyValue("--calcite-color-foreground-1");
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
        options,
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
    const labelShrunk = focused || hasValue || input.length > 0;

    // Match popup width to field, if not provided via prop
    const computedListboxWidth = listboxWidth ?? anchorEl?.clientWidth;

    return (
        <div {...getRootProps()} className={className} style={{ ...styles.root, ...style }} aria-disabled={readOnlyOrDisabled}>
            <div
                ref={(el) => {
                    (setAnchorEl as any)?.(el);
                    setAnchorElLocal(el as HTMLElement | null);
                }}
                style={{ ...styles.inputWrap, ...(focused ? styles.inputWrapFocused : {}) }}
            >
                {label && (
                    <label
                        style={{
                            ...styles.floatingLabel,
                            ...(labelShrunk ? styles.floatingLabelShrunk : {}),
                            ...(focused ? styles.floatingLabelFocused : {}),
                        }}
                    >
                        {label}
                    </label>
                )}

                {multiple && Array.isArray(uaValue) && uaValue.length > 0 &&
                    (uaValue as Primitive[]).map((opt: Primitive, index: number) => {
                        const { key, ...tagProps } = (getTagProps as any)({ index });
                        return (
                            <span key={key} {...tagProps} style={styles.tag}>
                {String(opt)}
                                {!readOnlyOrDisabled && (
                                    <button
                                        type="button"
                                        style={styles.tagBtn}
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
                    style={styles.input}
                    placeholder={labelShrunk && !label ? placeholder : labelShrunk ? "" : ""}
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
                        style={styles.clearBtn}
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
                <ul {...getListboxProps()} style={{ ...styles.listbox, width: computedListboxWidth }} role="listbox">
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
                                    ...(disabledOpt ? styles.optionDisabled : styles.option),
                                    background:
                                        hoveredIndex === index
                                            ? "var(--itemHoverBackground, var(--calcite-ui-foreground-2, var(--calcite-color-foreground-2, inherit)))"
                                            : (selected
                                                ? "var(--calcite-ui-foreground-2, var(--calcite-color-foreground-2, inherit))"
                                                : undefined),

                                }}
                                aria-disabled={disabledOpt}
                                aria-selected={selected}
                            >
                                <span style={{ ...styles.check, opacity: selected ? 1 : 0 }}>✓</span>
                                <span>{String(opt)}</span>
                            </li>
                        );
                    })}
                </ul>
            </Popper>

            {helperText && <div style={styles.helper}>{helperText}</div>}
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
        listboxMaxHeight: 220,
    }),
    id: "Autocomplete",
};

export default AutocompleteElementRegistration;
