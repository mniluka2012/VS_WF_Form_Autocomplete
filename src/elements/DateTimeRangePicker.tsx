// ==============================================
// File: src/elements/DateTimeRangePicker.tsx
// Description: VertiGIS Workflow custom form element that combines a
// MUI Date Range Picker and Time Pickers to generate a per-day list
// of date/time entries with weekend exclusion and item removal.
//
// Pattern: default-export a FormElementRegistration so activitypack.json
// is updated automatically by the VertiGIS builder.
// ==============================================

import * as React from "react";
import { useCallback, useMemo, useState } from "react";
import { FormElementProps, FormElementRegistration } from "@vertigis/workflow";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EventIcon from "@mui/icons-material/Event";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateRangePicker } from "@mui/x-date-pickers-pro/DateRangePicker";
import type { DateRange } from "@mui/x-date-pickers-pro/models"; // v6 & v7 safe

import dayjs, { Dayjs } from "dayjs";

// ------------------------------
// Types & helpers
// ------------------------------
export type DateTimeEntry = {
    /** Local date (YYYY-MM-DD) */
    date: string;
    /** Local 24h times */
    start: string; // HH:mm
    end: string;   // HH:mm
    /** UTC ISO timestamps derived from local date+time */
    startDateTimeUtc: string;
    endDateTimeUtc: string;
};

interface DateTimeRangeListProps extends FormElementProps<DateTimeEntry[]> {
    // UX/config
    label?: string;
    helperText?: string;
    defaultExcludeWeekends?: boolean;
    timeStepMinutes?: number; // default 15
    minDate?: string; // YYYY-MM-DD
    maxDate?: string; // YYYY-MM-DD
    listDateFormat?: string; // default: "YYYY-MM-DD (ddd)"
    listTimeFormat?: string; // default: "HH:mm"
    replaceDuplicateDates?: boolean; // default: true

    // Common Workflow-provided props used in this component
    disabled?: boolean;
    readOnly?: boolean;
    className?: string;
    style?: React.CSSProperties;
    errors?: string[] | string | null;
}

function toArray<T>(v: unknown): T[] { return Array.isArray(v) ? (v as T[]) : []; }
function normalizeErrors(errors?: string[] | string | null): string | undefined {
    if (!errors) return undefined; return Array.isArray(errors) ? errors.filter(Boolean).join(". ") : String(errors);
}
function isWeekend(d: Dayjs) { const wd = d.day(); return wd === 0 || wd === 6; }
function eachDayInclusive(start: Dayjs, end: Dayjs): Dayjs[] {
    const days: Dayjs[] = []; let cur = start.startOf("day"); const last = end.startOf("day");
    while (cur.isBefore(last) || cur.isSame(last)) { days.push(cur); cur = cur.add(1, "day"); }
    return days;
}
function toEntry(d: Dayjs, startTime: Dayjs, endTime: Dayjs): DateTimeEntry {
    const s = d.hour(startTime.hour()).minute(startTime.minute()).second(0).millisecond(0);
    const e = d.hour(endTime.hour()).minute(endTime.minute()).second(0).millisecond(0);
    return {
        date: d.format("YYYY-MM-DD"),
        start: startTime.format("HH:mm"),
        end: endTime.format("HH:mm"),
        startDateTimeUtc: s.toDate().toISOString(),
        endDateTimeUtc: e.toDate().toISOString(),
    };
}
function sortEntries(a: DateTimeEntry, b: DateTimeEntry) { if (a.date === b.date) return a.start.localeCompare(b.start); return a.date.localeCompare(b.date); }

// ------------------------------
// Component
// ------------------------------
function DateTimeRangeList(props: DateTimeRangeListProps): React.ReactElement {
    const {
        value,
        setValue,
        errors,
        disabled = false,
        readOnly = false,
        label = "Date & Time Range",
        helperText,
        defaultExcludeWeekends = false,
        timeStepMinutes = 15,
        minDate,
        maxDate,
        listDateFormat = "YYYY-MM-DD (ddd)",
        listTimeFormat = "HH:mm",
        replaceDuplicateDates = true,
        className,
        style,
    } = props;

    const entries = useMemo<DateTimeEntry[]>(() => toArray<DateTimeEntry>(value).slice().sort(sortEntries), [value]);

    const [range, setRange] = useState<DateRange<Dayjs>>([null, null]);
    const [startTime, setStartTime] = useState<Dayjs>(dayjs().hour(9).minute(0).second(0).millisecond(0));
    const [endTime, setEndTime] = useState<Dayjs>(dayjs().hour(17).minute(0).second(0).millisecond(0));
    const [skipWeekends, setSkipWeekends] = useState<boolean>(defaultExcludeWeekends);

    const modelError = normalizeErrors(errors);
    const timeOrderInvalid = useMemo(
        () => !readOnly && !disabled && !startTime.isBefore(endTime), // start >= end is invalid
        [startTime, endTime, readOnly, disabled]
    );

    const applyAdd = useCallback(() => {
        if (!range[0] || !range[1] || timeOrderInvalid) return;
        const days = eachDayInclusive(range[0], range[1]).filter((d) => !(skipWeekends && isWeekend(d)));
        if (days.length === 0) return;

        const next = [...entries];
        const indexByDate = new Map(next.map((e, i) => [e.date, i] as const));
        for (const d of days) {
            const entry = toEntry(d, startTime, endTime);
            if (indexByDate.has(entry.date)) { if (replaceDuplicateDates) next[indexByDate.get(entry.date)!] = entry; }
            else { next.push(entry); }
        }
        next.sort(sortEntries);
        setValue(next);
    }, [range, timeOrderInvalid, skipWeekends, entries, startTime, endTime, replaceDuplicateDates, setValue]);

    const removeAt = useCallback((idx: number) => {
        const next = entries.slice(); next.splice(idx, 1); setValue(next);
    }, [entries, setValue]);

    const minD = minDate ? dayjs(minDate) : undefined;
    const maxD = maxDate ? dayjs(maxDate) : undefined;
    const allDisabled = !!disabled || !!readOnly;

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box className={className} style={style} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <EventIcon fontSize="small" />
                    <Typography variant="subtitle1">{label}</Typography>
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
                    <DateRangePicker
                        disabled={allDisabled}
                        value={range}
                        minDate={minD}
                        maxDate={maxD}
                        onChange={(newRange) => setRange(newRange)}
                        slots={{ textField: TextField }}
                        slotProps={{ textField: { size: "small" } }}
                    />
                    <TimePicker label="Start time" disabled={allDisabled} value={startTime} onChange={(v) => v && setStartTime(v)} minutesStep={timeStepMinutes} ampm={false} slotProps={{ textField: { size: "small" } }} />
                    <TimePicker label="End time" disabled={allDisabled} value={endTime} onChange={(v) => v && setEndTime(v)} minutesStep={timeStepMinutes} ampm={false} slotProps={{ textField: { size: "small" } }} />
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
                    <FormControlLabel control={<Checkbox checked={skipWeekends} onChange={(e) => setSkipWeekends(e.target.checked)} disabled={allDisabled} />} label="Exclude weekends (Sat/Sun)" />
                    <Box sx={{ flexGrow: 1 }} />
                    <Button variant="contained" onClick={applyAdd} disabled={allDisabled || !range[0] || !range[1] || timeOrderInvalid}>Add dates to list</Button>
                </Stack>

                {helperText && !modelError && !timeOrderInvalid && (
                    <Typography variant="body2" color="text.secondary">{helperText}</Typography>
                )}
                {timeOrderInvalid && <Alert severity="error">Start time must be earlier than end time.</Alert>}
                {modelError && <Alert severity="error">{modelError}</Alert>}

                <Divider />

                <Typography variant="subtitle2">Selected date/time entries</Typography>
                <List dense disablePadding sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 1 }}>
                    {entries.length === 0 && (
                        <ListItem>
                            <ListItemText primary={"No entries yet. Choose a date range and times, then click \"Add dates to list\"."} />
                        </ListItem>
                    )}
                    {entries.map((e, idx) => {
                        const d = dayjs(e.date);
                        // Use ASCII-only characters to avoid any parser complaints in some toolchains
                        const primary = `${d.format(listDateFormat)} - ${e.start} -> ${e.end}`;
                        const secondary = `UTC: ${e.startDateTimeUtc} -> ${e.endDateTimeUtc}`;
                        return (
                            <ListItem key={`${e.date}-${e.start}-${e.end}-${idx}`}
                                      secondaryAction={!allDisabled && (
                                          <IconButton edge="end" aria-label="delete" onClick={() => removeAt(idx)}>
                                              <DeleteOutlineIcon />
                                          </IconButton>
                                      )}
                            >
                                <ListItemText primary={primary} secondary={secondary} />
                            </ListItem>
                        );
                    })}
                </List>
            </Box>
        </LocalizationProvider>
    );
}

const DateTimeRangeListRegistration: FormElementRegistration<DateTimeRangeListProps> = {
    component: DateTimeRangeList,
    id: "DateTimeRangeList",
    getInitialProperties: () => ({
        value: [],
        label: "Date & Time Range",
        helperText: "Choose a date span and hours, then add to the list.",
        defaultExcludeWeekends: false,
        timeStepMinutes: 15,
        listDateFormat: "YYYY-MM-DD (ddd)",
        listTimeFormat: "HH:mm",
        replaceDuplicateDates: true,
    }),
};

export default DateTimeRangeListRegistration;
