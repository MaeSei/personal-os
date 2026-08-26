"use client";

import { useEffect, useState } from "react";

import type { ReflectionObservation, ReflectionResult } from "@/features/contracts/AssistantFeature";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { useFeatures } from "@/features/FeatureProvider";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

function ObservationCard({ observation }: { readonly observation: ReflectionObservation }) {
  return (
    <Card as="article" padding="sm">
      <div className={spacingStyles.detailStack}>
        <div className="flex items-start justify-between gap-cluster">
          <p className={typographyStyles.metricValue}>{observation.summary}</p>
          <Badge variant="neutral">{Math.round(observation.confidence * 100)}%</Badge>
        </div>
        <ul className={cn("list-disc pl-card", typographyStyles.description, colorStyles.text.muted)}>
          {observation.evidence.map((evidence) => <li key={evidence}>{evidence}</li>)}
        </ul>
      </div>
    </Card>
  );
}

function ReflectionGroup({ id, title, items }: { readonly id: string; readonly items: readonly ReflectionObservation[]; readonly title: string }) {
  return (
    <Section description="Based only on stored Atlas history and deterministic evidence." id={id} title={title}>
      {items.length > 0 ? <div className={spacingStyles.cardGrid}>{items.map((item, index) => <ObservationCard key={`${item.summary}-${index}`} observation={item} />)}</div> : <EmptyState description="Atlas does not have enough evidence for a responsible statement." title="Not enough evidence yet" />}
    </Section>
  );
}

function ReflectionCoach() {
  const { assistant } = useFeatures();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ReflectionResult | null>(null);
  useEffect(() => {
    assistant.getStatus().then((status) => setEnabled(status.enabled)).catch(() => setEnabled(false));
  }, [assistant]);
  async function generate() {
    setError(null);
    setIsLoading(true);
    try {
      setResult(await assistant.getReflection());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Atlas could not prepare reflection.");
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <PageContainer>
      <div className={spacingStyles.pageStack}>
        <PageHeader action={<div className={spacingStyles.cluster}><ButtonLink href="/briefing" variant="secondary">Briefing</ButtonLink><ButtonLink href="/" variant="ghost">Workspace</ButtonLink></div>} description="Understand recorded tendencies without grading yourself or changing tomorrow’s plan." eyebrow="Reflection Coach" title="What can the evidence teach you?" />
        {!result ? (
          <Card padding="lg" tone="subtle"><div className={spacingStyles.cardStack}><p className={cn(typographyStyles.body, colorStyles.text.muted)}>{enabled === false ? "Configure Atlas AI on the server to phrase reflections. Deterministic Analytics and Patterns remain unchanged." : "Atlas will use Analytics, Patterns, historical Reviews, Task outcomes, and Planning history."}</p>{error ? <p className="text-danger" role="alert">{error}</p> : null}<Button disabled={!enabled || isLoading} onClick={() => void generate()}>{isLoading ? "Reflecting…" : "Generate Reflection"}</Button></div></Card>
        ) : (
          <><ReflectionGroup id="reflection" items={result.reflections} title="Reflection" /><ReflectionGroup id="learning" items={result.learnings} title="Learning" /><ReflectionGroup id="reflection-suggestions" items={result.suggestions} title="Suggestions" /><Button onClick={() => void generate()} variant="secondary">Refresh reflection</Button></>
        )}
      </div>
    </PageContainer>
  );
}

export { ReflectionCoach };
