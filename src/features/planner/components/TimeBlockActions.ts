import type {
  TimeBlockUpdateInput,
  TimeBlockWriteInput,
} from "@/features/contracts/PlannerFeature";

type TimeBlockActions = {
  readonly onCreate: (input: TimeBlockWriteInput) => Promise<boolean>;
  readonly onDelete: (blockId: string) => Promise<boolean>;
  readonly onDuplicate: (blockId: string, start: number) => void;
  readonly onLinkProject: (blockId: string, projectId: string) => void;
  readonly onLinkTask: (blockId: string, taskId: string) => void;
  readonly onLock: (blockId: string, locked: boolean) => void;
  readonly onMerge: (firstBlockId: string, secondBlockId: string) => Promise<boolean>;
  readonly onMove: (blockId: string, start: number) => void;
  readonly onResize: (blockId: string, end: number) => void;
  readonly onSplit: (blockId: string, splitAt: number) => void;
  readonly onUnlinkProject: (blockId: string, projectId: string) => Promise<boolean>;
  readonly onUnlinkTask: (blockId: string, taskId: string) => Promise<boolean>;
  readonly onUpdate: (blockId: string, input: TimeBlockUpdateInput) => void;
};

export type { TimeBlockActions };
