import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "@/components/layout/Providers";

export const metadata: Metadata = {
  title: {
    default: process.env.NEXT_PUBLIC_APP_NAME ?? "Company ERP",
    template: `%s | ${process.env.NEXT_PUBLIC_APP_NAME ?? "Company ERP"}`,
  },
  description: "Enterprise Resource Planning System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
          <Toaster
            richColors
            position="top-right"
            duration={4000}
            toastOptions={{
              style: { fontSize: "13px" },
              classNames: {
                error: "border-destructive",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
