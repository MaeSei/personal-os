import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Area, Project } from "@/domain";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type FinishStepProps = {
  areas: readonly Area[];
  nextActionTitle: string;
  onFinish: () => void;
  project: Project;
};

function FinishStep({
  areas,
  nextActionTitle,
  onFinish,
  project,
}: FinishStepProps) {
  return (
    <PageContainer>
      <div className={cn(spacingStyles.contentNarrow, spacingStyles.pageStack)}>
        <PageHeader
          description="Your first outcome and its Project are saved in this browser. Atlas is ready to help you decide what deserves attention."
          eyebrow="Step 4 of 4"
          title="Your Atlas is ready."
        />
        <Card padding="lg" tone="accent">
          <div className={spacingStyles.cardStack}>
            <div className={spacingStyles.detailStack}>
              <p className={cn(typographyStyles.label, colorStyles.text.accent)}>
                First Project
              </p>
              <p className={cn(typographyStyles.sectionTitle, colorStyles.text.primary)}>
                {project.title}
              </p>
              <div className={spacingStyles.detailStack}>
                <p
                  className={cn(
                    typographyStyles.label,
                    colorStyles.text.accent,
                  )}
                >
                  Outcome
                </p>
                <p
                  className={cn(
                    typographyStyles.description,
                    colorStyles.text.muted,
                  )}
                >
                  {project.outcome}
                </p>
              </div>
              <div className={spacingStyles.detailStack}>
                <p
                  className={cn(
                    typographyStyles.label,
                    colorStyles.text.accent,
                  )}
                >
                  Active next action
                </p>
                <p className={typographyStyles.cardTitle}>{nextActionTitle}</p>
              </div>
            </div>
            <ul aria-label="Selected Areas" className={spacingStyles.cluster}>
              {areas.map((area) => (
                <li key={area.id}>
                  <Badge variant="neutral">
                    <span aria-hidden="true">{area.icon}</span> {area.title}
                  </Badge>
                </li>
              ))}
            </ul>
            <div className={spacingStyles.cluster}>
              <Button onClick={onFinish} size="lg">
                Open Workspace
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}

export { FinishStep, type FinishStepProps };
