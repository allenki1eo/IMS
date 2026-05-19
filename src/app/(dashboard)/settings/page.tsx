"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Settings,
  DollarSign,
  Cog,
  Bell,
  ShieldCheck,
  Save,
  AlertCircle,
} from "lucide-react";

// ---- Types ----------------------------------------------------------------

type SettingType = "text" | "number" | "boolean" | "select" | "email" | "url";

interface SettingDef {
  key: string;
  label: string;
  description: string;
  type: SettingType;
  default: string;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
}

interface CategoryDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  settings: SettingDef[];
}

// ---- Settings schema ------------------------------------------------------

const CATEGORIES: CategoryDef[] = [
  {
    id: "general",
    label: "General",
    icon: <Settings className="h-4 w-4" />,
    settings: [
      {
        key: "app_name",
        label: "Application Name",
        description: "Display name shown in the browser tab and header",
        type: "text",
        default: "IMS",
      },
      {
        key: "default_currency",
        label: "Default Currency",
        description: "Base currency used across all modules",
        type: "select",
        default: "TZS",
        options: [
          { label: "TZS – Tanzanian Shilling", value: "TZS" },
          { label: "USD – US Dollar", value: "USD" },
          { label: "EUR – Euro", value: "EUR" },
          { label: "GBP – British Pound", value: "GBP" },
          { label: "KES – Kenyan Shilling", value: "KES" },
          { label: "UGX – Ugandan Shilling", value: "UGX" },
        ],
      },
      {
        key: "date_format",
        label: "Date Format",
        description: "How dates are displayed across the application",
        type: "select",
        default: "DD/MM/YYYY",
        options: [
          { label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
          { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
          { label: "YYYY-MM-DD", value: "YYYY-MM-DD" },
        ],
      },
      {
        key: "timezone",
        label: "Timezone",
        description: "Default timezone for date/time display",
        type: "select",
        default: "Africa/Dar_es_Salaam",
        options: [
          { label: "Africa/Dar es Salaam (EAT, UTC+3)", value: "Africa/Dar_es_Salaam" },
          { label: "Africa/Nairobi (EAT, UTC+3)", value: "Africa/Nairobi" },
          { label: "UTC", value: "UTC" },
          { label: "Europe/London (GMT/BST)", value: "Europe/London" },
          { label: "America/New York (EST/EDT)", value: "America/New_York" },
        ],
      },
      {
        key: "fiscal_year_start",
        label: "Fiscal Year Start Month",
        description: "The month in which the company's financial year begins",
        type: "select",
        default: "1",
        options: [
          { label: "January", value: "1" },
          { label: "February", value: "2" },
          { label: "March", value: "3" },
          { label: "April", value: "4" },
          { label: "May", value: "5" },
          { label: "June", value: "6" },
          { label: "July", value: "7" },
          { label: "August", value: "8" },
          { label: "September", value: "9" },
          { label: "October", value: "10" },
          { label: "November", value: "11" },
          { label: "December", value: "12" },
        ],
      },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: <DollarSign className="h-4 w-4" />,
    settings: [
      {
        key: "default_vat_rate",
        label: "Default VAT Rate (%)",
        description: "Applied to new invoices and purchase orders",
        type: "number",
        default: "18",
        min: 0,
        max: 100,
      },
      {
        key: "invoice_prefix",
        label: "Invoice Prefix",
        description: "e.g. INV- produces INV-0001",
        type: "text",
        default: "INV-",
      },
      {
        key: "po_prefix",
        label: "PO Number Prefix",
        description: "e.g. PO- produces PO-0001",
        type: "text",
        default: "PO-",
      },
      {
        key: "payment_terms_days",
        label: "Default Payment Terms (days)",
        description: "Net payment period applied to new transactions",
        type: "number",
        default: "30",
        min: 0,
      },
      {
        key: "enable_multi_currency",
        label: "Enable Multi-Currency",
        description: "Allow transactions in foreign currencies",
        type: "boolean",
        default: "false",
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    icon: <Cog className="h-4 w-4" />,
    settings: [
      {
        key: "odometer_unit",
        label: "Odometer Unit",
        description: "Unit used for vehicle distance tracking",
        type: "select",
        default: "km",
        options: [
          { label: "Kilometres (km)", value: "km" },
          { label: "Miles (mi)", value: "miles" },
        ],
      },
      {
        key: "default_fuel_type",
        label: "Default Fuel Type",
        description: "Pre-selected fuel type for new fuel issues",
        type: "select",
        default: "DIESEL",
        options: [
          { label: "Diesel", value: "DIESEL" },
          { label: "Petrol", value: "PETROL" },
          { label: "CNG", value: "CNG" },
          { label: "Electric", value: "ELECTRIC" },
        ],
      },
      {
        key: "stock_valuation_method",
        label: "Stock Valuation Method",
        description: "Method used to value inventory cost",
        type: "select",
        default: "FIFO",
        options: [
          { label: "FIFO – First In, First Out", value: "FIFO" },
          { label: "LIFO – Last In, First Out", value: "LIFO" },
          { label: "Average Cost", value: "AVERAGE" },
        ],
      },
      {
        key: "low_stock_threshold_pct",
        label: "Low Stock Alert Threshold (%)",
        description: "Warn when stock falls below this % of minimum level",
        type: "number",
        default: "20",
        min: 0,
        max: 100,
      },
      {
        key: "low_fuel_threshold_liters",
        label: "Low Fuel Tank Alert (liters)",
        description: "Warn when tank level falls below this volume",
        type: "number",
        default: "500",
        min: 0,
      },
      {
        key: "auto_grn_numbering",
        label: "Auto GRN Numbering",
        description: "Automatically assign sequential GRN numbers",
        type: "boolean",
        default: "true",
      },
      {
        key: "grn_prefix",
        label: "GRN Number Prefix",
        description: "e.g. GRN- produces GRN-0001",
        type: "text",
        default: "GRN-",
      },
    ],
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: <Bell className="h-4 w-4" />,
    settings: [
      {
        key: "notification_email",
        label: "Admin Notification Email",
        description: "Receives system alerts and reports",
        type: "email",
        default: "",
      },
      {
        key: "notify_low_stock",
        label: "Notify on Low Stock",
        description: "Send email when item stock falls below threshold",
        type: "boolean",
        default: "true",
      },
      {
        key: "notify_low_fuel",
        label: "Notify on Low Fuel",
        description: "Send email when tank level falls below threshold",
        type: "boolean",
        default: "true",
      },
      {
        key: "notify_pending_approvals",
        label: "Notify on Pending Approvals",
        description: "Send daily digest of pending approval requests",
        type: "boolean",
        default: "false",
      },
      {
        key: "notify_overdue_maintenance",
        label: "Notify on Overdue Maintenance",
        description: "Send alert when scheduled maintenance is overdue",
        type: "boolean",
        default: "true",
      },
    ],
  },
  {
    id: "security",
    label: "Security",
    icon: <ShieldCheck className="h-4 w-4" />,
    settings: [
      {
        key: "session_timeout_minutes",
        label: "Session Timeout (minutes)",
        description: "Users are automatically logged out after this period of inactivity",
        type: "number",
        default: "60",
        min: 5,
        max: 1440,
      },
      {
        key: "max_login_attempts",
        label: "Max Failed Login Attempts",
        description: "Account locked after this many consecutive failures",
        type: "number",
        default: "5",
        min: 3,
        max: 20,
      },
      {
        key: "password_min_length",
        label: "Minimum Password Length",
        description: "Passwords shorter than this length will be rejected",
        type: "number",
        default: "8",
        min: 6,
        max: 32,
      },
      {
        key: "require_special_chars",
        label: "Require Special Characters",
        description: "Passwords must contain at least one special character",
        type: "boolean",
        default: "true",
      },
      {
        key: "allow_concurrent_sessions",
        label: "Allow Concurrent Sessions",
        description: "Users can be logged in from multiple devices simultaneously",
        type: "boolean",
        default: "true",
      },
    ],
  },
];

// ---- Toggle component -----------------------------------------------------

function BooleanToggle({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const on = value === "true";
  return (
    <button
      type="button"
      onClick={() => onChange(on ? "false" : "true")}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        on ? "bg-primary" : "bg-input"
      )}
      aria-checked={on}
      role="switch"
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
          on ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

// ---- Setting field renderer -----------------------------------------------

function SettingField({
  def,
  value,
  onChange,
  disabled,
}: {
  def: SettingDef;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  if (def.type === "boolean") {
    return (
      <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
        <div className="space-y-0.5 pr-8">
          <Label className="text-sm font-medium leading-none">{def.label}</Label>
          <p className="text-xs text-muted-foreground">{def.description}</p>
        </div>
        <BooleanToggle value={value} onChange={onChange} disabled={disabled} />
      </div>
    );
  }

  if (def.type === "select" && def.options) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={`setting-${def.key}`}>{def.label}</Label>
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger id={`setting-${def.key}`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {def.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {def.description && (
          <p className="text-xs text-muted-foreground">{def.description}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={`setting-${def.key}`}>{def.label}</Label>
      <Input
        id={`setting-${def.key}`}
        type={def.type === "number" ? "number" : def.type === "email" ? "email" : def.type === "url" ? "url" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={def.min}
        max={def.max}
        disabled={disabled}
        className="max-w-sm"
      />
      {def.description && (
        <p className="text-xs text-muted-foreground">{def.description}</p>
      )}
    </div>
  );
}

// ---- Inner page (uses useSearchParams) ------------------------------------

function SettingsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("tab") ?? "general";

  const [dbValues, setDbValues] = useState<Record<string, string>>({});
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(() => {
    setLoading(true);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        const data: Array<{ key: string; value: string }> = d.data ?? [];
        const map: Record<string, string> = {};
        data.forEach((s) => { map[s.key] = s.value; });
        setDbValues(map);
        setLocalValues(map);
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const activeCat = CATEGORIES.find((c) => c.id === activeTab) ?? CATEGORIES[0];

  // Resolve value: local override → db value → schema default
  function getValue(key: string, def: SettingDef): string {
    if (key in localValues) return localValues[key];
    if (key in dbValues) return dbValues[key];
    return def.default;
  }

  function handleChange(key: string, value: string) {
    setLocalValues((prev) => ({ ...prev, [key]: value }));
  }

  // Check if any value in active category differs from saved db value
  const hasUnsaved = activeCat.settings.some((def) => {
    const local = getValue(def.key, def);
    const saved = dbValues[def.key] ?? def.default;
    return local !== saved;
  });

  async function handleSave() {
    setSaving(true);
    const payload = activeCat.settings.map((def) => ({
      key: def.key,
      value: getValue(def.key, def),
    }));

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to save settings");
        return;
      }
      // Update dbValues so unsaved indicator clears
      const updated: Record<string, string> = { ...dbValues };
      payload.forEach(({ key, value }) => { updated[key] = value; });
      setDbValues(updated);
      toast.success(`${activeCat.label} settings saved`);
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  function setTab(id: string) {
    router.push(`/settings?tab=${id}`);
  }

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Settings"
        description="System configuration and preferences"
      />

      <div className="flex gap-6 mt-6">
        {/* Left category nav */}
        <aside className="w-44 shrink-0">
          <nav className="space-y-0.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setTab(cat.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left",
                  activeTab === cat.id
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content area */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {activeCat.icon}
                    {activeCat.label} Settings
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Configure {activeCat.label.toLowerCase()} preferences for your organisation
                  </CardDescription>
                </div>
                {hasUnsaved && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-md">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Unsaved changes
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {activeCat.settings
                  .filter((def) => def.type !== "boolean")
                  .map((def) => (
                    <SettingField
                      key={def.key}
                      def={def}
                      value={getValue(def.key, def)}
                      onChange={(v) => handleChange(def.key, v)}
                      disabled={saving}
                    />
                  ))}

                {/* Boolean toggles grouped at bottom */}
                {activeCat.settings.some((d) => d.type === "boolean") && (
                  <div className="pt-2">
                    {activeCat.settings
                      .filter((def) => def.type === "boolean")
                      .map((def) => (
                        <SettingField
                          key={def.key}
                          def={def}
                          value={getValue(def.key, def)}
                          onChange={(v) => handleChange(def.key, v)}
                          disabled={saving}
                        />
                      ))}
                  </div>
                )}
              </div>

              <PermissionGuard require="settings:settings:update">
                <div className="mt-6 pt-4 border-t border-border">
                  <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? (
                      <LoadingSpinner className="h-4 w-4" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save {activeCat.label} Settings
                  </Button>
                </div>
              </PermissionGuard>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---- Default export (wrap in Suspense for useSearchParams) ----------------

export default function SettingsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <SettingsPageInner />
    </Suspense>
  );
}
