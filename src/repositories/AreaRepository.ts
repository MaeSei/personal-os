import type { Area } from "../domain";

/** Read boundary used to decide whether Atlas has been set up. */
interface AreaRepository {
  getAreas(): Promise<readonly Area[]>;
  saveAreas(areas: readonly Area[]): Promise<void>;
}

export type { AreaRepository };
