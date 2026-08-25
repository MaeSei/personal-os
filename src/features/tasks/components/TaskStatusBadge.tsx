import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Status, type TaskStatus } from "@/domain";

type TaskStatusBadgeProps = { readonly status: TaskStatus };

const statusVariant: Record<TaskStatus, BadgeVariant> = {
  [Status.Active]: "attention",
  [Status.Archived]: "neutral",
  [Status.Blocked]: "blocked",
  [Status.Completed]: "success",
  [Status.Someday]: "neutral",
  [Status.Today]: "attention",
  [Status.Waiting]: "warning",
};

function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  return <Badge variant={statusVariant[status]}>{status}</Badge>;
}

export { TaskStatusBadge };
