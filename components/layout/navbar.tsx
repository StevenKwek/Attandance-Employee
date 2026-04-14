"use client";

import { useState, useEffect } from "react";
import { Bell, Search, Sun, Moon, Menu, X } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, getInitials } from "@/lib/hooks/use-auth";

interface NavbarProps {
  onMenuClick: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { theme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { profile } = useAuth();

  useEffect(() => setMounted(true), []);

  const displayName = profile?.name ?? "—";
  const displayRole = profile?.role === "admin" ? "Admin" : "Karyawan";
  const initials = profile?.name ? getInitials(profile.name) : "?";

  return (
    <header className="h-14 sm:h-16 flex items-center justify-between px-3 sm:px-6 bg-card border-b border-card-border shrink-0 gap-2 sm:gap-4">

      {/* Left: hamburger (mobile) + search */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
          aria-label="Buka menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative flex-1 max-w-xs hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Cari karyawan, laporan..."
            className="pl-9 bg-background border-transparent focus-visible:border-transparent h-9"
          />
        </div>

        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="sm:hidden flex items-center justify-center w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
          aria-label="Cari"
        >
          {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
        </button>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Dark mode toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="text-muted-foreground hover:text-foreground w-9 h-9"
        >
          {mounted && (theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />)}
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground hover:text-foreground w-9 h-9"
            >
              <Bell className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 sm:w-80">
            <DropdownMenuLabel>Notifikasi</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              Tidak ada notifikasi baru
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile display */}
        <div className="flex items-center gap-2 p-1.5">
          <Avatar className="w-7 h-7 sm:w-8 sm:h-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{displayRole}</p>
          </div>
        </div>
      </div>

      {/* Mobile search bar (expanded) */}
      {searchOpen && (
        <div className="absolute top-14 left-0 right-0 z-30 px-3 py-2 bg-card border-b border-card-border sm:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Cari karyawan, laporan..."
              className="pl-9 h-9"
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  );
}
