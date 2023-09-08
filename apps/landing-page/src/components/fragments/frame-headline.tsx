import clsx from "clsx";
import { Component, createSignal } from "solid-js";
import { Button, Image } from "#components/primitives";
import editorImageDark from "#assets/images/dark/editor.png";
import editorImageLight from "#assets/images/light/editor.png";

interface FrameHeadlineProps {
  class?: string;
  gradient?: boolean;
}

const FrameHeadline: Component<FrameHeadlineProps> = (props) => {
  const [headline, setHeadline] = createSignal(0);
  const keywordClass = (): string => {
    return clsx(
      "absolute h-9 md:h-12 w-full",
      !props.gradient && "bg-clip-text text-transparent bg-gradient-to-tr"
    );
  };

  setInterval(() => {
    setHeadline(() => {
      if (headline() === 2) {
        return 0;
      }

      return headline() + 1;
    });
  }, 2000);

  return (
    <div
      class={clsx(
        ":base: flex justify-start items-start md:items-center w-full flex-col-reverse md:flex-row h-64 relative",
        props.class
      )}
    >
      <div class="z-1">
        <div class="flex justify-start">
          <Button badge text="soft" class="font-semibold text-center" color="contrast">
            Public Beta
          </Button>
        </div>
        <h1 class="text-4xl md:text-5xl font-extrabold" style={{ perspective: "600px" }}>
          <div
            style={{
              "transform-style": "preserve-3d",
              "transition": "transform .33s",
              "transform": `translateZ(-25px) rotateX(${-90 + headline() * 90}deg)`
            }}
            class="h-9 md:h-12 w-[250px] relative font-extrabold"
          >
            <div
              class={keywordClass()}
              style={{
                "transform": "rotateX(90deg) translateZ(25px)",
                "backface-visibility": "hidden"
              }}
            >
              <span>Create</span>
            </div>
            <div
              class={keywordClass()}
              style={{
                "transform": "rotateY(0deg) translateZ(25px)",
                "backface-visibility": "hidden"
              }}
            >
              <span>Manage</span>
            </div>
            <div
              class={keywordClass()}
              style={{
                "transform": "rotateX(-90deg) translateZ(25px)",
                "backface-visibility": "hidden"
              }}
            >
              <span>Deliver</span>
            </div>
          </div>{" "}
          <span
            class={clsx(
              "font-bold",
              props.gradient && "text-white text-opacity-90",
              !props.gradient && "dark:text-white text-gray-700 dark:text-opacity-90"
            )}
          >
            technical content
          </span>
        </h1>
        <p class="max-w-md mt-4 text-lg md:text-xl">
          Dedicated <b>headless Content Management System (CMS)</b> for your programming blogs,
          documentation, and more.
        </p>
      </div>
      <div class="flex-1 flex justify-center items-center relative h-full">
        <Image
          class="max-h-full min-w-[16rem] md:absolute right-0 hero-image shadow-2xl rounded-2xl border-2 border-gray-200 dark:border-gray-700 gradient-image-mask overflow-hidden w-full z-0"
          srcDark={editorImageDark.src}
          srcLight={editorImageLight.src}
          alt="Vrite Kanban dashboard"
        />
      </div>
    </div>
  );
};

export { FrameHeadline };
