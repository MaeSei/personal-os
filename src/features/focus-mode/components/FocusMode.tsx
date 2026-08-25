import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import type { FocusSessionData } from "@/features/contracts/FocusFeature";
import { FocusChecklist } from "@/features/focus-mode/components/FocusChecklist";
import { FocusNotes } from "@/features/focus-mode/components/FocusNotes";
import { FocusSwitch } from "@/features/focus-mode/components/FocusSwitch";
import { FocusTimer } from "@/features/focus-mode/components/FocusTimer";
import { TaskMetadata } from "@/features/tasks/components/TaskMetadata";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type FocusModeProps = {
  readonly data: FocusSessionData;
  readonly disabled: boolean;
  readonly error: string | null;
  readonly message: string;
  readonly onAddChecklistItem: (title: string) => Promise<void>;
  readonly onComplete: () => void;
  readonly onPause: () => void;
  readonly onRemoveChecklistItem: (id: string) => Promise<void>;
  readonly onResume: () => void;
  readonly onSaveNotes: (notes: string | null) => Promise<void>;
  readonly onSwitch: (taskId: string) => Promise<void>;
  readonly onToggleChecklistItem: (id: string, completed: boolean) => Promise<void>;
};

/** Calm execution surface for one task and its session-scoped working context. */
function FocusMode(props: FocusModeProps) {
  const task = props.data.plan.currentFocus;
  const session = props.data.session;

  return (
    <PageContainer>
      <div className={cn(spacingStyles.contentNarrow, spacingStyles.pageStack)}>
        <PageHeader
          action={<ButtonLink href="/" variant="secondary">Workspace</ButtonLink>}
          description="Stay with one task. Time, notes, and small working steps remain together until you choose what comes next."
          eyebrow="Now"
          title="Focus Session"
        />

        <p aria-live="polite" className="sr-only" role="status">{props.message}</p>
        {props.error ? (
          <p className={cn(typographyStyles.description, colorStyles.text.danger)} role="alert">
            {props.error}
          </p>
        ) : null}

        <Section id="current-task" title="Current task">
          {task ? (
            <Card aria-busy={props.disabled} as="article" padding="lg" tone="accent">
              <div className={spacingStyles.cardStack}>
                <div>
                  <h2 className={cn(typographyStyles.display, colorStyles.text.primary)}>
                    {task.title}
                  </h2>
                  {task.description ? (
                    <p className={cn("mt-detail", typographyStyles.lead, colorStyles.text.muted)}>
                      {task.description}
                    </p>
                  ) : null}
                </div>
                {props.data.relatedProject ? (
                  <div className={spacingStyles.detailStack}>
                    <p className={cn(typographyStyles.label, colorStyles.text.muted)}>Related project</p>
                    <a
                      className={cn(typographyStyles.cardTitle, colorStyles.text.primary, colorStyles.focusRing)}
                      href={`/projects/${encodeURIComponent(props.data.relatedProject.id)}`}
                    >
                      {props.data.relatedProject.title}
                    </a>
                    <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
                      {props.data.relatedProject.outcome}
                    </p>
                  </div>
                ) : null}
                <TaskMetadata task={task} />
                <div className={spacingStyles.cluster}>
                  <Button disabled={props.disabled} onClick={props.onComplete} size="lg">
                    Complete task
                  </Button>
                  <ButtonLink href={`/tasks/${encodeURIComponent(task.id)}`} size="lg" variant="ghost">
                    Task details
                  </ButtonLink>
                </div>
              </div>
            </Card>
          ) : (
            <Card padding="lg" tone="subtle">
              <div className={spacingStyles.cardStack}>
                <p className={cn(typographyStyles.cardTitle, colorStyles.text.primary)}>
                  No current task.
                </p>
                <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
                  Choose a task from today&apos;s workspace when you are ready to begin.
                </p>
                <div className={spacingStyles.cluster}>
                  <ButtonLink href="/" variant="secondary">Open Workspace</ButtonLink>
                </div>
              </div>
            </Card>
          )}
        </Section>

        {task && session ? (
          <Section
            description="Everything here belongs to this task's work session, not to a prescribed productivity method."
            id="session-tools"
            title="Session"
          >
            <div className="grid gap-card lg:grid-cols-2">
              <FocusTimer
                disabled={props.disabled}
                onPause={props.onPause}
                onResume={props.onResume}
                session={session}
              />
              <FocusChecklist
                disabled={props.disabled}
                items={session.checklist}
                onAdd={props.onAddChecklistItem}
                onRemove={props.onRemoveChecklistItem}
                onToggle={props.onToggleChecklistItem}
              />
              <FocusNotes key={task.id} disabled={props.disabled} notes={session.notes} onSave={props.onSaveNotes} />
              <FocusSwitch key={task.id} disabled={props.disabled} onSwitch={props.onSwitch} tasks={props.data.switchTasks} />
            </div>
          </Section>
        ) : null}
      </div>
    </PageContainer>
  );
}

export { FocusMode, type FocusModeProps };
