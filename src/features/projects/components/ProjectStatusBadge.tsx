import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Status, type ProjectStatus } from "@/domain";

type ProjectStatusBadgeProps = {
  readonly status: ProjectStatus;
};

const statusVariant: Record<ProjectStatus, BadgeVariant> = {
  [Status.Active]: "attention",
  [Status.Archived]: "neutral",
  [Status.Blocked]: "blocked",
  [Status.Completed]: "success",
  [Status.Someday]: "neutral",
  [Status.Waiting]: "warning",
};

function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  return <Badge variant={statusVariant[status]}>{status}</Badge>;
}

export { ProjectStatusBadge };
