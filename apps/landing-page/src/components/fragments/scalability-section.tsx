import { Observed } from "./observed";
import { Section } from "./section";
import { UseCasesSection } from "./use-cases-section";
import { FeatureCard } from "./feature-card";
import { Component, For } from "solid-js";
import { mdiAccountGroup, mdiConnection, mdiPuzzle } from "@mdi/js";
import collaborationGraphicDark from "#assets/graphics/dark/collaboration.png";
import apiIntegrationImageDark from "#assets/graphics/dark/api-integration.png";
import collaborationGraphicLight from "#assets/graphics/light/collaboration.png";
import apiIntegrationImageLight from "#assets/graphics/light/api-integration.png";

const features = [
  {
    imageDark: collaborationGraphicDark,
    imageLight: collaborationGraphicLight,
    imageAlt: "Collaboration",
    header: "Collaboration",
    label: "Say hi!",
    alt: "Collaboration",
    icon: mdiAccountGroup,
    vertical: true,
    content: (
      <>Edit, comment, collaborate - Vrite provides everything you need for great team work.</>
    )
  },
  {
    imageDark: apiIntegrationImageDark,
    imageLight: apiIntegrationImageLight,
    imageAlt: "Vrite API & Extensions",
    header: "Vrite API & Extensions",
    gradient: true,
    label: "Build up",
    alt: "Vrite API & Extensions",
    icon: mdiPuzzle,
    vertical: true,
    content: (
      <>
        Customize your editing experience and publish content easily thanks to various Vrite
        Extensions. Integrate with any frontend thanks to full REST API interface, with dedicated
        SDKs.
      </>
    )
  }
];
const ScalabilitySection: Component = () => {
  return (
    <Section>
      <div class="flex flex-col md:flex-row gap-12 pb-4 max-w-[40rem]">
        <div class="flex-1">
          <h2 class="text-3xl md:text-4xl pb-4">Content production at scale</h2>
          <p class="text-xl md:text-2xl">
            Whether you're working solo, in a small team, or a large organization, Vrite scales in
            all aspects of content production - from writing to publishing.
          </p>
        </div>
      </div>
      <div class="grid max-w-screen-xl grid-cols-1 gap-4 md:grid-cols-2">
        <For each={features}>
          {(feature, index) => {
            return (
              <Observed
                class="transform transition-all duration-500 ease-out"
                outOfViewClass="invisible translate-y-1/3"
                style={{ "transition-delay": `${100 * index()}ms` }}
              >
                <FeatureCard {...feature} />
              </Observed>
            );
          }}
        </For>
        <Observed
          class="transform transition-all duration-500 ease-out md:col-span-2"
          outOfViewClass="invisible translate-y-1/3"
        >
          <UseCasesSection />
        </Observed>
      </div>
    </Section>
  );
};

export { ScalabilitySection };
