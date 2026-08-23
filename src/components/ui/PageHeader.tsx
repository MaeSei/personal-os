import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type PageHeaderProps = ComponentPropsWithoutRef<"header"> & {
  action?: ReactNode;
  description: ReactNode;
  eyebrow: ReactNode;
  eyebrowVariant?: BadgeVariant;
  title: ReactNode;
};

/** Shared page introduction with a stable responsive type hierarchy. */
function PageHeader({
  action,
  className,
  description,
  eyebrow,
  eyebrowVariant = "attention",
  title,
  ...props
}: PageHeaderProps) {
  return (
    <header className={cn(spacingStyles.pageHeader, className)} {...props}>
      <Badge variant={eyebrowVariant}>{eyebrow}</Badge>
      <h1 className={cn(typographyStyles.display, colorStyles.text.primary)}>
        {title}
      </h1>
      <p
        className={cn(
          "max-w-2xl",
          typographyStyles.lead,
          colorStyles.text.muted,
        )}
      >
        {description}
      </p>
      {action ? <div className={spacingStyles.cluster}>{action}</div> : null}
    </header>
  );
}

export { PageHeader, type PageHeaderProps };
