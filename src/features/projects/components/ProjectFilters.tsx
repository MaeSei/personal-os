import {
  fieldClassName,
  fieldGroupClassName,
  formGridClassName,
  labelClassName,
} from "@/components/forms/fieldStyles";
import { projectStatuses, type Area, type ProjectFilters as Filters } from "@/domain";

type ProjectFiltersProps = {
  readonly areas: readonly Area[];
  readonly filters: Filters;
  readonly onChange: (filters: Filters) => void;
};

function ProjectFilters({ areas, filters, onChange }: ProjectFiltersProps) {
  return (
    <div className={formGridClassName}>
      <div className={fieldGroupClassName}>
        <label className={labelClassName} htmlFor="project-search">
          Search
        </label>
        <input
          className={fieldClassName}
          id="project-search"
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Search title or outcome"
          type="search"
          value={filters.search ?? ""}
        />
      </div>
      <div className={fieldGroupClassName}>
        <label className={labelClassName} htmlFor="project-area-filter">
          Area
        </label>
        <select
          className={fieldClassName}
          id="project-area-filter"
          onChange={(event) => onChange({ ...filters, areaId: event.target.value })}
          value={filters.areaId ?? "all"}
        >
          <option value="all">All Areas</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.icon} {area.title}
            </option>
          ))}
        </select>
      </div>
      <div className={fieldGroupClassName}>
        <label className={labelClassName} htmlFor="project-status-filter">
          Status
        </label>
        <select
          className={fieldClassName}
          id="project-status-filter"
          onChange={(event) => onChange({ ...filters, status: event.target.value as Filters["status"] })}
          value={filters.status ?? "Active"}
        >
          <option value="all">All statuses</option>
          {projectStatuses.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>
      <div className={fieldGroupClassName}>
        <label className={labelClassName} htmlFor="project-sort">
          Sort
        </label>
        <select
          className={fieldClassName}
          id="project-sort"
          onChange={(event) => onChange({ ...filters, sort: event.target.value as Filters["sort"] })}
          value={filters.sort ?? "activity"}
        >
          <option value="activity">Recent activity</option>
          <option value="title">Title</option>
          <option value="area">Area</option>
          <option value="progress">Progress</option>
        </select>
      </div>
    </div>
  );
}

export { ProjectFilters };
