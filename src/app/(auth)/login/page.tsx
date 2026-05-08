"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/shared/LoadingState";
import { loginSchema, type LoginInput } from "@/modules/auth/auth.validation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Login failed");
        return;
      }

      if (json.data.mustChangePassword) {
        router.push("/change-password");
      } else {
        router.push(callbackUrl);
      }
    } catch {
      toast.error("Cannot connect to server. Check your network.");
    }
  };

  return (
    <Card className="w-full max-w-sm shadow-2xl">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-2 h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-lg">ERP</span>
        </div>
        <CardTitle className="text-2xl font-bold">
          {process.env.NEXT_PUBLIC_APP_NAME ?? "Company ERP"}
        </CardTitle>
        <CardDescription>Sign in to your account to continue</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username">Username or Email</Label>
            <Input
              id="username"
              placeholder="Enter username or email"
              autoComplete="username"
              autoFocus
              {...register("username")}
            />
            {errors.username && (
              <p className="text-xs text-destructive">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                autoComplete="current-password"
                className="pr-10"
                {...register("password")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <LoadingSpinner className="mr-2" />
            ) : (
              <LogIn className="mr-2 h-4 w-4" />
            )}
            Sign In
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
