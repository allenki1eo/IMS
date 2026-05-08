"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getInitials, formatDateTime } from "@/lib/utils";

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

export default function ProfilePage() {
  const { user: authUser } = useCurrentUser();
  const [profile, setProfile] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!authUser) return;
    fetch(`/api/users/${authUser.id}`)
      .then((r) => r.json())
      .then((d) => {
        const u = d.data;
        setProfile(u);
        if (u) {
          setFullName(u.fullName);
          setPhone(u.phone ?? "");
        }
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [authUser]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authUser || !fullName) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${authUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone: phone || undefined,
        }),
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

  if (loading || !authUser) return <LoadingState />;
  if (!profile) return <div className="text-muted-foreground">Profile not found.</div>;

  return (
    <div>
      <PageHeader
        title="My Profile"
        description="View and edit your personal information"
        actions={
          <Button variant="outline" asChild>
            <Link href="/profile/security">Security Settings</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Edit form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 text-lg">
                <AvatarFallback>{getInitials(profile.fullName)}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold text-lg">{profile.fullName}</h2>
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="fullName">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  readOnly
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Contact an administrator to change your email.</p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 000 0000"
                  disabled={saving}
                />
              </div>

              <Button type="submit" disabled={saving}>
                {saving && <LoadingSpinner className="mr-2" />}
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account Info</CardTitle>
            </CardHeader>
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Roles</CardTitle>
            </CardHeader>
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
        </div>
      </div>
    </div>
  );
}
