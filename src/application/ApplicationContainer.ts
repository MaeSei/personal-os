import { ServiceContainer } from "./ServiceContainer";
import type { AtlasFeatures } from "@/features/contracts/AtlasFeatures";
import type { RepositoryFactory } from "@/repositories/RepositoryFactory";

type ApplicationContainerOptions = ConstructorParameters<
  typeof ServiceContainer
>[1];

/** Top-level composition boundary for persistence and application behavior. */
class ApplicationContainer {
  readonly features: AtlasFeatures;

  constructor(
    repositoryFactory: RepositoryFactory,
    options: ApplicationContainerOptions,
  ) {
    const serviceContainer = new ServiceContainer(
      repositoryFactory.create(),
      options,
    );

    this.features = serviceContainer.features;
  }
}

export { ApplicationContainer };
export type { ApplicationContainerOptions };
