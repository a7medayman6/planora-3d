import type { LengthUnit } from "../types";

const METERS_PER_FOOT = 0.3048;

/** Convert a length in meters to the given display unit. */
export function metersTo(unit: LengthUnit, meters: number): number {
  return unit === "ft" ? meters / METERS_PER_FOOT : meters;
}

/** Convert a length in the given display unit to meters. */
export function toMeters(unit: LengthUnit, value: number): number {
  return unit === "ft" ? value * METERS_PER_FOOT : value;
}

/** Format a length in meters for display, e.g. "3.45 m" or "11'4\"". */
export function formatLength(unit: LengthUnit, meters: number, precision = 2): string {
  if (unit === "m") {
    return `${meters.toFixed(precision)} m`;
  }
  const totalFeet = meters / METERS_PER_FOOT;
  const feet = Math.floor(totalFeet);
  const inches = Math.round((totalFeet - feet) * 12);
  if (inches === 12) {
    return `${feet + 1}'0"`;
  }
  return `${feet}'${inches}"`;
}

export function formatArea(unit: LengthUnit, squareMeters: number, precision = 2): string {
  if (unit === "m") {
    return `${squareMeters.toFixed(precision)} m²`;
  }
  const squareFeet = squareMeters / (METERS_PER_FOOT * METERS_PER_FOOT);
  return `${squareFeet.toFixed(precision)} ft²`;
}

/**
 * Parse a user-typed length string into meters. Accepts plain numbers
 * (interpreted in the current display unit), or explicit suffixes:
 * "3.5m", "3.5", "11ft", "11'4\"", "137in", "137\"".
 */
export function parseLength(input: string, currentUnit: LengthUnit): number | null {
  const trimmed = input.trim().toLowerCase().replace(/\s+/g, "");
  if (trimmed === "") return null;

  // feet + inches, e.g. 11'4" or 11'4
  const feetInches = trimmed.match(/^(\d+(?:\.\d+)?)'(\d+(?:\.\d+)?)?"?$/);
  if (feetInches) {
    const feet = parseFloat(feetInches[1]);
    const inches = feetInches[2] ? parseFloat(feetInches[2]) : 0;
    return (feet + inches / 12) * METERS_PER_FOOT;
  }

  const withUnit = trimmed.match(/^(\d+(?:\.\d+)?)(m|cm|mm|ft|in|")$/);
  if (withUnit) {
    const value = parseFloat(withUnit[1]);
    switch (withUnit[2]) {
      case "m":
        return value;
      case "cm":
        return value / 100;
      case "mm":
        return value / 1000;
      case "ft":
        return value * METERS_PER_FOOT;
      case "in":
      case '"':
        return (value / 12) * METERS_PER_FOOT;
    }
  }

  const plain = parseFloat(trimmed);
  if (!Number.isNaN(plain)) {
    return toMeters(currentUnit, plain);
  }

  return null;
}

/** Parse a user-typed angle string in degrees, e.g. "90", "90deg", "90°". */
export function parseAngle(input: string): number | null {
  const trimmed = input.trim().replace(/\s+/g, "").replace(/(deg|°)$/i, "");
  if (trimmed === "") return null;
  const value = parseFloat(trimmed);
  return Number.isNaN(value) ? null : value;
}
