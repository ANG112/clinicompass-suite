import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "text-primary",
  className,
}: StatCardProps) {
  return (
    <div className={cn("stat-card", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </p>
          <p className="text-2xl font-bold font-heading text-foreground">
            {value}
          </p>
        </div>
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center bg-primary/10", iconColor === "text-accent" && "bg-accent/10", iconColor === "text-success" && "bg-success/10", iconColor === "text-warning" && "bg-warning/10")}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
      {change && (
        <p className={cn("text-xs mt-2 font-medium", {
          "text-success": changeType === "positive",
          "text-destructive": changeType === "negative",
          "text-muted-foreground": changeType === "neutral",
        })}>
          {change}
        </p>
      )}
    </div>
  );
}
