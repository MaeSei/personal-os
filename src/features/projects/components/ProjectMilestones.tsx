"use client";

import { useState, type FormEvent } from "react";

import { fieldClassName, fieldGroupClassName, labelClassName } from "@/components/forms/fieldStyles";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import { Status, isTask, type ProjectMilestone } from "@/domain";
import type { ProjectMilestoneInput } from "@/features/contracts/ProjectFeature";
import { formatCalendarDate } from "@/features/projects/presentation";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type ProjectMilestonesProps = {
  readonly disabled: boolean;
  readonly milestones: readonly ProjectMilestone[];
  readonly onCreate: (input: ProjectMilestoneInput) => Promise<boolean>;
  readonly onDelete: (milestoneId: string) => Promise<boolean>;
  readonly onSetCompleted: (milestoneId: string, completed: boolean) => Promise<boolean>;
};

function ProjectMilestones(props: ProjectMilestonesProps) {
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const saved = await props.onCreate({
      description: String(form.get("description") ?? "") || null,
      dueDate: String(form.get("dueDate") ?? "") || null,
      title: String(form.get("title") ?? ""),
    });
    if (saved) setAdding(false);
  }

  return (
    <Section
      action={<Button disabled={props.disabled} onClick={() => setAdding(true)} size="sm">Add Milestone</Button>}
      description="Meaningful outcome checkpoints, not arbitrary Task buckets."
      id="project-milestones"
      title="Milestones"
    >
      {adding ? (
        <Card tone="subtle">
          <form className={spacingStyles.cardStack} onSubmit={create}>
            <div className={fieldGroupClassName}>
              <label className={labelClassName} htmlFor="milestone-title">Milestone</label>
              <input autoFocus className={fieldClassName} id="milestone-title" maxLength={200} name="title" required />
            </div>
            <div className={fieldGroupClassName}>
              <label className={labelClassName} htmlFor="milestone-description">
                Completion condition <span className="font-normal">(optional)</span>
              </label>
              <textarea
                className={fieldClassName}
                id="milestone-description"
                maxLength={500}
                name="description"
                rows={2}
              />
            </div>
            <div className={fieldGroupClassName}>
              <label className={labelClassName} htmlFor="milestone-date">
                Target date <span className="font-normal">(optional)</span>
              </label>
              <input className={fieldClassName} id="milestone-date" name="dueDate" type="date" />
            </div>
            <div className={spacingStyles.cluster}>
              <Button disabled={props.disabled} type="submit">
                {props.disabled ? "Saving…" : "Create Milestone"}
              </Button>
              <Button disabled={props.disabled} onClick={() => setAdding(false)} variant="ghost">Cancel</Button>
            </div>
          </form>
        </Card>
      ) : null}
      {props.milestones.length === 0 ? (
        <EmptyState description="Add checkpoints only when the outcome genuinely needs them." title="No Milestones" />
      ) : (
        <div className={spacingStyles.cardGrid}>
          {props.milestones.map((milestone) => {
            const completed = milestone.status === Status.Completed;
            const taskCount = milestone.children.filter(isTask).length;
            return (
              <Card as="article" key={milestone.id}>
                <div className={spacingStyles.cardStack}>
                  <header className={spacingStyles.detailStack}>
                    <div className="flex items-start justify-between gap-cluster">
                      <h3 className={typographyStyles.cardTitle}>{milestone.title}</h3>
                      <Badge variant={completed ? "success" : "attention"}>{completed ? "Achieved" : "Current"}</Badge>
                    </div>
                    {milestone.description ? (
                      <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
                        {milestone.description}
                      </p>
                    ) : null}
                    <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
                      {taskCount} {taskCount === 1 ? "Task" : "Tasks"}
                      {milestone.dueDate
                        ? ` · Target ${formatCalendarDate(milestone.dueDate)}`
                        : ""}
                    </p>
                  </header>
                  <div className={spacingStyles.cluster}>
                    <Button
                      disabled={props.disabled}
                      onClick={() => void props.onSetCompleted(milestone.id, !completed)}
                      size="sm"
                      variant="secondary"
                    >
                      {completed ? "Reopen" : "Mark achieved"}
                    </Button>
                    {confirmDelete === milestone.id ? (
                      <>
                        <Button disabled={props.disabled} onClick={() => void props.onDelete(milestone.id)} size="sm" variant="danger">Remove Milestone</Button>
                        <Button onClick={() => setConfirmDelete(null)} size="sm" variant="ghost">Keep</Button>
                      </>
                    ) : (
                      <Button disabled={props.disabled} onClick={() => setConfirmDelete(milestone.id)} size="sm" variant="ghost">Delete</Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Section>
  );
}

export { ProjectMilestones };
