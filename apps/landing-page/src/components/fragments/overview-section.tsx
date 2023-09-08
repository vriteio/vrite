import { Section } from "./section";
import { Observed } from "./observed";
import { Component, createSignal, For, onMount } from "solid-js";
import KeenSlider, { KeenSliderInstance } from "keen-slider";
import clsx from "clsx";
import { Card, Image, IconButton } from "#components/primitives";
import editorImageDark from "#assets/images/dark/editor.png";
import articleImageDark from "#assets/images/dark/article.png";
import dashboardImageDark from "#assets/images/dark/dashboard.png";
import editorImageLight from "#assets/images/light/editor.png";
import articleImageLight from "#assets/images/light/article.png";
import dashboardImageLight from "#assets/images/light/dashboard.png";
import "keen-slider/keen-slider.min.css";

const slides = [
  {
    header: "Create",
    text: "Markdown shortcuts, advanced code editor, and more. Vrite provides you with everything you need to create beautiful content.",
    imageDark: editorImageDark,
    imageLight: editorImageLight
  },
  {
    header: "Manage",
    text: "Kanban dashboard, combined with metadata editor helps you manage the content production process, as if it was another project.",
    imageDark: articleImageDark,
    imageLight: articleImageLight
  },
  {
    header: "Deliver",
    text: "With powerful API, a number of integrations, and versitile content format, Vrite allows you to publish with just drag and drop",
    imageDark: dashboardImageDark,
    imageLight: dashboardImageLight
  }
];
const OverviewSection: Component = () => {
  const [containerRef, setContainerRef] = createSignal<HTMLElement | null>(null);
  const [loaded, setLoaded] = createSignal(false);
  const [sliderInstanceRef, setSliderInstanceRef] = createSignal<KeenSliderInstance | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = createSignal(0);
  const moveToSlide = (index: number): void => {
    const sliderInstance = sliderInstanceRef();

    if (sliderInstance) {
      sliderInstance.moveToIdx(index);
    }
  };

  onMount(() => {
    const container = containerRef();

    if (container) {
      const sliderInstance = new KeenSlider(container, {
        loop: true,
        slides: {
          perView() {
            return 1;
          }
        }
      });

      setLoaded(true);
      setSliderInstanceRef(sliderInstance);
      sliderInstance.on("slideChanged", () => {
        setActiveSlideIndex(sliderInstance.track.details.rel);
      });
    }
  });

  return (
    <Section title="All-in-one technical content toolkit">
      <p class="text-lg max-w-[40rem] mb-4">
        From writing to publishing, Vrite empowers you to work with any kind of technical content,
        while enjoying great User and Developer Experience.
      </p>
      <div class="relative flex-col lg:flex-col-reverse xl:flex-row flex items-center lg:gap-4">
        <div class="flex-1 lg:grid grid-cols-3 gap-4 xl:grid-cols-1 hidden">
          <For each={slides}>
            {(slide, index) => {
              return (
                <Observed
                  class="transform transition-all duration-500 ease-out"
                  style={{ "transition-delay": `${100 * index()}ms` }}
                  outOfViewClass="invisible translate-y-1/3"
                >
                  <Card
                    class="w-full flex-1 h-full p-4 overflow-hidden m-0 hover:cursor-pointer"
                    color={index() === activeSlideIndex() ? "primary" : "base"}
                    onClick={() => moveToSlide(index())}
                  >
                    <h2 class="text-xl">{slide.header}</h2>
                    <p class="mt-2">{slide.text}</p>
                  </Card>
                </Observed>
              );
            }}
          </For>
        </div>
        <div class="flex-[2] relative transform keen-slider" ref={setContainerRef}>
          <For each={slides}>
            {(slide, index) => {
              return (
                <div class={clsx("keen-slider__slide p-1", !loaded() && index() !== 0 && "hidden")}>
                  <Image
                    class="rounded-2xl border-gray-200 dark:border-gray-700 border-2 border-b-0 rounded-b-0 lg:rounded-b-2xl lg:border-b-2"
                    srcDark={slide.imageDark.src}
                    srcLight={slide.imageLight.src}
                    alt="Vrite Kanban dashboard"
                  />
                  <Card class="w-full p-4 overflow-hidden m-0 rounded-t-0 lg:hidden" color="base">
                    <h2 class="text-xl text-gray-700 dark:text-gray-100">{slide.header}</h2>
                    <p class="mt-2 text-gray-600 dark:text-gray-200">{slide.text}</p>
                  </Card>
                </div>
              );
            }}
          </For>
        </div>
        <div class="flex justify-center items-center mt-2 gap-1.5 lg:hidden">
          <For each={slides}>
            {(slide, index) => {
              return (
                <IconButton
                  path=""
                  class="m-0 rounded-full dark:bg-gray-800"
                  size="small"
                  onClick={() => moveToSlide(index())}
                  color={index() === activeSlideIndex() ? "primary" : "base"}
                />
              );
            }}
          </For>
        </div>
      </div>
    </Section>
  );
};

export { OverviewSection };
