import type { ComponentPropsWithRef, ReactNode } from "react";

import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type SectionProps = Omit<ComponentPropsWithRef<"section">, "id" | "title"> & {
  action?: ReactNode;
  description?: ReactNode;
  id: string;
  title: ReactNode;
};

/** Accessible page region with a consistent title, description, and action. */
function Section({
  action,
  children,
  className,
  description,
  id,
  title,
  ...props
}: SectionProps) {
  const titleId = `${id}-title`;

  return (
    <section
      aria-labelledby={titleId}
      className={cn(spacingStyles.section, className)}
      id={id}
      {...props}
    >
      <header className={spacingStyles.sectionHeader}>
        <div className="min-w-0">
          <h2
            className={cn(typographyStyles.sectionTitle, colorStyles.text.primary)}
            id={titleId}
          >
            {title}
          </h2>
          {description ? (
            <p
              className={cn(
                "mt-detail max-w-2xl",
                typographyStyles.description,
                colorStyles.text.muted,
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      {children}
    </section>
  );
}

export { Section, type SectionProps };
