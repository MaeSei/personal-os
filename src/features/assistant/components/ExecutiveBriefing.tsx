"use client";

import { useEffect, useState } from "react";

import type { ExecutiveBriefing as Briefing } from "@/features/contracts/AssistantFeature";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { BriefingSection } from "./BriefingSection";
import { useFeatures } from "@/features/FeatureProvider";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

function ExecutiveBriefing() {
  const { assistant } = useFeatures();
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    assistant.getStatus().then((status) => setEnabled(status.enabled)).catch(() => setEnabled(false));
  }, [assistant]);

  async function generate() {
    setError(null);
    setIsLoading(true);
    try {
      setBriefing(await assistant.getExecutiveBriefing());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Atlas could not prepare the briefing.");
    } finally {
      setIsLoading(false);
    }
  }

  const sections = briefing ? [
    ["briefing-observations", "Observations", "What the current evidence says without turning it into a command.", briefing.observations],
    ["briefing-risks", "Today’s Risks", "Pressure, conflicts, and deadlines worth seeing before committing.", briefing.risks],
    ["briefing-opportunities", "Today’s Opportunities", "Useful openings supported by current capacity and context.", briefing.opportunities],
    ["briefing-workspace", "Suggested Workspace", "A proposal only. Add work to Today intentionally from the Workspace.", briefing.suggestedWorkspace],
    ["briefing-blocks", "Suggested Time Blocks", "Possible reservations. Nothing is scheduled automatically.", briefing.suggestedTimeBlocks],
    ["briefing-quick-wins", "Suggested Quick Wins", "Small actions that fit the evidence, not filler work.", briefing.quickWins],
    ["briefing-deep-work", "Suggested Deep Work", "Work that may deserve protected attention.", briefing.deepWork],
  ] as const : [];

  return (
    <PageContainer>
      <div className={spacingStyles.pageStack}>
        <PageHeader action={<div className={spacingStyles.cluster}><ButtonLink href="/" variant="secondary">Workspace</ButtonLink><ButtonLink href="/reflection" variant="ghost">Reflection</ButtonLink></div>} description="A concise, evidence-linked recommendation—not a chatbot and not an automatic plan." eyebrow="Executive Assistant" title={briefing?.greeting ?? "What deserves your attention today?"} />
        {!briefing ? (
          <Card padding="lg" tone="subtle">
            <div className={spacingStyles.cardStack}>
              <p className={cn(typographyStyles.body, colorStyles.text.muted)}>{enabled === false ? "Configure Atlas AI on the server to prepare a briefing. Your manual Workspace remains complete." : "Atlas will read today’s Review, Calendar, Projects, deadlines, historical Patterns, and structured Memory boundary."}</p>
              {error ? <p className="text-danger" role="alert">{error}</p> : null}
              <Button disabled={!enabled || isLoading} onClick={() => void generate()}>{isLoading ? "Preparing…" : "Generate Executive Briefing"}</Button>
            </div>
          </Card>
        ) : (
          <>
            <Card padding="lg" tone="accent"><p className={typographyStyles.label}>Attention Budget</p><p className={typographyStyles.display}>{briefing.attentionBudget === null ? "Not reviewed" : `${briefing.attentionBudget}%`}</p></Card>
            {sections.map(([id, title, description, suggestions]) => <BriefingSection description={description} id={id} key={id} suggestions={suggestions} title={title} />)}
            <Button onClick={() => void generate()} variant="secondary">Refresh briefing</Button>
          </>
        )}
      </div>
    </PageContainer>
  );
}

export { ExecutiveBriefing };
