/**
 * config/theme.ts — single source of truth for design tokens (CLAUDE.md §10).
 *
 * Every color, font, spacing step, radius, and shadow the app uses is declared
 * here as a typed object. These values are mirrored into `app/globals.css` as
 * CSS custom properties (`--background`, `--primary`, `--font-heading`, ...),
 * and Tailwind v4 exposes them as utilities via the `@theme inline` block in
 * that same file. No component ever hardcodes a color/font/spacing value — if a
 * value is missing, add it here first, then wire the CSS var, then use it.
 *
 * Tailwind v4 note: v4 has no `tailwind.config.ts` and cannot import this TS
 * file at build time, so `globals.css` is the hand-mirrored runtime copy of
 * these tokens. Keep the two in sync — see `docs/architecture/theming.md`.
 * Placeholder values below (neutral shadcn palette) are meant to be swapped
 * per-fork.
 *
 * Colors are stored as raw CSS color strings (oklch) so light/dark are just two
 * value sets for the same token name; the `.dark` class swaps them.
 */

export interface ColorToken {
  light: string;
  dark: string;
}

export interface ThemeColors {
  background: ColorToken;
  foreground: ColorToken;
  primary: ColorToken;
  primaryForeground: ColorToken;
  secondary: ColorToken;
  secondaryForeground: ColorToken;
  muted: ColorToken;
  mutedForeground: ColorToken;
  destructive: ColorToken;
  destructiveForeground: ColorToken;
  border: ColorToken;
  input: ColorToken;
  ring: ColorToken;
  card: ColorToken;
  cardForeground: ColorToken;
  popover: ColorToken;
  popoverForeground: ColorToken;
  accent: ColorToken;
  accentForeground: ColorToken;
}

export interface ThemeFonts {
  heading: string;
  body: string;
  mono: string;
}

export interface Theme {
  colors: ThemeColors;
  fonts: ThemeFonts;
  /** Spacing scale in rem. Keys map to Tailwind's default numeric scale. */
  spacing: Record<string, string>;
  /** Border radii, derived from a single base `--radius`. */
  radii: Record<string, string>;
  /** Box-shadow presets. */
  shadows: Record<string, string>;
}

export const theme: Theme = {
  colors: {
    background: { light: "oklch(1 0 0)", dark: "oklch(0.145 0 0)" },
    foreground: { light: "oklch(0.145 0 0)", dark: "oklch(0.985 0 0)" },
    primary: { light: "oklch(0.205 0 0)", dark: "oklch(0.922 0 0)" },
    primaryForeground: { light: "oklch(0.985 0 0)", dark: "oklch(0.205 0 0)" },
    secondary: { light: "oklch(0.97 0 0)", dark: "oklch(0.269 0 0)" },
    secondaryForeground: {
      light: "oklch(0.205 0 0)",
      dark: "oklch(0.985 0 0)",
    },
    muted: { light: "oklch(0.97 0 0)", dark: "oklch(0.269 0 0)" },
    mutedForeground: { light: "oklch(0.556 0 0)", dark: "oklch(0.708 0 0)" },
    destructive: {
      light: "oklch(0.577 0.245 27.325)",
      dark: "oklch(0.704 0.191 22.216)",
    },
    destructiveForeground: {
      light: "oklch(0.985 0 0)",
      dark: "oklch(0.985 0 0)",
    },
    border: { light: "oklch(0.922 0 0)", dark: "oklch(1 0 0 / 10%)" },
    input: { light: "oklch(0.922 0 0)", dark: "oklch(1 0 0 / 15%)" },
    ring: { light: "oklch(0.708 0 0)", dark: "oklch(0.556 0 0)" },
    card: { light: "oklch(1 0 0)", dark: "oklch(0.205 0 0)" },
    cardForeground: { light: "oklch(0.145 0 0)", dark: "oklch(0.985 0 0)" },
    popover: { light: "oklch(1 0 0)", dark: "oklch(0.205 0 0)" },
    popoverForeground: { light: "oklch(0.145 0 0)", dark: "oklch(0.985 0 0)" },
    accent: { light: "oklch(0.97 0 0)", dark: "oklch(0.269 0 0)" },
    accentForeground: { light: "oklch(0.205 0 0)", dark: "oklch(0.985 0 0)" },
  },
  fonts: {
    // Wired to the Geist fonts loaded in app/layout.tsx; swap per-fork.
    heading: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
    body: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
    mono: "var(--font-geist-mono), ui-monospace, monospace",
  },
  spacing: {
    "0": "0rem",
    px: "1px",
    "1": "0.25rem",
    "2": "0.5rem",
    "3": "0.75rem",
    "4": "1rem",
    "6": "1.5rem",
    "8": "2rem",
    "12": "3rem",
    "16": "4rem",
  },
  radii: {
    // Base radius; sm/md/lg/xl are derived from it in globals.css.
    base: "0.625rem",
  },
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  },
};
