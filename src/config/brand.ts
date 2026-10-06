/**
 * Central brand configuration.
 *
 * This is the single place to rebrand the application:
 * swap `appName`, `tagline`, and the palette below, then
 * update the matching CSS variables in `src/app/globals.css`.
 *
 * Keep values here in sync with `globals.css` — JS values are
 * used for metadata, emails, and anything that runs outside CSS.
 */
export const brand = {
  /** Display name used in metadata, headers, and emails. */
  appName: "Nexus Market",
  /** Short tagline for the storefront. */
  tagline: "A curated multi-vendor marketplace",
  /** Domain origin without trailing slash. */
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",

  palette: {
    /** Primary brand color — deep indigo. */
    primary: "#3B2FD9",
    /** Primary color when used as text/background on dark surfaces. */
    primaryLight: "#6D66E8",
    /** Subtle secondary accent — muted teal. */
    accent: "#0D9488",
    /** Neutral surface (page background). */
    background: "#FFFFFF",
    /** Foreground / body text on light surfaces. */
    foreground: "#111827",
  },
} as const;

export type Brand = typeof brand;
