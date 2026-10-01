export const EYEBROW =
  "font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground";

interface AuthScreenHeaderProps {
  eyebrow: string;
  title: string;
  description?: React.ReactNode;
}

export function AuthScreenHeader({
  eyebrow,
  title,
  description,
}: AuthScreenHeaderProps) {
  return (
    <div className="mb-8">
      <p className={EYEBROW}>{eyebrow}</p>
      <h1 className="mt-3 font-heading text-3xl text-foreground">{title}</h1>
      {description && (
        <p className="mt-3 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
