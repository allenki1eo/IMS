"use client";
import { useState, useEffect } from "react";

export type OnlineStatus = "online" | "offline" | "checking";

export function useOnlineStatus(): OnlineStatus {
  const [status, setStatus] = useState<OnlineStatus>("checking");

  useEffect(() => {
    const check = async () => {
      if (!navigator.onLine) { setStatus("offline"); return; }
      try {
        const res = await fetch("/api/auth/me", { method: "HEAD" });
        setStatus(res.status !== 0 ? "online" : "offline");
      } catch {
        setStatus("offline");
      }
    };

    check();
    const interval = setInterval(check, 15_000);
    window.addEventListener("online", () => setStatus("online"));
    window.addEventListener("offline", () => setStatus("offline"));

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", () => setStatus("online"));
      window.removeEventListener("offline", () => setStatus("offline"));
    };
  }, []);

  return status;
}
