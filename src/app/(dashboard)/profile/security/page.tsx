"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Monitor, Smartphone, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

interface Session {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastActivityAt: string | null;
  isCurrent?: boolean;
}

export default function SecurityPage() {
  // Change password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/sessions")
      .then((r) => r.json())
      .then((d) => setSessions(d.data ?? []))
      .catch(() => toast.error("Failed to load sessions"))
      .finally(() => setLoadingSessions(false));
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error("Current and new passwords are required");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    setChangingPw(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to change password"); return; }
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Network error");
    } finally {
      setChangingPw(false);
    }
  }

  async function revokeSession(sessionId: string) {
    setRevokingId(sessionId);
    try {
      const res = await fetch(`/api/auth/sessions?id=${sessionId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to revoke session"); return; }
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success("Session revoked");
    } catch {
      toast.error("Network error");
    } finally {
      setRevokingId(null);
    }
  }

  function getDeviceIcon(userAgent: string | null) {
    if (!userAgent) return <Monitor className="h-4 w-4" />;
    const ua = userAgent.toLowerCase();
    if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
      return <Smartphone className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  }

  function getBrowserName(userAgent: string | null): string {
    if (!userAgent) return "Unknown Browser";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Safari")) return "Safari";
    if (userAgent.includes("Edge")) return "Edge";
    return "Unknown Browser";
  }

  return (
    <div>
      <PageHeader
        title="Security"
        description="Manage your password and active sessions"
        actions={
          <Button variant="outline" asChild>
            <Link href="/profile">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Profile
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2 max-w-3xl">
        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="currentPassword">
                  Current Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={changingPw}
                />
              </div>
              <Separator />
              <div className="space-y-1">
                <Label htmlFor="newPassword">
                  New Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  disabled={changingPw}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirmPassword">
                  Confirm New Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  disabled={changingPw}
                />
              </div>
              <Button type="submit" disabled={changingPw} className="w-full">
                {changingPw && <LoadingSpinner className="mr-2" />}
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSessions ? (
              <LoadingState text="Loading sessions..." />
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active sessions found.</p>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div key={session.id} className="flex items-start gap-3 p-3 rounded-md border">
                    <div className="mt-0.5 text-muted-foreground">
                      {getDeviceIcon(session.userAgent)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                          {getBrowserName(session.userAgent)}
                        </span>
                        {session.isCurrent && (
                          <Badge variant="secondary" className="text-xs">Current</Badge>
                        )}
                      </div>
                      {session.ipAddress && (
                        <p className="text-xs text-muted-foreground">{session.ipAddress}</p>
                      )}
                      <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                        <p>Created: {formatDateTime(session.createdAt)}</p>
                        {session.lastActivityAt && (
                          <p>Last active: {formatDateTime(session.lastActivityAt)}</p>
                        )}
                      </div>
                    </div>
                    {!session.isCurrent && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive flex-shrink-0"
                        onClick={() => revokeSession(session.id)}
                        disabled={revokingId === session.id}
                        title="Revoke session"
                      >
                        {revokingId === session.id ? (
                          <LoadingSpinner />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
