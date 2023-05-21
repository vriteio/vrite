import { Observed } from "./observed";
import type { Component } from "solid-js";
import dashboardImageDark from "#assets/images/dark/dashboard.png";
import dashboardImageLight from "#assets/images/light/dashboard.png";
import { Image } from "#components/primitives";

const HeadlineImage: Component = () => {
  return (
    <Observed
      class="relative flex items-end justify-center flex-1 h-full transition-all ease-out transform md:items-center duration-250 delay-100 -z-10"
      outOfViewClass="invisible opacity-0 scale-0"
    >
      <Image
        class="max-h-full -z-10 md:absolute right-0 hero-image md:w-[55rem] max-w-[calc(100vw-4rem)] shadow-2xl rounded-2xl border-2 border-gray-200 dark:border-gray-700 gradient-image-mask overflow-hidden"
        srcDark={dashboardImageDark}
        srcLight={dashboardImageLight}
        alt="Vrite Kanban dashboard"
      ></Image>
    </Observed>
  );
};

export { HeadlineImage };
