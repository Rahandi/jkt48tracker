"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type SetlistCount = { setlist_name: string; count: number };

function truncate(s: string, max = 28) {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

export function TopSetlistsChart({ data }: { data: SetlistCount[] }) {
  const formatted = data.map((d) => ({ ...d, label: truncate(d.setlist_name) }));

  return (
    <ResponsiveContainer width="100%" height={data.length * 30 + 20}>
      <BarChart
        layout="vertical"
        data={formatted}
        margin={{ top: 0, right: 8, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11 }}
          className="fill-muted-foreground"
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={160}
          tick={{ fontSize: 11 }}
          className="fill-muted-foreground"
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
          itemStyle={{ color: "var(--muted-foreground)" }}
          formatter={(value) => [value, "Shows"]}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.setlist_name ?? ""}
        />
        <Bar dataKey="count" fill="var(--primary)" radius={[0, 3, 3, 0]} maxBarSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}
