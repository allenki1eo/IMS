"use client";

/**
 * Recharts pieces for the reports page, extracted so the page can load
 * them with next/dynamic (ssr: false).
 */
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export function ReportBarChart({
  data,
  xKey,
  dataKey,
  fill,
}: {
  data: object[];
  xKey: string;
  dataKey: string;
  fill: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} />
        <YAxis />
        <Tooltip />
        <Bar dataKey={dataKey} fill={fill} />
      </BarChart>
    </ResponsiveContainer>
  );
}
