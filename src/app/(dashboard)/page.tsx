"use client";
import { useEffect, useState } from "react";
import {
  Users, UserCheck, GitBranch, CheckCircle,
  Car, Fuel, Wrench, Factory, FlaskConical,
  SendHorizonal, Landmark, Package, ShoppingCart,
  TrendingUp, AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { formatDateTime } from "@/lib/utils";

interface DashboardStats {
  userCount: number;
  employeeCount: number;
  branchCount: number;
  pendingApprovals: number;
  vehicleCount: number;
  fuelTankCount: number;
  workOrderCount: number;
  productionBatchCount: number;
  qcTestCount: number;
  dispatchOrderCount: number;
  accountCount: number;
  warehouseItemCount: number;
  procurementOrderCount: number;
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useCurrentUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((d) => setStats(d.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${user?.fullName?.split(" ")[0] ?? ""}!`}
        description={formatDateTime(now)}
      />

      {loading ? (
        <LoadingState />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Active Users" value={stats?.userCount ?? 0} icon={Users} description="System accounts" />
          <StatCard title="Active Employees" value={stats?.employeeCount ?? 0} icon={UserCheck} description="Employee records" />
          <StatCard title="Branches" value={stats?.branchCount ?? 0} icon={GitBranch} description="Operating locations" />
          <StatCard title="Pending Approvals" value={stats?.pendingApprovals ?? 0} icon={CheckCircle} description="Awaiting action" />
          <StatCard title="Vehicles" value={stats?.vehicleCount ?? 0} icon={Car} description="Fleet size" />
          <StatCard title="Fuel Tanks" value={stats?.fuelTankCount ?? 0} icon={Fuel} description="Storage units" />
          <StatCard title="Open Work Orders" value={stats?.workOrderCount ?? 0} icon={Wrench} description="Maintenance" />
          <StatCard title="Active Batches" value={stats?.productionBatchCount ?? 0} icon={Factory} description="Production" />
          <StatCard title="QC Tests" value={stats?.qcTestCount ?? 0} icon={FlaskConical} description="Quality control" />
          <StatCard title="Dispatch Orders" value={stats?.dispatchOrderCount ?? 0} icon={SendHorizonal} description="Logistics" />
          <StatCard title="Finance Accounts" value={stats?.accountCount ?? 0} icon={Landmark} description="Chart of accounts" />
          <StatCard title="Warehouse Items" value={stats?.warehouseItemCount ?? 0} icon={Package} description="SKU count" />
          <StatCard title="Purchase Orders" value={stats?.procurementOrderCount ?? 0} icon={ShoppingCart} description="Procurement" />
        </div>
      )}

      <div className="mt-8 grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.pendingApprovals === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No pending approvals. All clear!
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                You have{" "}
                <a href="/approvals" className="font-medium text-primary hover:underline">
                  {stats?.pendingApprovals} pending approval{stats?.pendingApprovals !== 1 ? "s" : ""}
                </a>{" "}
                awaiting your action.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phase</span>
                <span className="font-medium">2 — Full Operations</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium">{process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Modules Active</span>
                <span className="font-medium text-right">
                  Admin · Company · Employees · Warehouse · Transport · Fuel · Maintenance · Procurement · Production · QC · Dispatch · Finance · Analytics · Reports · Approvals · Audit · Settings
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
