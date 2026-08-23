import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { radiusStyles } from "@/theme/radius";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type BadgeVariant = keyof typeof colorStyles.badge;

type BadgeProps = ComponentPropsWithoutRef<"span"> & {
  variant?: BadgeVariant;
};

/** Compact, non-interactive status label with semantic color variants. */
function Badge({
  children,
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center",
        radiusStyles.pill,
        spacingStyles.badge,
        typographyStyles.label,
        colorStyles.badge[variant],
        className,
      )}
      data-slot="badge"
      {...props}
    >
      {children}
    </span>
  );
}

export { Badge, type BadgeProps, type BadgeVariant };
