import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

function TaskFuture() {
  return (
    <Section
      description="Reserved extension points, without speculative controls today."
      id="task-future"
      title="Later"
    >
      <Card tone="subtle">
        <ul className={cn(spacingStyles.detailStack, typographyStyles.description, colorStyles.text.muted)}>
          <li><strong className={colorStyles.text.primary}>AI suggestions</strong> can propose changes here, with explicit approval before any write.</li>
          <li><strong className={colorStyles.text.primary}>Review history</strong> can connect outcomes and retrospective evidence to this Task.</li>
        </ul>
      </Card>
    </Section>
  );
}

export { TaskFuture };
