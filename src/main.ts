import { validateActivityPack } from "./vertigis-license-validation";

let mainResult: Promise<any> | undefined;

export async function main(): Promise<any> {
    if (mainResult) {
        return mainResult;
    }

    const valid = await validateActivityPack();
    if (!valid) {
        console.error("Activity pack validation failed. Activities will not load.");
        return {};
    }

    // Dynamic import to avoid circular dependency with index.ts
    const [autocomplete, dateTimeRangeList] = await Promise.all([
        import("./elements/Autocomplete"),
        import("./elements/DateTimeRangePicker"),
    ]);
    mainResult = Promise.resolve({
        AutocompleteRegistration: autocomplete.default,
        DateTimeRangeList: dateTimeRangeList.default,
    });
    return mainResult;
}
