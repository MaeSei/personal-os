import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";

type PageContainerProps = ComponentPropsWithoutRef<"main">;

/** Centers page content within Atlas's responsive 1200px layout boundary. */
function PageContainer({ className, ...props }: PageContainerProps) {
  return (
    <main
      className={cn(spacingStyles.pageContainer, colorStyles.page, className)}
      data-slot="page-container"
      {...props}
    />
  );
}

export { PageContainer, type PageContainerProps };
