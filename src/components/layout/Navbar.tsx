"use client";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SyncStatusIndicator } from "./SyncStatusIndicator";
import { UserMenu } from "./UserMenu";

interface NavbarProps {
  onMenuToggle: () => void;
  onCollapseToggle: () => void;
  collapsed: boolean;
}

export function Navbar({ onMenuToggle, onCollapseToggle, collapsed }: NavbarProps) {
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
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:flex"
          onClick={onCollapseToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <SyncStatusIndicator />
        <UserMenu />
      </div>
    </header>
  );
}
