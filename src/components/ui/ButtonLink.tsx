import type { ComponentPropsWithoutRef } from "react";

import {
  getButtonClassName,
  type ButtonSize,
  type ButtonVariant,
} from "@/components/ui/Button";

type ButtonLinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> & {
  href: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

/** Contextual navigation with the same feedback and focus contract as Button. */
function ButtonLink({
  className,
  href,
  size = "md",
  variant = "primary",
  ...props
}: ButtonLinkProps) {
  return (
    <a
      className={getButtonClassName({ className, size, variant })}
      data-slot="button-link"
      href={href}
      {...props}
    />
  );
}

export { ButtonLink, type ButtonLinkProps };
