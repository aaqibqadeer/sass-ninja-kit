import { cn } from "@/lib/utils";

interface BrandMarkProps {
  /** Extra classes for the mark's outer box (e.g. a larger `size-*`). */
  className?: string;
}

/**
 * The ninjakit logomark — a shuriken glyph in a rounded, primary-colored tile.
 * Token-only (no hardcoded colors) so it recolors with the theme; pair it with
 * the wordmark in headers/footers.
 */
export function BrandMark({ className }: BrandMarkProps) {
  return (
    <span
      className={cn(
        "bg-primary text-primary-foreground inline-flex size-7 items-center justify-center rounded-md",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 2l2.6 7.4H22l-6 4.6 2.4 7.4-6.4-4.7L5.6 21.4 8 14 2 9.4h7.4z" />
      </svg>
    </span>
  );
}
