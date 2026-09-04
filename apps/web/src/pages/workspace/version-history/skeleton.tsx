import { Skeleton } from "@andesine/components";
import clsx from "clsx";
import { type Component } from "solid-js";

const VERSION_ITEM_HEIGHT = "2.75rem";

const VersionHistorySkeleton: Component = () => {
  return (
    <div class="flex flex-col gap-0.5">
      {["w-36", "w-44", "w-32", "w-40"].map((className) => (
        <div class="flex items-center gap-1.5 px-1" style={{ height: VERSION_ITEM_HEIGHT }}>
          <div class="flex items-start gap-1.5">
            <Skeleton class="h-5 w-5 rounded-md" />
            <div class="flex flex-1 flex-col gap-1">
              <Skeleton class={[clsx(`h-5 rounded-md`, className), "h-3 w-24 rounded-[0.25rem]"]} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export { VERSION_ITEM_HEIGHT, VersionHistorySkeleton };
