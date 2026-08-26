"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import type { ProjectBreakdownPreview } from "@/features/contracts/AssistantFeature";
import { useFeatures } from "@/features/FeatureProvider";
import { ProjectBreakdownPreview as Preview } from "./ProjectBreakdownPreview";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type AIProjectAssistantProps = {
  readonly onAccepted: () => Promise<void>;
  readonly projectId: string;
};

function toggle(current: ReadonlySet<string>, id: string, selected: boolean) {
  const next = new Set(current);
  if (selected) next.add(id);
  else next.delete(id);
  return next;
}

function AIProjectAssistant({ onAccepted, projectId }: AIProjectAssistantProps) {
  const { assistant } = useFeatures();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [preview, setPreview] = useState<ProjectBreakdownPreview | null>(null);
  const [selectedMilestones, setSelectedMilestones] = useState<Set<string>>(new Set());
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    assistant.getStatus().then((status) => setEnabled(status.enabled)).catch(() => setEnabled(false));
  }, [assistant]);

  async function generate() {
    setError(null);
    setIsBusy(true);
    try {
      const result = await assistant.proposeProjectBreakdown(projectId);
      setPreview(result);
      setSelectedMilestones(new Set(result.proposal.milestones.map(({ id }) => id)));
      setSelectedTasks(new Set(result.proposal.tasks.map(({ id }) => id)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Atlas could not prepare suggestions.");
    } finally {
      setIsBusy(false);
    }
  }

  async function accept() {
    if (!preview) return;
    setError(null);
    setIsBusy(true);
    try {
      await assistant.acceptProjectBreakdown({
        acceptedMilestoneIds: [...selectedMilestones],
        acceptedTaskIds: [...selectedTasks],
        preview,
      });
      setPreview(null);
      await onAccepted();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Atlas could not accept those suggestions.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Section description="Suggestions remain drafts until you choose exactly what to add." id="project-assistant" title="AI Project Assistant">
      <Card tone="subtle">
        <div className={spacingStyles.cardStack}>
          <div className="flex flex-wrap items-center justify-between gap-cluster">
            <Badge variant={enabled ? "success" : "neutral"}>{enabled ? "Available" : "Optional"}</Badge>
            {!preview ? <Button disabled={!enabled || isBusy} onClick={() => void generate()}>{isBusy ? "Thinking…" : "Break this down"}</Button> : null}
          </div>
          {enabled === false ? <p className={cn(typographyStyles.description, colorStyles.text.muted)}>Configure the server-only AI provider to enable suggestions. Manual breakdown remains available.</p> : null}
          {error ? <p className="text-danger" role="alert">{error}</p> : null}
          {preview ? (
            <>
              <Preview disabled={isBusy} onMilestoneChange={(id, selected) => setSelectedMilestones((current) => toggle(current, id, selected))} onTaskChange={(id, selected) => setSelectedTasks((current) => toggle(current, id, selected))} preview={preview} selectedMilestones={selectedMilestones} selectedTasks={selectedTasks} />
              <div className={spacingStyles.cluster}>
                <Button disabled={isBusy || selectedMilestones.size + selectedTasks.size === 0} onClick={() => void accept()}>{isBusy ? "Adding…" : "Accept selected"}</Button>
                <Button disabled={isBusy} onClick={() => { setSelectedMilestones(new Set(preview.proposal.milestones.map(({ id }) => id))); setSelectedTasks(new Set(preview.proposal.tasks.map(({ id }) => id))); }} variant="secondary">Select all</Button>
                <Button disabled={isBusy} onClick={() => setPreview(null)} variant="ghost">Accept none</Button>
              </div>
            </>
          ) : null}
        </div>
      </Card>
    </Section>
  );
}

export { AIProjectAssistant };
