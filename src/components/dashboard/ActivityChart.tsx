"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const weeklyData = [
  { name: "Mon", engagement: 2400, views: 4000, followers: 100 },
  { name: "Tue", engagement: 1398, views: 3000, followers: 150 },
  { name: "Wed", engagement: 9800, views: 2000, followers: 200 },
  { name: "Thu", engagement: 3908, views: 2780, followers: 180 },
  { name: "Fri", engagement: 4800, views: 1890, followers: 250 },
  { name: "Sat", engagement: 3800, views: 2390, followers: 220 },
  { name: "Sun", engagement: 4300, views: 3490, followers: 280 },
];

const monthlyData = [
  { name: "Week 1", engagement: 12400, views: 24000, followers: 800 },
  { name: "Week 2", engagement: 11398, views: 23000, followers: 950 },
  { name: "Week 3", engagement: 19800, views: 22000, followers: 1200 },
  { name: "Week 4", engagement: 23908, views: 22780, followers: 1080 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-popover p-3 shadow-xl">
        <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="capitalize text-muted-foreground">
              {entry.dataKey}:
            </span>
            <span className="font-medium text-foreground">
              {entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function ActivityChart() {
  return (
    <div className="rounded-xl border border-border bg-card animate-fade-in-up" style={{ animationDelay: "300ms" }}>
      <div className="border-b border-border p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Performance Overview
            </h3>
            <p className="text-sm text-muted-foreground">
              Track your growth and engagement
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="weekly" className="p-5">
        <TabsList className="mb-6 bg-secondary/50">
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="mt-0">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={weeklyData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(239 84% 67%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(239 84% 67%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(217 33% 17%)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(215 16% 65%)", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(215 16% 65%)", fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="engagement"
                  stroke="hsl(239 84% 67%)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorEngagement)"
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="hsl(142 71% 45%)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorViews)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="monthly" className="mt-0">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={monthlyData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorEngagementM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(239 84% 67%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(239 84% 67%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorViewsM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(217 33% 17%)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(215 16% 65%)", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(215 16% 65%)", fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="engagement"
                  stroke="hsl(239 84% 67%)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorEngagementM)"
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="hsl(142 71% 45%)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorViewsM)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground">Engagement</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-success" />
            <span className="text-sm text-muted-foreground">Views</span>
          </div>
        </div>
      </Tabs>
    </div>
  );
}




























