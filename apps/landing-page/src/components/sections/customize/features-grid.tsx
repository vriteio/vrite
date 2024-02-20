import { For, type Component } from "solid-js";
import clsx from "clsx";
import { Image } from "#components/primitives";
import { Observed, ParallaxCard } from "#components/fragments";
import rolesImageDark from "#assets/images/dark/roles.png";
import rolesImageLight from "#assets/images/light/roles.png";
import customizeImageDark from "#assets/images/dark/customize.png";
import customizeImageLight from "#assets/images/light/customize.png";
import extensionsImageDark from "#assets/images/dark/extensions.png";
import extensionsImageLight from "#assets/images/light/extensions.png";

const FeaturesGrid: Component = () => {
  const features = [
    {
      imageDark: extensionsImageDark,
      imageLight: extensionsImageLight,
      imageAlt: "Vrite extensions",
      title: "Extension system",
      description: (
        <>Customize your content, automate workflows, and integrate with your favorite tools.</>
      )
    },
    {
      imageDark: customizeImageDark,
      imageLight: customizeImageLight,
      imageAlt: "Vrite formatting customization",
      title: "Built-in customization",
      description: (
        <>
          Make Vrite your own, by customizing everything from the UI to built-in metadata and
          formatting options.
        </>
      )
    },
    {
      imageDark: rolesImageDark,
      imageLight: rolesImageLight,
      imageAlt: "Vrite role-based access control",
      title: "Permission system",
      description: (
        <>
          Collaborate with your team with ease, while maintain full control with Vrite's role-based
          access system.
        </>
      )
    }
  ];

  return (
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <For each={features}>
        {(feature, index) => {
          return (
            <Observed
              class={clsx(
                "transition-all duration-500 ease-out",
                index() === 1 && "delay-125",
                index() === 2 && "delay-250"
              )}
              outOfViewClass="opacity-0 translate-y-4"
            >
              <ParallaxCard class="bg-gray-100 dark:bg-gray-900 m-0 overflow-hidden relative p-4 md:p-8 border-0 !rounded-3xl">
                <div
                  class="rounded-2xl absolute w-full -left-4 -top-24 -rotate-15 h-80"
                  style={{
                    "mask-image": "linear-gradient(to top,transparent, black)"
                  }}
                >
                  <Image
                    alt={feature.imageAlt}
                    srcDark={feature.imageDark}
                    srcLight={feature.imageLight}
                    class="gradient-image-mask rounded-2xl opacity-90"
                  />
                </div>
                <div class="h-40"></div>
                <div class="flex justify-start items-center gap-2">
                  <h2 class="text-2xl md:text-3xl !font-bold">{feature.title}</h2>
                </div>
                <p class="mt-2 flex-1 text-xl md:text-2xl text-gray-500 dark:text-gray-400">
                  {feature.description}
                </p>
              </ParallaxCard>
            </Observed>
          );
        }}
      </For>
    </div>
  );
};

export { FeaturesGrid };
