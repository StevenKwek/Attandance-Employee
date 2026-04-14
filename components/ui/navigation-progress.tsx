"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      // Route changed — complete the bar
      setProgress(100);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 400);
      prevPathname.current = pathname;
    }
  }, [pathname]);

  // Expose start function via custom event
  useEffect(() => {
    const handleStart = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setVisible(true);
      setProgress(20);
      timerRef.current = setTimeout(() => setProgress(60), 100);
      timerRef.current = setTimeout(() => setProgress(80), 400);
    };

    window.addEventListener("navigation-start", handleStart);
    return () => window.removeEventListener("navigation-start", handleStart);
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-0.5 pointer-events-none"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 300ms ease" }}
    >
      <div
        className="h-full bg-primary"
        style={{
          width: `${progress}%`,
          transition: progress === 100
            ? "width 200ms ease"
            : "width 400ms ease",
        }}
      />
    </div>
  );
}

export function startNavigation() {
  window.dispatchEvent(new Event("navigation-start"));
}
