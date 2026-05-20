"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface TruckSheetRow {
  no: number;
  truck: string;
  trailer: string | null;
  driver: string | null;
  phone: string | null;
  licence: string | null;
  startTrip: string | null;
  from: string | null;
  to: string | null;
  goods: string | null;
  today: string | null;
  remark: string | null;
  tripStatus: string | null;
}

interface SheetData {
  company: { name: string; legalName?: string | null } | null;
  rows: TruckSheetRow[];
  reportDate: string;
}

export default function TruckSheetPage() {
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [data, setData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  async function load(d: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/transport/truck-sheet?date=${d}`);
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to load"); return; }
      setData(json.data);
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(date); }, [date]);

  function handlePrint() {
    window.print();
  }

  const companyName = data?.company?.legalName || data?.company?.name || "COMPANY NAME";
  const reportDate = data?.reportDate ? new Date(data.reportDate) : new Date();

  return (
    <div>
      {/* Screen-only controls */}
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <div className="flex items-center gap-2">
          <Label htmlFor="report-date" className="whitespace-nowrap">Report Date</Label>
          <Input
            id="report-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-[160px]"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => load(date)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        <Button onClick={handlePrint} disabled={loading}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Printable sheet */}
      <div ref={printRef} className="truck-sheet-print bg-white">
        {/* Header */}
        <div className="text-center mb-2">
          <div className="text-xl font-bold tracking-widest uppercase">
            {companyName}
          </div>
          <div className="text-base font-bold tracking-widest uppercase mt-1">
            DAILY TRUCK CONTROL SHEET
          </div>
        </div>

        <div className="flex justify-end mb-2">
          <span className="text-sm font-medium tracking-wide">
            {format(reportDate, "dd. MM. yyyy")}
          </span>
        </div>

        {/* Table */}
        <table className="truck-sheet-table w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-300">
              <th className="border border-gray-600 px-1 py-1.5 text-center font-bold w-7">No.</th>
              <th className="border border-gray-600 px-1 py-1.5 text-center font-bold">TRUCK</th>
              <th className="border border-gray-600 px-1 py-1.5 text-center font-bold">TRAILER</th>
              <th className="border border-gray-600 px-1 py-1.5 text-center font-bold min-w-[120px]">DRIVER</th>
              <th className="border border-gray-600 px-1 py-1.5 text-center font-bold">PHONE</th>
              <th className="border border-gray-600 px-1 py-1.5 text-center font-bold">LICENCE</th>
              <th className="border border-gray-600 px-1 py-1.5 text-center font-bold">START TRIP</th>
              <th className="border border-gray-600 px-1 py-1.5 text-center font-bold">FROM</th>
              <th className="border border-gray-600 px-1 py-1.5 text-center font-bold min-w-[90px]">TO</th>
              <th className="border border-gray-600 px-1 py-1.5 text-center font-bold">GOODS</th>
              <th className="border border-gray-600 px-1 py-1.5 text-center font-bold">TODAY</th>
              <th className="border border-gray-600 px-1 py-1.5 text-center font-bold">REMARK</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={12} className="text-center py-8 text-gray-400 border border-gray-300">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && (!data?.rows || data.rows.length === 0) && (
              <tr>
                <td colSpan={12} className="text-center py-8 text-gray-400 border border-gray-300">
                  No trucks found
                </td>
              </tr>
            )}
            {!loading && data?.rows?.map((row) => (
              <tr key={row.no} className="hover:bg-gray-50">
                <td className="border border-gray-400 px-1 py-1 text-center">{row.no}</td>
                <td className="border border-gray-400 px-1 py-1 text-center font-semibold tracking-wide">
                  {row.truck}
                </td>
                <td className="border border-gray-400 px-1 py-1 text-center tracking-wide">
                  {row.trailer ?? ""}
                </td>
                <td className="border border-gray-400 px-1 py-1 font-medium uppercase">
                  {row.driver ?? ""}
                </td>
                <td className="border border-gray-400 px-1 py-1 text-center tracking-wide">
                  {row.phone ?? ""}
                </td>
                <td className="border border-gray-400 px-1 py-1 text-center tracking-wide">
                  {row.licence ?? ""}
                </td>
                <td className="border border-gray-400 px-1 py-1 text-center">
                  {row.startTrip
                    ? format(new Date(row.startTrip), "d-MMM")
                    : ""}
                </td>
                <td className="border border-gray-400 px-1 py-1 text-center uppercase">
                  {row.from ?? ""}
                </td>
                <td className="border border-gray-400 px-1 py-1 text-center uppercase">
                  {row.to ?? ""}
                </td>
                <td className="border border-gray-400 px-1 py-1 text-center uppercase">
                  {row.goods ?? ""}
                </td>
                <td className="border border-gray-400 px-1 py-1 text-center font-medium uppercase">
                  {row.today ?? ""}
                </td>
                <td className="border border-gray-400 px-1 py-1 text-center uppercase">
                  {row.remark ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .truck-sheet-print, .truck-sheet-print * { visibility: visible; }
          .truck-sheet-print { position: fixed; top: 0; left: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
          .truck-sheet-table { font-size: 10px; }
        }
      `}</style>
    </div>
  );
}
