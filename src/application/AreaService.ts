import type { Area } from "@/domain";
import type { AreaFeature } from "@/features/contracts/AreaFeature";
import type { AreaRepository } from "@/repositories/AreaRepository";

/** Application boundary for Area setup and discovery. */
class AreaService implements AreaFeature {
  constructor(
    private readonly areaRepository: AreaRepository,
  ) {}

  getAreas(): Promise<readonly Area[]> {
    return this.areaRepository.get();
  }

  saveAreas(areas: readonly Area[]): Promise<void> {
    return this.areaRepository.save(areas);
  }
}

export { AreaService };
