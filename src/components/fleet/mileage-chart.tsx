"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate, formatKmValue } from "@/lib/format";

type Point = { km: number; at: Date };

export function MileageChart({ readings }: { readings: Point[] }) {
  if (readings.length < 2) {
    return (
      <p className="text-sm text-text-secondary">
        Not enough readings yet to chart a trend — check back once a few more have come in.
      </p>
    );
  }

  const data = [...readings]
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .map((r) => ({ date: r.at.getTime(), km: r.km }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="date"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v: number) => formatDate(new Date(v), "d MMM")}
            tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={false}
          />
          <YAxis
            width={56}
            tickFormatter={(v: number) => formatKmValue(v)}
            tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            labelFormatter={(v) => (typeof v === "number" ? formatDate(new Date(v), "d MMM yyyy, HH:mm") : "")}
            formatter={(value) => [
              typeof value === "number" ? `${formatKmValue(value)} km` : String(value),
              "Odometer",
            ]}
            contentStyle={{
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              fontSize: 13,
            }}
          />
          <Line
            type="monotone"
            dataKey="km"
            stroke="var(--color-accent)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
