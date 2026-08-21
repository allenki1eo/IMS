"use client";
import { Suspense, useState } from "react";
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

function LoginForm() {
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
    <div className="w-full max-w-sm">
      {/* Mark + wordmark above the card, Vercel-style */}
      <div className="mb-8 flex flex-col items-center gap-4">
        <svg
          viewBox="0 0 76 65"
          className="h-9 w-9 fill-white"
          aria-hidden="true"
        >
          <path d="M37.59.25l36.95 64H.64l36.95-64z" />
        </svg>
        <h1 className="text-2xl font-semibold tracking-tight text-gradient">
          {process.env.NEXT_PUBLIC_APP_NAME ?? "Company ERP"}
        </h1>
      </div>

      <Card className="w-full border-white/10 bg-white/[0.03] backdrop-blur-sm shadow-2xl">
      <CardHeader className="space-y-1 text-center pb-4">
        <CardTitle className="text-base font-medium text-white">Sign in</CardTitle>
        <CardDescription className="text-white/50">
          Enter your credentials to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-white/70">Username or Email</Label>
            <Input
              id="username"
              placeholder="Enter username or email"
              autoComplete="username"
              autoFocus
              className="border-white/10 bg-white/[0.06] text-white placeholder:text-white/30 focus-visible:ring-[#0070f3]"
              {...register("username")}
            />
            {errors.username && (
              <p className="text-xs text-red-400">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-white/70">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                autoComplete="current-password"
                className="pr-10 border-white/10 bg-white/[0.06] text-white placeholder:text-white/30 focus-visible:ring-[#0070f3]"
                {...register("password")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-400">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-white text-black hover:bg-white/90"
            disabled={isSubmitting}
          >
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

      <p className="mt-6 text-center text-xs text-white/30">
        Secured with encrypted sessions
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm h-96" />}>
      <LoginForm />
    </Suspense>
  );
}
