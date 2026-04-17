"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const prevPathname = useRef(pathname);

  const clearTimers = () => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current = [];
  };

  useEffect(() => {
    if (pathname === prevPathname.current) {
      return;
    }

    prevPathname.current = pathname;
    clearTimers();

    // Schedule updates asynchronously to avoid cascading renders in the effect body.
    timersRef.current.push(
      setTimeout(() => {
        setVisible(true);
        setProgress(100);
      }, 0)
    );
    timersRef.current.push(
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 400)
    );

    return clearTimers;
  }, [pathname]);

  // Expose start function via custom event
  useEffect(() => {
    const handleStart = () => {
      clearTimers();
      setVisible(true);
      setProgress(20);
      timersRef.current.push(setTimeout(() => setProgress(60), 100));
      timersRef.current.push(setTimeout(() => setProgress(80), 400));
    };

    window.addEventListener("navigation-start", handleStart);
    return () => {
      window.removeEventListener("navigation-start", handleStart);
      clearTimers();
    };
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
