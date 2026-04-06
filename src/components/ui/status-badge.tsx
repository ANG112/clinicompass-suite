import { cn } from "@/lib/utils";

type StatusVariant = "success" | "warning" | "destructive" | "info" | "muted" | "primary" | "accent";

const variantStyles: Record<StatusVariant, string> = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-info/10 text-info border-info/20",
  muted: "bg-muted text-muted-foreground border-border",
  primary: "bg-primary/10 text-primary border-primary/20",
  accent: "bg-accent/10 text-accent border-accent/20",
};

interface StatusBadgeProps {
  variant: StatusVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export function StatusBadge({ variant, children, className, dot = true }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "badge-status border",
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full mr-1.5", {
            "bg-success": variant === "success",
            "bg-warning": variant === "warning",
            "bg-destructive": variant === "destructive",
            "bg-info": variant === "info",
            "bg-muted-foreground": variant === "muted",
            "bg-primary": variant === "primary",
            "bg-accent": variant === "accent",
          })}
        />
      )}
      {children}
    </span>
  );
}
