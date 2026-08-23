import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import type { AreaProjectGroup as AreaProjectGroupData } from "@/domain";
import { AreaProjectGroup } from "@/features/mission-control/components/AreaProjectGroup";
import { cn } from "@/lib/cn";
import { spacingStyles } from "@/theme/spacing";

type AreasSectionProps = {
  groups: readonly AreaProjectGroupData[];
};

function AreasSection({ groups }: AreasSectionProps) {
  return (
    <Section
      description="Projects organize actions around an outcome and the part of life it supports."
      id="areas"
      title="Areas"
    >
      {groups.length === 0 ? (
        <EmptyState
          description="Choose the parts of life you want Atlas to protect."
          title="No Areas yet"
        />
      ) : (
        <div className={cn(spacingStyles.cardGrid, "lg:grid-cols-2")}>
          {groups.map((group) => (
            <AreaProjectGroup group={group} key={group.area.id} />
          ))}
        </div>
      )}
    </Section>
  );
}

export { AreasSection, type AreasSectionProps };
