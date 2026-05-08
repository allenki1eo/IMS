"use client";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SyncStatusIndicator } from "./SyncStatusIndicator";
import { UserMenu } from "./UserMenu";

interface NavbarProps {
  onMenuToggle: () => void;
}

export function Navbar({ onMenuToggle }: NavbarProps) {
  return (
    <header className="h-14 border-b bg-background/95 backdrop-blur-sm flex items-center justify-between px-4 gap-4 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuToggle}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <SyncStatusIndicator />
        <UserMenu />
      </div>
    </header>
  );
}
