"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { Area, InboxProjectInput, InboxTaskInput, Item, Project } from "@/domain";
import type {
  ProcessProjectInput,
  ProcessTaskInput,
} from "@/features/contracts/InboxFeature";
import { DeleteConfirmation } from "@/features/inbox/components/DeleteConfirmation";
import { ProjectTriageForm } from "@/features/inbox/components/ProjectTriageForm";
import { TaskTriageForm } from "@/features/inbox/components/TaskTriageForm";
import {
  TriageChoices,
  type TriageMode,
} from "@/features/inbox/components/TriageChoices";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

type InboxProcessingItemProps = {
  readonly areas: readonly Area[];
  readonly deleteItem: (itemId: string) => Promise<boolean>;
  readonly error: string | null;
  readonly isProcessing: boolean;
  readonly item: Item;
  readonly processProject: (input: ProcessProjectInput) => Promise<boolean>;
  readonly processReference: (itemId: string) => Promise<boolean>;
  readonly processSomeday: (itemId: string) => Promise<boolean>;
  readonly processTask: (input: ProcessTaskInput) => Promise<boolean>;
  readonly projects: readonly Project[];
  readonly remaining: number;
};

function InboxProcessingItem({
  areas,
  deleteItem,
  error,
  isProcessing,
  item,
  processProject,
  processReference,
  processSomeday,
  processTask,
  projects,
  remaining,
}: InboxProcessingItemProps) {
  const [mode, setMode] = useState<"choose" | TriageMode>("choose");

  return (
    <Card as="article" padding="lg">
      <div className={spacingStyles.cardStack}>
        <header className={spacingStyles.detailStack}>
          <Badge variant="neutral">
            {remaining} {remaining === 1 ? "Item" : "Items"} remaining
          </Badge>
          <h3 className={cn(typographyStyles.sectionTitle, colorStyles.text.primary)}>
            {item.title}
          </h3>
          {mode === "choose" ? (
            <p className={cn(typographyStyles.description, colorStyles.text.muted)}>
              What does this need to become?
            </p>
          ) : null}
        </header>

        {error ? (
          <p className={cn(typographyStyles.description, "text-danger")} role="alert">
            {error}
          </p>
        ) : null}

        {mode === "choose" ? (
          <TriageChoices
            disabled={isProcessing}
            onModeChange={setMode}
            onReference={() => void processReference(item.id)}
            onSomeday={() => void processSomeday(item.id)}
          />
        ) : null}
        {mode === "task" ? (
          <TaskTriageForm
            areas={areas}
            disabled={isProcessing}
            initialTitle={item.title}
            onBack={() => setMode("choose")}
            onSubmit={(input: InboxTaskInput) =>
              processTask({ ...input, itemId: item.id })
            }
            projects={projects}
          />
        ) : null}
        {mode === "project" ? (
          <ProjectTriageForm
            areas={areas}
            disabled={isProcessing}
            initialTitle={item.title}
            onBack={() => setMode("choose")}
            onSubmit={(input: InboxProjectInput) =>
              processProject({ ...input, itemId: item.id })
            }
          />
        ) : null}
        {mode === "delete" ? (
          <DeleteConfirmation
            disabled={isProcessing}
            onBack={() => setMode("choose")}
            onDelete={() => void deleteItem(item.id)}
          />
        ) : null}
      </div>
    </Card>
  );
}

export { InboxProcessingItem, type InboxProcessingItemProps };
