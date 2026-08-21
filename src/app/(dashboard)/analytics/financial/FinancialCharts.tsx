"use client";

/**
 * Recharts pieces for financial analytics, extracted so the page can load
 * them with next/dynamic (ssr: false).
 */
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";

export function RevenueExpensesChart({ data }: { data: object[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="revenue" name="Revenue" fill="#00C49F" />
        <Bar dataKey="expenses" name="Expenses" fill="#FF8042" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function NetPositionChart({ data }: { data: object[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#00C49F" />
        <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#FF8042" />
        <Line type="monotone" dataKey="receipts" name="Receipts" stroke="#0088FE" />
        <Line type="monotone" dataKey="payments" name="Payments" stroke="#8884D8" />
      </LineChart>
    </ResponsiveContainer>
  );
}
