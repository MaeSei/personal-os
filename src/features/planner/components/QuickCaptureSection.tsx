import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type QuickCaptureSectionProps = { readonly inboxCount: number };

function QuickCaptureSection({ inboxCount }: QuickCaptureSectionProps) {
  return (
    <Section
      description="Capture first. Organise later. The global capture control stays available without changing the plan."
      id="quick-capture"
      title="Quick Capture"
    >
      <Card tone="accent">
        <div className="flex flex-col items-start justify-between gap-card sm:flex-row sm:items-center">
          <div className={spacingStyles.detailStack}>
            <Badge variant="attention">Press C on desktop</Badge>
            <p className={cn(typographyStyles.cardTitle, colorStyles.text.primary)}>Send one thought straight to Inbox.</p>
            <p className={cn(typographyStyles.description, colorStyles.text.muted)}>{inboxCount} {inboxCount === 1 ? "Item is" : "Items are"} waiting to be clarified.</p>
          </div>
          <ButtonLink href="/inbox" size="sm" variant="secondary">Process Inbox</ButtonLink>
        </div>
      </Card>
    </Section>
  );
}

export { QuickCaptureSection };
