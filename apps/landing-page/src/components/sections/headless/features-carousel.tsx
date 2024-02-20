import { SecondaryFeatureCard } from "./secondary-feature-card";
import { mdiCards, mdiDatabase, mdiGit } from "@mdi/js";
import { onMount, type Component, For } from "solid-js";
import KeenSlider, { KeenSliderInstance } from "keen-slider";
import { javascriptIcon } from "#icons/javascript";
import { openSourceIcon } from "#icons/open-source";
import { sdkIcon } from "#icons/sdk";
import { createRef } from "#lib/ref";

const FeaturesCarousel: Component = () => {
  const [containerRef, setContainerRef] = createRef<HTMLElement | null>(null);
  const [sliderRef, setSliderRef] = createRef<KeenSliderInstance | null>(null);
  const features = [
    {
      label: "Open-Source",
      icon: openSourceIcon,
      description: (
        <>
          Vrite is open-source. You can always self-host it or use our cloud and not worry about a
          lock-in.
        </>
      )
    },
    {
      label: "Headless",
      icon: sdkIcon,
      description: <>Integrate with any front-end and automate your workflows with Vrite's API.</>
    },
    {
      label: "Variants",
      icon: mdiCards,
      description: (
        <>
          Manage internalization, A/B testing and more with Vrite's built-in support for content
          variants.
        </>
      )
    },
    {
      label: "Metadata",
      icon: mdiDatabase,
      description: (
        <>
          Store metadata - from assigned members, tags, and deadlines to custom JSON - right
          alongside your content.
        </>
      )
    },
    {
      label: "Git Sync",
      icon: mdiGit,
      description: (
        <>Onboard quickly and utilize docs-as-code approach with Vrite's bi-directional Git sync.</>
      )
    },
    {
      label: "JavaScript SDK",
      icon: javascriptIcon,
      description: (
        <>
          Easily integrate with popular frameworks, and extend Vrite's functionality with JavaScript
          SDK.
        </>
      )
    }
  ];
  const animation = {
    duration: 80000,
    easing: (t: any) => t
  };

  onMount(() => {
    const container = containerRef();

    if (container) {
      const slider = new KeenSlider(container, {
        loop: true,
        renderMode: "precision",
        drag: true,
        slides: {
          perView: () => {
            return Math.max(window.innerWidth / (1280 / 3), 1);
          },
          spacing: 0
        },
        created(s) {
          s.moveToIdx(s.track.details.abs + 5, true, animation);
        },
        updated(s) {
          s.moveToIdx(s.track.details.abs + 5, true, animation);
        },
        animationEnded(s) {
          s.moveToIdx(s.track.details.abs + 5, true, animation);
        }
      });

      setSliderRef(slider);
      setTimeout(() => {
        slider.update();
      }, 100);

      const resizeTimeoutHandle = 0;

      window.addEventListener("resize", () => {
        clearTimeout(resizeTimeoutHandle);
        setTimeout(() => {
          slider.update();
        }, 100);
      });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          sliderRef()!.moveToIdx(sliderRef()!.track.details.abs + 5, true, animation);
        } else {
          sliderRef()!.animator.stop();
        }
      });
    }
  });

  return (
    <div
      class="py-12 -mt-12 flex gap-8 flex-col justify-center items-center relative absolute w-screen testimonial-mask max-w-[2135px]"
      ref={setContainerRef}
    >
      <div class="grid-background-2 tilt-lg w-[200%] -left-1/2"></div>
      <div
        class="flex keen-slider w-full cursor-grab"
        onPointerMove={() => {
          sliderRef()!.animator.stop();
        }}
        onPointerLeave={() => {
          sliderRef()!.moveToIdx(sliderRef()!.track.details.abs + 5, true, animation);
        }}
      >
        <For each={features}>
          {(feature) => {
            return (
              <div class="keen-slider__slide w-full p-2">
                <SecondaryFeatureCard title={feature.label} icon={feature.icon}>
                  {feature.description}
                </SecondaryFeatureCard>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
};

export { FeaturesCarousel };
