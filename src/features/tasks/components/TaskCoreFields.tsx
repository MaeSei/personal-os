import type { Area, Project, TaskStatus } from "@/domain";
import { taskStatuses } from "@/domain";
import {
  fieldClassName,
  fieldGroupClassName,
  labelClassName,
} from "@/components/forms/fieldStyles";
import type { TaskEditorValue } from "@/features/tasks/components/types";

type TaskCoreFieldsProps = {
  readonly areaId: string;
  readonly areas: readonly Area[];
  readonly idPrefix: string;
  readonly initialValue: TaskEditorValue;
  readonly onAreaChange: (areaId: string) => void;
  readonly onProjectChange: (projectId: string) => void;
  readonly projectId: string;
  readonly projects: readonly Project[];
  readonly showStatus: boolean;
};

function formatStatus(status: TaskStatus): string {
  return status === "Today" ? "Today" : status;
}

function TaskCoreFields({
  areaId,
  areas,
  idPrefix,
  initialValue,
  onAreaChange,
  onProjectChange,
  projectId,
  projects,
  showStatus,
}: TaskCoreFieldsProps) {
  const availableProjects = projects.filter(
    (project) => project.areaId === areaId,
  );

  return (
    <div className="grid gap-card @md:grid-cols-2">
      <div className={fieldGroupClassName}>
        <label className={labelClassName} htmlFor={`${idPrefix}-title`}>
          Task
        </label>
        <input
          autoFocus
          className={fieldClassName}
          defaultValue={initialValue.title}
          id={`${idPrefix}-title`}
          maxLength={200}
          name="title"
          required
        />
      </div>
      <div className={fieldGroupClassName}>
        <label className={labelClassName} htmlFor={`${idPrefix}-area`}>
          Area
        </label>
        <select
          className={fieldClassName}
          id={`${idPrefix}-area`}
          name="areaId"
          onChange={(event) => onAreaChange(event.target.value)}
          required
          value={areaId}
        >
          <option value="">Choose an Area</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.icon} {area.title}
            </option>
          ))}
        </select>
      </div>
      <div className={fieldGroupClassName}>
        <label className={labelClassName} htmlFor={`${idPrefix}-project`}>
          Project <span className="font-normal">(optional)</span>
        </label>
        <select
          className={fieldClassName}
          disabled={!areaId}
          id={`${idPrefix}-project`}
          name="projectId"
          onChange={(event) => onProjectChange(event.target.value)}
          value={projectId}
        >
          <option value="">No Project</option>
          {availableProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
        </select>
      </div>
      {showStatus ? (
        <div className={fieldGroupClassName}>
          <label className={labelClassName} htmlFor={`${idPrefix}-status`}>
            Status
          </label>
          <select
            className={fieldClassName}
            defaultValue={initialValue.status}
            id={`${idPrefix}-status`}
            name="status"
          >
            {taskStatuses.map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}

export { TaskCoreFields };
