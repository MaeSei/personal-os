import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { BriefingSuggestion, BriefingTimeBlockSuggestion } from "@/features/contracts/AssistantFeature";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type BriefingSuggestionCardProps = {
  readonly suggestion: BriefingSuggestion | BriefingTimeBlockSuggestion;
};

function BriefingSuggestionCard({ suggestion }: BriefingSuggestionCardProps) {
  const block = "durationMinutes" in suggestion ? suggestion : null;
  return (
    <Card as="article" padding="sm">
      <div className={spacingStyles.detailStack}>
        <div className="flex flex-wrap items-center justify-between gap-cluster">
          <h3 className={typographyStyles.metricValue}>{suggestion.title}</h3>
          <div className={spacingStyles.cluster}>
            {block ? <Badge variant="neutral">{block.durationMinutes} min · {block.preferredWindow}</Badge> : null}
            <Badge variant="neutral">{Math.round(suggestion.confidence * 100)}%</Badge>
          </div>
        </div>
        <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
          {suggestion.reason}
        </p>
        <details>
          <summary className={cn("cursor-pointer", typographyStyles.label)}>Why Atlas suggests this</summary>
          <dl className={cn("mt-detail grid gap-detail sm:grid-cols-2", typographyStyles.description)}>
            {Object.entries(suggestion.evidence).map(([label, evidence]) => (
              <div key={label}>
                <dt className="capitalize text-muted">{label}</dt>
                <dd>{evidence.join(" · ")}</dd>
              </div>
            ))}
          </dl>
        </details>
      </div>
    </Card>
  );
}

export { BriefingSuggestionCard };
