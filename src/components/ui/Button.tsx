import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { motionStyles } from "@/theme/motion";
import { radiusStyles } from "@/theme/radius";
import { shadowStyles } from "@/theme/shadows";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type ButtonSize = keyof typeof spacingStyles.buttonSize;
type ButtonVariant = keyof typeof colorStyles.button;

type ButtonProps = ComponentPropsWithRef<"button"> & {
  size?: ButtonSize;
  variant?: ButtonVariant;
};

type ButtonStyleOptions = {
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

function getButtonClassName({
  className,
  size = "md",
  variant = "primary",
}: ButtonStyleOptions) {
  return cn(
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0",
    radiusStyles.control,
    spacingStyles.buttonSize[size],
    typographyStyles.button,
    colorStyles.button[variant],
    colorStyles.focusRing,
    motionStyles.control,
    variant !== "ghost" && [
      shadowStyles.control,
      shadowStyles.controlHover,
    ],
    className,
  );
}

/** Native button with consistent visual, sizing, focus, and disabled states. */
function Button({
  className,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={getButtonClassName({ className, size, variant })}
      data-slot="button"
      type={type}
      {...props}
    />
  );
}

export {
  Button,
  getButtonClassName,
  type ButtonProps,
  type ButtonSize,
  type ButtonStyleOptions,
  type ButtonVariant,
};
