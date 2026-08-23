import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";

type DividerProps = ComponentPropsWithoutRef<"hr">;

/** Semantic horizontal separator using the shared border color. */
function Divider({ className, ...props }: DividerProps) {
  return (
    <hr
      className={cn("border-0 border-t", colorStyles.divider, className)}
      data-slot="divider"
      {...props}
    />
  );
}

export { Divider, type DividerProps };
