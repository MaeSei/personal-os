import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type WelcomeStepProps = {
  onContinue: () => void;
};

function WelcomeStep({ onContinue }: WelcomeStepProps) {
  return (
    <PageContainer>
      <div className={cn(spacingStyles.contentNarrow, spacingStyles.pageStack)}>
        <PageHeader
          description="Atlas helps you decide where attention belongs, without turning your life into a list."
          eyebrow="Step 1 of 4"
          title="Welcome to Atlas."
        />
        <Card padding="lg" tone="accent">
          <div className={spacingStyles.cardStack}>
            <p className={cn(typographyStyles.lead, colorStyles.text.primary)}>
              Begin with the few parts of life that deserve a clear place.
            </p>
            <div className={spacingStyles.cluster}>
              <Button onClick={onContinue} size="lg">
                Create your Areas
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}

export { WelcomeStep, type WelcomeStepProps };
