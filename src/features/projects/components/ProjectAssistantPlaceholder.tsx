import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

function ProjectAssistantPlaceholder() {
  return (
    <Section
      description="A reserved boundary for future, user-approved assistance."
      id="project-assistant"
      title="AI Project Assistant"
    >
      <Card tone="subtle">
        <div className={spacingStyles.detailStack}>
          <Badge variant="neutral">Future</Badge>
          <p className={cn(typographyStyles.body, colorStyles.text.primary)}>
            Atlas may later help clarify the outcome, propose a breakdown, or
            summarize Project evidence.
          </p>
          <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
            No AI is connected. Future suggestions will remain previews and
            require approval before changing Project data.
          </p>
        </div>
      </Card>
    </Section>
  );
}

export { ProjectAssistantPlaceholder };
