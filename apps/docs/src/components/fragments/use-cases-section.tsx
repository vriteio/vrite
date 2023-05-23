import { Component, createSignal, For, onMount } from "solid-js";
import "keen-slider/keen-slider.min.css";
import KeenSlider, { KeenSliderInstance, KeenSliderPlugin } from "keen-slider";
import { mdiChevronLeft, mdiChevronRight, mdiLightbulbGroup } from "@mdi/js";
import { Card, IconButton } from "#components/primitives";

const autoSwitch: KeenSliderPlugin = (slider) => {
  let timeout = 0;
  let mouseOver = false;

  const clearNextTimeout = (): void => {
    clearTimeout(timeout);
  };
  const nextTimeout = (): void => {
    clearTimeout(timeout);
    if (mouseOver) return;

    timeout = window.setTimeout(() => {
      slider.next();
    }, 5000);
  };

  slider.on("created", () => {
    slider.container.addEventListener("mouseover", () => {
      mouseOver = true;
      clearNextTimeout();
    });
    slider.container.addEventListener("mouseout", () => {
      mouseOver = false;
      nextTimeout();
    });
    nextTimeout();
  });
  slider.on("dragStarted", clearNextTimeout);
  slider.on("animationEnded", nextTimeout);
  slider.on("updated", nextTimeout);
};
const UseCasesSection: Component = () => {
  const [containerRef, setContainerRef] = createSignal<HTMLElement | null>(null);
  const [sliderInstanceRef, setSliderInstanceRef] = createSignal<KeenSliderInstance | null>(null);
  const [dotsMenu, setDotsMenu] = createSignal<number[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = createSignal(0);
  const useCases = [
    {
      header: "Personal blog",
      text: "Bring your coding blog to next level. Grow your audience attract new clients and even potential employers."
    },
    {
      header: "Marketing blog",
      text: "Be more productive and run your blog more efficiently. Easily grow your content library to attract new customers."
    },
    {
      header: "Technical writing",
      text: "Whether you're writing a technical blog post or next page of internal documentation, Vrite provides you all the tools you need."
    },
    {
      header: "Cross-posting",
      text: "Build on Vrite API to be everywhere easier and faster than ever before, while always having great writing experience."
    }
  ];
  const moveToNextSlide = (): void => {
    const sliderInstance = sliderInstanceRef();

    if (sliderInstance) {
      sliderInstance.next();
    }
  };
  const moveToPreviousSlide = (): void => {
    const sliderInstance = sliderInstanceRef();

    if (sliderInstance) {
      sliderInstance.prev();
    }
  };
  const moveToSlide = (index: number): void => {
    const sliderInstance = sliderInstanceRef();

    if (sliderInstance) {
      sliderInstance.moveToIdx(index);
    }
  };

  onMount(() => {
    const md = window.matchMedia("(min-width: 768px)");
    const lg = window.matchMedia("(min-width: 1024px)");
    const container = containerRef();

    if (container) {
      const sliderInstance = new KeenSlider(
        container,
        {
          loop: true,
          slides: {
            perView() {
              if (lg.matches) return 3;
              if (md.matches) return 2;

              return 1;
            }
          }
        },
        [autoSwitch]
      );

      setSliderInstanceRef(sliderInstance);
      setDotsMenu([...new Array(sliderInstance.slides.length).keys()]);
      sliderInstance.on("slideChanged", () => {
        setActiveSlideIndex(sliderInstance.track.details.rel);
      });
    }
  });

  return (
    <Card class="w-full p-4 overflow-hidden md:p-8 m-0" color="contrast">
      <div class="flex flex-col items-start justify-center">
        <IconButton path={mdiLightbulbGroup} badge size="small" color="primary" label="Use cases" />
      </div>
      <h2 class="mt-2 text-xl text-gray-700 dark:text-gray-100 md:text-2xl">Use cases</h2>
      <div class="relative flex items-center">
        <div class="flex relative transform keen-slider" ref={setContainerRef}>
          <For each={useCases}>
            {({ header, text }) => {
              return (
                <div class="flex-1 p-1 md:p-2 keen-slider__slide">
                  <Card class="p-3 m-0 md:p-6 h-full" color="primary">
                    <div class="flex flex-col items-start justify-center" />
                    <h2 class="text-xl md:text-2xl">{header}</h2>
                    <p class="mt-2 md:text-lg">{text}</p>
                  </Card>
                </div>
              );
            }}
          </For>
        </div>
        <IconButton
          path={mdiChevronLeft}
          class="absolute -left-4 hidden md:block"
          onClick={moveToPreviousSlide}
          name="Backward"
          text="soft"
        />
        <IconButton
          path={mdiChevronRight}
          class="absolute -right-4 hidden md:block"
          onClick={moveToNextSlide}
          name="Forward"
          text="soft"
        />
      </div>
      <div class="flex justify-center items-center mt-2 gap-1.5">
        <For each={dotsMenu()}>
          {(index) => {
            return (
              <IconButton
                path=""
                class="m-0 rounded-full"
                size="small"
                onClick={() => moveToSlide(index)}
                color={index === activeSlideIndex() ? "primary" : "base"}
                name={`Slide ${index + 1}`}
              />
            );
          }}
        </For>
      </div>
    </Card>
  );
};

export { UseCasesSection };
