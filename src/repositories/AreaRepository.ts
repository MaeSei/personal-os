import type { Area } from "../domain";

/** Read boundary used to decide whether Atlas has been set up. */
interface AreaRepository {
  get(): Promise<readonly Area[]>;
  save(areas: readonly Area[]): Promise<void>;
}

export type { AreaRepository };
