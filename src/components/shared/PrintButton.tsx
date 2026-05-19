"use client";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrintButtonProps {
  label?: string;
  className?: string;
}

export function PrintButton({ label = "Print", className }: PrintButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={() => window.print()}
    >
      <Printer className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}
