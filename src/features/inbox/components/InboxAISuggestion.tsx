"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { InboxClassificationPreview } from "@/features/contracts/AssistantFeature";
import { useFeatures } from "@/features/FeatureProvider";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type InboxAISuggestionProps = {
  readonly disabled: boolean;
  readonly itemId: string;
  readonly onApply: (suggestion: InboxClassificationPreview) => void;
};

function InboxAISuggestion({ disabled, itemId, onApply }: InboxAISuggestionProps) {
  const { assistant } = useFeatures();
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<InboxClassificationPreview | null>(null);

  useEffect(() => {
    assistant.getStatus().then((status) => setEnabled(status.enabled)).catch(() => setEnabled(false));
  }, [assistant]);

  async function suggest() {
    setError(null);
    setIsLoading(true);
    try {
      setSuggestion(await assistant.suggestInboxItem(itemId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Atlas could not suggest fields.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!enabled) return null;
  return (
    <Card padding="sm" tone="subtle">
      <div className={spacingStyles.detailStack}>
        <div className="flex flex-wrap items-center justify-between gap-cluster">
          <div className={spacingStyles.cluster}>
            <Badge variant="neutral">AI suggestion</Badge>
            {suggestion ? <Badge variant="neutral">{Math.round(suggestion.confidence * 100)}% confidence</Badge> : null}
          </div>
          {!suggestion ? <Button disabled={disabled || isLoading} onClick={() => void suggest()} size="sm" variant="secondary">{isLoading ? "Considering…" : "Suggest fields"}</Button> : null}
        </div>
        {error ? <p className="text-danger" role="alert">{error}</p> : null}
        {suggestion ? (
          <>
            <p className={cn(typographyStyles.description, colorStyles.text.muted)}>{suggestion.reason}</p>
            <dl className="grid gap-detail sm:grid-cols-2">
              <div><dt className={typographyStyles.label}>Area</dt><dd>{suggestion.areaTitle ?? "Uncertain"}</dd></div>
              <div><dt className={typographyStyles.label}>Project</dt><dd>{suggestion.projectTitle ?? "None"}</dd></div>
              <div><dt className={typographyStyles.label}>Duration</dt><dd>{suggestion.estimatedDurationMinutes ? `${suggestion.estimatedDurationMinutes} minutes` : "Uncertain"}</dd></div>
              <div><dt className={typographyStyles.label}>Energy</dt><dd>{suggestion.energy ? `${suggestion.energy}/5` : "Uncertain"}</dd></div>
            </dl>
            <div className={spacingStyles.cluster}>
              <Button disabled={disabled} onClick={() => onApply(suggestion)} size="sm">Review and approve</Button>
              <Button disabled={disabled} onClick={() => setSuggestion(null)} size="sm" variant="ghost">Ignore</Button>
            </div>
          </>
        ) : null}
      </div>
    </Card>
  );
}

export { InboxAISuggestion };
