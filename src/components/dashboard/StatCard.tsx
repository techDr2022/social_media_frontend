"use client";

import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  iconColor?: string;
  delay?: number;
}

export function StatCard({
  title,
  value,
  change,
  changeLabel = "vs last week",
  icon: Icon,
  iconColor = "text-primary",
  delay = 0,
}: StatCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Background glow effect */}
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/5 blur-2xl transition-all duration-500 group-hover:bg-primary/10" />

      <div className="relative flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          {change !== undefined && (
            <div className="flex items-center gap-1.5">
              {isPositive ? (
                <div className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5">
                  <TrendingUp className="h-3 w-3 text-success" />
                  <span className="text-xs font-medium text-success">
                    +{change}%
                  </span>
                </div>
              ) : isNegative ? (
                <div className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5">
                  <TrendingDown className="h-3 w-3 text-destructive" />
                  <span className="text-xs font-medium text-destructive">
                    {change}%
                  </span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">0%</span>
              )}
              <span className="text-xs text-muted-foreground">
                {changeLabel}
              </span>
            </div>
          )}
        </div>

        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-all duration-300 group-hover:scale-110",
            iconColor
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}




























