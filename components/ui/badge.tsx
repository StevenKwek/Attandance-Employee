import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive/10 text-destructive",
        outline: "border border-border text-foreground",
        success: "bg-success/10 text-success",
        warning: "bg-warning/10 text-warning",
        info: "bg-info/10 text-info",
        hadir: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        terlambat: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        tidak_hadir: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        izin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        aktif: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        nonaktif: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
