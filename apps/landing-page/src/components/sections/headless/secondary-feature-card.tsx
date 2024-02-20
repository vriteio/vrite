import clsx from "clsx";
import Atropos from "atropos";
import type { ParentComponent } from "solid-js";
import { Icon } from "#components/primitives";
import { ParallaxCard } from "#components/fragments";

interface SecondaryFeatureCardProps {
  containerClass?: string;
  class?: string;
  title: string;
  icon: string;
  horizontal?: boolean;
}

const SecondaryFeatureCard: ParentComponent<SecondaryFeatureCardProps> = (props) => {
  return (
    <ParallaxCard containerClass={props.containerClass} class={props.class}>
      <div class="flex flex-col items-start justify-center h-full">
        <div>
          <div class="h-24 w-full flex justify-start items-center">
            <div class="relative">
              <Icon path={props.icon} class="h-20 w-20 fill-[url(#gradient)]" />
              <div class="absolute h-full w-full top-0 left-0 bg-gradient-to-tr opacity-30 dark:opacity-50 blur-xl"></div>
            </div>
          </div>
          <div class="flex justify-center items-center gap-2">
            <h2 class="text-2xl md:text-3xl !font-bold">{props.title}</h2>
          </div>
        </div>
        <p class="mt-2 flex-1 text-xl md:text-2xl text-gray-500 dark:text-gray-400">
          {props.children}
        </p>
      </div>
    </ParallaxCard>
  );
};

export { SecondaryFeatureCard };
