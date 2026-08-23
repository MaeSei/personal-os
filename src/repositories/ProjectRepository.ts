import type { Project } from "../domain";

/** Storage-independent read boundary for Project containers. */
interface ProjectRepository {
  getProjects(): Promise<readonly Project[]>;
}

export type { ProjectRepository };
