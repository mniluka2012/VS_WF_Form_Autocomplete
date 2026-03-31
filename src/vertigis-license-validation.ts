/**
 * vertigis-license-validation.ts
 *
 * Drop-in replacement for the Firebase-based TX() / MX() validation in your
 * VertiGIS Workflow activity pack. Replace your existing validateLicense /
 * checkExpiry block with this module.
 *
 * Usage:
 *   import { validateActivityPack } from "./vertigis-license-validation";
 *   const valid = await validateActivityPack("tsa-workflow-activities");
 *   if (!valid) return; // abort init
 */

const WORKER_URL = "https://vertigis-license-worker.mniluka.workers.dev";
const CACHE_TTL_HOURS = 24;

interface CachedValidation {
  appId: string;
  expiryDate: string;
  isExpired: boolean;
  cachedAt: string;
}

/** Read appId from ?app= or #app= URL param, persist to localStorage as fallback */
function resolveAppId(): string | null {
  try {
    if (typeof window === "undefined") return null;

    // 1. Check ?app= in query string
    const fromQuery = new URLSearchParams(window.location.search).get("app");
    // 2. Check #app= in hash fragment (VertiGIS Web designer uses this format)
    const hashParams = window.location.hash.includes("app=")
      ? new URLSearchParams(window.location.hash.replace(/^#/, ""))
      : null;
    const fromHash = hashParams?.get("app") ?? null;

    const fromUrl = fromQuery || fromHash;
    if (fromUrl) {
      try {
        localStorage.setItem("vertigis-workflow-appId", fromUrl);
      } catch {
        console.warn("[License] Failed to persist appId to localStorage");
      }
      return fromUrl;
    }

    // 3. Previously persisted value
    return localStorage.getItem("vertigis-workflow-appId") ?? null;
  } catch {
    return null;
  }
}

/** Check localStorage for a still-fresh cached result */
function getCachedResult(cacheKey: string): CachedValidation | null {
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    const cached: CachedValidation = JSON.parse(raw);
    const ageHours =
      (new Date().getTime() - new Date(cached.cachedAt).getTime()) / 3_600_000;
    if (ageHours < CACHE_TTL_HOURS) return cached;
  } catch {
    // ignore parse errors
  }
  return null;
}

/** Persist validation result to localStorage */
function setCachedResult(cacheKey: string, result: CachedValidation): void {
  try {
    localStorage.setItem(cacheKey, JSON.stringify(result));
  } catch {
    console.warn("[License] Failed to cache validation result");
  }
}

/**
 * Main validation function — call this during activity pack init.
 * @returns true if valid, false if invalid/expired/not found
 */
export async function validateActivityPack(): Promise<boolean> {
  const appId = resolveAppId();

  if (!appId) {
    console.error(
      "[License] appId not found in URL (?app=...) or localStorage. Activity pack cannot initialize."
    );
    return false;
  }

  const cacheKey = `vertigis-workflow-validation-${appId}`;

  // ── 1. Return cached result if still fresh ──────────────────────────────────
  const cached = getCachedResult(cacheKey);
  if (cached) {
    if (cached.isExpired) {
      console.error(`[License] Activity pack expired on ${cached.expiryDate} (cached).`);
      return false;
    }
    console.log(`[License] Valid until ${cached.expiryDate} (cached).`);
    return true;
  }

  // ── 2. Hit the Cloudflare Worker ────────────────────────────────────────────
  try {
    const response = await fetch(`${WORKER_URL}/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId }),
    });

    const data = (await response.json()) as {
      valid: boolean;
      expiryDate?: string;
      reason?: string;
    };

    if (data.valid && data.expiryDate) {
      const result: CachedValidation = {
        appId,
        expiryDate: data.expiryDate,
        isExpired: false,
        cachedAt: new Date().toISOString(),
      };
      setCachedResult(cacheKey, result);
      console.log(`[License] Activity pack valid until ${data.expiryDate}.`);
      return true;
    }

    // Cache negative result too (prevents hammering the worker on every load)
    if (data.reason === "expired" && data.expiryDate) {
      setCachedResult(cacheKey, {
        appId,
        expiryDate: data.expiryDate,
        isExpired: true,
        cachedAt: new Date().toISOString(),
      });
      console.error(`[License] Activity pack expired on ${data.expiryDate}.`);
    } else {
      console.error(`[License] Validation failed: ${data.reason ?? "unknown"}`);
    }

    return false;
  } catch (err) {
    // Network failure — fail open with a warning so a Worker outage doesn't
    // brick all active clients. Adjust to return false if you prefer strict mode.
    console.warn(
      "[License] Could not reach license server. Failing open (network error):",
      err
    );
    return true;
  }
}
