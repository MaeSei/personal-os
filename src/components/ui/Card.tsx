import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { motionStyles } from "@/theme/motion";
import { radiusStyles } from "@/theme/radius";
import { shadowStyles } from "@/theme/shadows";
import { spacingStyles } from "@/theme/spacing";

type CardPadding = keyof typeof spacingStyles.cardPadding;
type CardTone = keyof typeof colorStyles.card;

type CardProps = ComponentPropsWithoutRef<"div"> & {
  as?: "article" | "div";
  hoverable?: boolean;
  padding?: CardPadding;
  tone?: CardTone;
};

type CardRegionPadding = keyof typeof spacingStyles.cardRegionPadding;
type CardHeaderProps = ComponentPropsWithoutRef<"header"> & {
  padding?: CardRegionPadding;
};
type CardBodyProps = ComponentPropsWithoutRef<"div"> & {
  padding?: CardRegionPadding;
};
type CardFooterProps = ComponentPropsWithoutRef<"footer"> & {
  padding?: CardRegionPadding;
};

/** Base surface for grouped content. Use padding="none" with compound regions. */
function Card({
  as: Component = "div",
  className,
  hoverable = false,
  padding = "md",
  tone = "default",
  ...props
}: CardProps) {
  return (
    <Component
      className={cn(
        "border",
        radiusStyles.card,
        shadowStyles.card,
        spacingStyles.cardPadding[padding],
        colorStyles.card[tone],
        hoverable && [
          colorStyles.cardHover,
          motionStyles.surface,
          shadowStyles.cardHover,
        ],
        className,
      )}
      data-slot="card"
      {...props}
    />
  );
}

function CardHeader({
  className,
  padding = "md",
  ...props
}: CardHeaderProps) {
  return (
    <header
      className={cn(
        spacingStyles.detailStack,
        spacingStyles.cardRegionPadding[padding],
        className,
      )}
      data-slot="card-header"
      {...props}
    />
  );
}

function CardBody({
  className,
  padding = "md",
  ...props
}: CardBodyProps) {
  return (
    <div
      className={cn(spacingStyles.cardRegionPadding[padding], className)}
      data-slot="card-body"
      {...props}
    />
  );
}

function CardFooter({
  className,
  padding = "md",
  ...props
}: CardFooterProps) {
  return (
    <footer
      className={cn(
        "items-center",
        spacingStyles.cluster,
        spacingStyles.cardRegionPadding[padding],
        className,
      )}
      data-slot="card-footer"
      {...props}
    />
  );
}

export {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  type CardBodyProps,
  type CardFooterProps,
  type CardHeaderProps,
  type CardProps,
};
