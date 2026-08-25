import type { Area } from "@/domain";

/** Feature-facing Area use cases. The implementation is selected elsewhere. */
interface AreaFeature {
  getAreas(): Promise<readonly Area[]>;
  saveAreas(areas: readonly Area[]): Promise<void>;
}

export type { AreaFeature };
