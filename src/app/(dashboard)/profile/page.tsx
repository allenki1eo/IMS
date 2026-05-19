"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun, Shield, Smartphone, Globe, Trash2, Clock, LogOut } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getInitials, formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface UserDetail {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone: string | null;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  roles: { id: string; name: string }[];
}

interface Session {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastActivityAt: string | null;
}

interface AuditLog {
  id: string;
  action: string;
  module: string;
  description: string;
  createdAt: string;
}

function parseDevice(userAgent: string | null) {
  if (!userAgent) return { icon: <Globe className="h-4 w-4" />, label: "Unknown device" };
  if (/mobile|android|iphone/i.test(userAgent))
    return { icon: <Smartphone className="h-4 w-4" />, label: "Mobile browser" };
  return { icon: <Monitor className="h-4 w-4" />, label: "Desktop browser" };
}

function timeAgo(date: string | null) {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const ACTION_COLOR: Record<string, string> = {
  CREATE: "text-emerald-600",
  UPDATE: "text-blue-600",
  DELETE: "text-red-600",
  LOGIN: "text-gray-500",
  LOGOUT: "text-gray-500",
  APPROVE: "text-violet-600",
  REJECT: "text-red-600",
};

function actionColor(action: string) {
  const key = Object.keys(ACTION_COLOR).find((k) => action.startsWith(k));
  return key ? ACTION_COLOR[key] : "text-gray-600";
}

export default function ProfilePage() {
  const { user: authUser } = useCurrentUser();
  const { theme, setTheme } = useTheme();

  const [profile, setProfile] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    if (!authUser) return;
    fetch(`/api/users/${authUser.id}`)
      .then((r) => r.json())
      .then((d) => {
        const u = d.data;
        setProfile(u);
        if (u) { setFullName(u.fullName); setPhone(u.phone ?? ""); }
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));

    fetch("/api/auth/sessions")
      .then((r) => r.json())
      .then((d) => setSessions(Array.isArray(d.data) ? d.data : []))
      .catch(() => {})
      .finally(() => setSessionsLoading(false));

    fetch(`/api/audit-logs?userId=${authUser.id}&pageSize=8`)
      .then((r) => r.json())
      .then((d) => setLogs(Array.isArray(d.data) ? d.data : []))
      .catch(() => {})
      .finally(() => setLogsLoading(false));
  }, [authUser]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authUser || !fullName) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${authUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone: phone || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update profile"); return; }
      setProfile((p) => p ? { ...p, fullName, phone: phone || null } : p);
      toast.success("Profile updated");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function revokeSession(sessionId: string) {
    setRevokingId(sessionId);
    try {
      const res = await fetch(`/api/auth/sessions?id=${sessionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setSessions((s) => s.filter((x) => x.id !== sessionId));
      toast.success("Session revoked");
    } catch {
      toast.error("Failed to revoke session");
    } finally {
      setRevokingId(null);
    }
  }

  if (loading || !authUser) return <LoadingState />;
  if (!profile) return <div className="text-muted-foreground">Profile not found.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="Manage your account, sessions, and preferences"
        actions={
          <Button variant="outline" asChild>
            <Link href="/profile/security">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Edit form */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 text-lg">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {getInitials(profile.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold text-lg">{profile.fullName}</h2>
                  <p className="text-sm text-muted-foreground">@{profile.username} · {profile.email}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={saving} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" disabled={saving} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={profile.email} disabled readOnly className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Contact an administrator to change your email.</p>
                </div>
                <Button type="submit" disabled={saving}>
                  {saving && <LoadingSpinner className="mr-2" />}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Active Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Active Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {sessionsLoading ? (
                <div className="px-6 py-4 space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : sessions.length === 0 ? (
                <p className="px-6 py-4 text-sm text-muted-foreground">No active sessions found.</p>
              ) : (
                <div className="divide-y">
                  {sessions.map((session, i) => {
                    const device = parseDevice(session.userAgent);
                    const isCurrent = i === 0;
                    return (
                      <div key={session.id} className="flex items-center gap-3 px-6 py-3">
                        <div className="shrink-0 text-muted-foreground">{device.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium flex items-center gap-2">
                            {device.label}
                            {isCurrent && <Badge variant="secondary" className="text-[10px]">Current</Badge>}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session.ipAddress ?? "Unknown IP"} · Last active {timeAgo(session.lastActivityAt)}
                          </p>
                        </div>
                        {!isCurrent && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            disabled={revokingId === session.id}
                            onClick={() => revokeSession(session.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Revoke
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {logsLoading ? (
                <div className="px-6 py-4 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : logs.length === 0 ? (
                <p className="px-6 py-4 text-sm text-muted-foreground">No recent activity.</p>
              ) : (
                <div className="divide-y">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 px-6 py-3">
                      <span className={cn("text-xs font-semibold uppercase mt-0.5 shrink-0 w-16", actionColor(log.action))}>
                        {log.action?.split("_")[0]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{log.description}</p>
                        <p className="text-xs text-muted-foreground capitalize">{log.module}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{timeAgo(log.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="px-6 py-3 border-t">
                <Link href="/audit-logs" className="text-xs text-primary hover:underline">View full audit trail →</Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Account info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Account Info</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Status</span>
                <div className="mt-1"><StatusBadge status={profile.status} /></div>
              </div>
              <Separator />
              <div>
                <span className="text-muted-foreground">Last Login</span>
                <p className="font-medium mt-0.5">{formatDateTime(profile.lastLoginAt)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Member Since</span>
                <p className="font-medium mt-0.5">{formatDateTime(profile.createdAt)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Roles */}
          <Card>
            <CardHeader><CardTitle className="text-base">Roles</CardTitle></CardHeader>
            <CardContent>
              {profile.roles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No roles assigned.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile.roles.map((role) => (
                    <Badge key={role.id} variant="secondary">{role.name}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader><CardTitle className="text-base">Appearance</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Choose your preferred colour scheme.</p>
              <div className="grid grid-cols-3 gap-2">
                {(["light", "dark", "system"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors",
                      theme === t
                        ? "border-foreground bg-accent"
                        : "border-border hover:border-foreground/30 hover:bg-accent/50"
                    )}
                  >
                    {t === "light" ? <Sun className="h-4 w-4" /> : t === "dark" ? <Moon className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                    <span className="capitalize">{t}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick links */}
          <Card>
            <CardHeader><CardTitle className="text-base">Quick Links</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <Link href="/profile/security">
                  <Shield className="h-4 w-4" /> Security Settings
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 text-destructive hover:text-destructive" asChild>
                <Link href="/login">
                  <LogOut className="h-4 w-4" /> Sign Out
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
