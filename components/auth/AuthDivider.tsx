interface AuthDividerProps {
  label?: string;
}

/** A labelled horizontal rule ("or") used between auth method groups. */
export function AuthDivider({ label = "or" }: AuthDividerProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <span className="text-muted-foreground text-xs uppercase">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
