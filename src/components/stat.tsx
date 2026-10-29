import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  unit,
  sub,
  className,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  sub?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="num truncate text-xl font-semibold tracking-tight">{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function Empty({ icon, title, children }: { icon?: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-10 text-center">
      {icon && <div className="mb-3 text-muted-foreground">{icon}</div>}
      <div className="text-sm font-medium">{title}</div>
      {children && <div className="mt-1 text-[13px] text-muted-foreground">{children}</div>}
    </div>
  );
}
