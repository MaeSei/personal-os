import type { BriefingSuggestion, BriefingTimeBlockSuggestion } from "@/features/contracts/AssistantFeature";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import { BriefingSuggestionCard } from "./BriefingSuggestionCard";
import { spacingStyles } from "@/theme/spacing";

type BriefingSectionProps = {
  readonly description: string;
  readonly id: string;
  readonly suggestions: readonly (BriefingSuggestion | BriefingTimeBlockSuggestion)[];
  readonly title: string;
};

function BriefingSection(props: BriefingSectionProps) {
  return (
    <Section description={props.description} id={props.id} title={props.title}>
      {props.suggestions.length > 0 ? (
        <div className={spacingStyles.cardGrid}>
          {props.suggestions.map((suggestion, index) => (
            <BriefingSuggestionCard key={`${suggestion.title}-${index}`} suggestion={suggestion} />
          ))}
        </div>
      ) : (
        <EmptyState description="The evidence does not support a useful suggestion here." title="Nothing to add" />
      )}
    </Section>
  );
}

export { BriefingSection };
