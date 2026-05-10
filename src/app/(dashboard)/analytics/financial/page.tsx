"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function FinancialAnalyticsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState("6");

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/financial?months=${months}`);
      const json = await res.json();
      if (res.ok) {
        setData(json.data);
      } else {
        toast.error(json.message || "Failed to load financial trends");
      }
    } catch {
      toast.error("Failed to load financial trends");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Financial Analytics" description="Revenue, expenses, payments, and receipts over time" />

      <div className="flex gap-4 items-end">
        <div className="space-y-2">
          <Label>Months</Label>
          <Input type="number" min={3} max={24} value={months} onChange={(e) => setMonths(e.target.value)} className="w-24" />
        </div>
        <Button onClick={fetchData} disabled={loading}>{loading ? "Loading..." : "Update"}</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Revenue vs Expenses</CardTitle></CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Net Position</CardTitle></CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
