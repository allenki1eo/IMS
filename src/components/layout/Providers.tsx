"use client";
import { ThemeProvider } from "next-themes";
import { SWRProvider } from "@/providers/SWRProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <SWRProvider>
        {children}
      </SWRProvider>
    </ThemeProvider>
  );
}
