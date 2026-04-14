"use client";

import { ThemeProvider } from "next-themes";
import { NavigationProgress } from "@/components/ui/navigation-progress";
import { AuthProvider } from "@/lib/hooks/use-auth";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
    >
      <NavigationProgress />
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
