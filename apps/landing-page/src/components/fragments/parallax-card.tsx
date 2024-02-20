import Atropos from "atropos";
import clsx from "clsx";
import type { ParentComponent } from "solid-js";
import { Card } from "#components/primitives";

interface ParallaxCardProps {
  containerClass?: string;
  class?: string;
}

const ParallaxCard: ParentComponent<ParallaxCardProps> = (props) => {
  return (
    <div
      class={clsx("h-full w-full feature-highlight", props.containerClass)}
      ref={(element) => {
        Atropos({
          el: element,
          rotateXMax: 10,
          rotateYMax: 10,
          rotateTouch: false
        });
      }}
    >
      <div class="atropos-scale h-full">
        <div class="atropos-rotate h-full">
          <Card
            class={clsx(
              "atropos-inner h-full p-4 m-0 md:p-8 border-0 rounded-3xl block atropos bg-gray-100 dark:bg-gray-900",
              props.class
            )}
          >
            {props.children}
          </Card>
        </div>
      </div>
    </div>
  );
};

export { ParallaxCard };
