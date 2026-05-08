"use client";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Lock, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/shared/LoadingState";
import { changePasswordSchema, type ChangePasswordInput } from "@/modules/auth/auth.validation";

export default function ChangePasswordPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordInput) => {
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to change password");
        return;
      }
      toast.success("Password changed successfully");
      router.push("/");
    } catch {
      toast.error("Network error. Please try again.");
    }
  };

  return (
    <Card className="w-full max-w-sm shadow-2xl">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
          <Lock className="h-6 w-6 text-amber-600" />
        </div>
        <CardTitle className="text-xl font-bold">Set New Password</CardTitle>
        <CardDescription>
          You must set a new password before continuing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input id="currentPassword" type="password" autoComplete="current-password" {...register("currentPassword")} />
            {errors.currentPassword && <p className="text-xs text-destructive">{errors.currentPassword.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New Password</Label>
            <Input id="newPassword" type="password" autoComplete="new-password" {...register("newPassword")} />
            {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message}</p>}
            <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
              <li className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> At least 8 characters</li>
              <li className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> One uppercase letter</li>
              <li className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> One number</li>
            </ul>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input id="confirmPassword" type="password" autoComplete="new-password" {...register("confirmPassword")} />
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <LoadingSpinner className="mr-2" />}
            Change Password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
