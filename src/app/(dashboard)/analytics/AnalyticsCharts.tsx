"use client";

/**
 * Recharts pieces for the analytics overview, extracted so the page can
 * load them with next/dynamic (ssr: false).
 */
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";

export function MonthlyActivityChart({ data }: { data: object[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="purchaseOrders" name="PO Value" fill="#0088FE" />
        <Bar dataKey="dispatchOrders" name="Dispatch Value" fill="#00C49F" />
        <Bar dataKey="journalActivity" name="Journal Activity" fill="#FFBB28" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function OperationalVolumeChart({ data }: { data: object[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="grns" name="GRNs" stroke="#0088FE" />
        <Line type="monotone" dataKey="trips" name="Trips" stroke="#00C49F" />
        <Line type="monotone" dataKey="batches" name="Batches" stroke="#FF8042" />
        <Line type="monotone" dataKey="workOrders" name="Work Orders" stroke="#8884D8" />
      </LineChart>
    </ResponsiveContainer>
  );
}
