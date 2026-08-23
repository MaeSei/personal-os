import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { AreaColor, AreaProjectGroup as AreaProjectGroupData } from "@/domain";
import { ProjectSummary } from "@/features/mission-control/components/ProjectSummary";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type AreaProjectGroupProps = {
  group: AreaProjectGroupData;
};

const badgeVariantByColor: Record<AreaColor, BadgeVariant> = {
  amber: "warning",
  green: "attention",
  neutral: "neutral",
};

function AreaProjectGroup({ group }: AreaProjectGroupProps) {
  const { area, projects } = group;

  return (
    <Card as="article" padding="lg">
      <div className={spacingStyles.cardStack}>
        <header className={spacingStyles.detailStack}>
          <h3>
            <Badge
              className="gap-detail"
              variant={badgeVariantByColor[area.color]}
            >
              <span aria-hidden="true">{area.icon}</span>
              {area.title}
            </Badge>
          </h3>
          <p
            className={cn(
              typographyStyles.description,
              colorStyles.text.muted,
            )}
          >
            {area.description}
          </p>
        </header>
        {projects.length === 0 ? (
          <p
            className={cn(
              typographyStyles.description,
              colorStyles.text.muted,
            )}
          >
            No projects in this Area yet.
          </p>
        ) : (
          <ul className={cn(spacingStyles.itemList, colorStyles.itemList)}>
            {projects.map((project) => (
              <ProjectSummary key={project.id} project={project} />
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

export { AreaProjectGroup, type AreaProjectGroupProps };
