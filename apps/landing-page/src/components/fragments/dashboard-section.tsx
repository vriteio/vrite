import { Observed } from "./observed";
import { Section } from "./section";
import { FeatureCard, TextFeatureCard } from "./feature-card";
import { Component, For, Show } from "solid-js";
import { mdiViewDashboard, mdiDatabase, mdiFileImportOutline, mdiMagnify } from "@mdi/js";
import clsx from "clsx";
import dashboardGraphicDark from "#assets/graphics/dark/dashboard.png";
import postSettingsGraphicDark from "#assets/graphics/dark/post-settings.png";
import dashboardImageDark from "#assets/images/dark/dashboard.png";
import dashboardGraphicLight from "#assets/graphics/light/dashboard.png";
import postSettingsGraphicLight from "#assets/graphics/light/post-settings.png";
import dashboardImageLight from "#assets/images/light/dashboard.png";
import { Image } from "#components/primitives";

const features = [
  {
    imageDark: dashboardGraphicDark,
    imageLight: dashboardGraphicLight,
    header: "Integrated kanban",
    label: "All inclusive",
    imageAlt: "Kanban dashboard",
    icon: mdiViewDashboard,
    reverse: true,
    content: (
      <>
        Manage all the content, easily with workspaces and Kanban dashboard. Model your content
        production stages and publish with a simple drag and drop.
      </>
    )
  },
  {
    imageDark: postSettingsGraphicDark,
    imageLight: postSettingsGraphicLight,
    header: "Customizable metadata",
    label: "So meta",
    imageAlt: "Metadata panel",
    icon: mdiDatabase,
    secondary: true,
    gradient: true,
    vertical: true,
    content: (
      <>
        Writers, deadlines, tags - you name it! Add and customize all the metadata for every single
        piece of content. Manage content easier and publish faster with all the data in one place.
      </>
    )
  }
];
const secondaryFeatures = [
  {
    icon: mdiFileImportOutline,
    header: "Data imports",
    label: "Few clicks to come in",
    comingSoon: true,
    text: "Make your move in easier and faster thanks to easy import from Trello, Dropbox Paper, and Notion."
  },
  {
    icon: mdiMagnify,
    header: "Advanced search",
    label: "Find it all",
    comingSoon: true,
    text: "Query any content, title, or metadata. Find and organize anything anytime you need."
  }
];
const DashboardSection: Component = () => {
  return (
    <Section>
      <div class="flex flex-col lg:flex-row-reverse gap-12 pb-4">
        <div class="flex-[2] gradient-image-mask max-h-[20rem]">
          <Image
            alt="Vrite Kanban dashboard"
            srcDark={dashboardImageDark}
            srcLight={dashboardImageLight}
            class="rounded-2xl"
          />
        </div>
        <div class="flex-1">
          <h2 class="text-3xl md:text-4xl pb-4">Kanban dashboard</h2>
          <p class="text-xl md:text-2xl">
            Scalable content management the way developers are familiar with.
          </p>
        </div>
      </div>
      <div class="grid max-w-screen-xl grid-cols-1 gap-4 md:grid-cols-1">
        <For each={features}>
          {(feature) => {
            return (
              <Observed
                class="transform transition-all duration-500 ease-out"
                outOfViewClass="invisible translate-y-1/3"
              >
                <div class={clsx(feature.secondary && "flex gap-4 flex-col-reverse md:flex-row")}>
                  <FeatureCard {...feature} />
                  <Show when={feature.secondary}>
                    <div class="flex justify-start items-center flex-col gap-4">
                      <For each={secondaryFeatures}>
                        {(secondaryFeature, index) => {
                          return (
                            <Observed
                              class={clsx("transform transition-all duration-500 ease-out flex-1")}
                              style={{
                                "transition-delay": `${100 * index()}ms`
                              }}
                              outOfViewClass="invisible translate-y-1/3"
                            >
                              <TextFeatureCard {...secondaryFeature} class="md:p-8 lg:p-12" />
                            </Observed>
                          );
                        }}
                      </For>
                    </div>
                  </Show>
                </div>
              </Observed>
            );
          }}
        </For>
      </div>
    </Section>
  );
};

export { DashboardSection };
