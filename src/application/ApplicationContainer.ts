import { ServiceContainer } from "./ServiceContainer";
import type { AtlasFeatures } from "@/features/contracts/AtlasFeatures";
import type { CalendarOAuthFeature } from "@/features/contracts/CalendarFeature";
import type { RepositoryFactory } from "@/repositories/RepositoryFactory";

type ApplicationContainerOptions = ConstructorParameters<
  typeof ServiceContainer
>[1];

/** Top-level composition boundary for persistence and application behavior. */
class ApplicationContainer {
  readonly calendarOAuth: CalendarOAuthFeature;
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
    this.calendarOAuth = serviceContainer.calendarOAuth;
  }
}

export { ApplicationContainer };
export type { ApplicationContainerOptions };
