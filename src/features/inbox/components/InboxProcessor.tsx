"use client";

import { useEffect, useRef, type ReactNode } from "react";

import type {
  ProcessProjectInput,
  ProcessTaskInput,
} from "@/features/contracts/InboxFeature";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Area, Item, Project } from "@/domain";
import { InboxProcessingItem } from "@/features/inbox/components/InboxProcessingItem";
import { ProjectFirstTaskPrompt } from "@/features/inbox/components/ProjectFirstTaskPrompt";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { radiusStyles } from "@/theme/radius";

type InboxProcessorProps = {
  readonly addFirstTask: (title: string) => Promise<boolean>;
  readonly areas: readonly Area[];
  readonly deleteItem: (itemId: string) => Promise<boolean>;
  readonly error: string | null;
  readonly focusVersion: number;
  readonly finishProject: () => void;
  readonly isLoading: boolean;
  readonly isProcessing: boolean;
  readonly items: readonly Item[];
  readonly processProject: (input: ProcessProjectInput) => Promise<boolean>;
  readonly processReference: (itemId: string) => Promise<boolean>;
  readonly processSomeday: (itemId: string) => Promise<boolean>;
  readonly processTask: (input: ProcessTaskInput) => Promise<boolean>;
  readonly projectFollowUp: Project | null;
  readonly projects: readonly Project[];
};

function InboxProcessor(props: InboxProcessorProps) {
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (props.focusVersion > 0) regionRef.current?.focus();
  }, [props.focusVersion]);

  let content: ReactNode;

  if (props.isLoading) {
    content = (
      <EmptyState
        description="Reading your saved thoughts."
        status="status"
        title="Loading your Inbox"
      />
    );
  } else if (props.projectFollowUp) {
    content = (
      <ProjectFirstTaskPrompt
        disabled={props.isProcessing}
        error={props.error}
        onAdd={props.addFirstTask}
        onLater={props.finishProject}
        project={props.projectFollowUp}
      />
    );
  } else if (!props.items[0]) {
    content = (
      <EmptyState
        description={
          props.error
            ? "Your saved thoughts have not been changed."
            : "Everything has a place. Capture anything you do not want to hold in your head."
        }
        status={props.error ? "alert" : undefined}
        title={props.error ?? "Your Inbox is clear"}
      />
    );
  } else {
    const item = props.items[0];
    content = (
      <InboxProcessingItem
        areas={props.areas}
        deleteItem={props.deleteItem}
        error={props.error}
        isProcessing={props.isProcessing}
        item={item}
        key={item.id}
        processProject={props.processProject}
        processReference={props.processReference}
        processSomeday={props.processSomeday}
        processTask={props.processTask}
        projects={props.projects}
        remaining={props.items.length}
      />
    );
  }

  return (
    <div
      aria-label="Inbox processing"
      className={cn(radiusStyles.card, colorStyles.focusRing)}
      ref={regionRef}
      tabIndex={-1}
    >
      {content}
    </div>
  );
}

export { InboxProcessor, type InboxProcessorProps };
