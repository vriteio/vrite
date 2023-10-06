import { Component, For, onMount, onCleanup, createSignal, createMemo } from "solid-js";
import { mdiListBox } from "@mdi/js";
import clsx from "clsx";
import { scroll } from "seamless-scroll-polyfill";
import type { MarkdownHeading } from "astro";
import { Button, IconButton } from "#components/primitives";

interface OnThisPageProps {
  headings: MarkdownHeading[];
}

const OnThisPage: Component<OnThisPageProps> = (props) => {
  const [activeHeading, setActiveHeading] = createSignal(props.headings[0]?.slug || "");
  const headings = createMemo(() => {
    return props.headings.filter((heading) => {
      return heading.depth === 2 || heading.depth === 3;
    });
  });

  onMount(() => {
    if (!headings().length) return;

    const observedElements: HTMLElement[] = [];
    const setCurrent: IntersectionObserverCallback = (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const { id } = entry.target;

          setActiveHeading(entry.target.id);
          break;
        }
      }
    };
    const container = document.body;
    const observerOptions: IntersectionObserverInit = {
      rootMargin: "-100px 0% -66%",
      threshold: 0
    };
    const headingsObserver = new IntersectionObserver(setCurrent, observerOptions);
    const handleScroll = (): void => {
      if (!container) return;

      const threshold = 50;
      const isEnd =
        container.scrollTop + container.clientHeight + threshold >= container.scrollHeight;
      const isStart = container.scrollTop <= threshold;

      if (isEnd) {
        setActiveHeading(headings()[headings().length - 1].slug);
      } else if (isStart) {
        setActiveHeading(headings()[0].slug);
      }
    };

    document
      .querySelectorAll(
        headings()
          .map((heading) => `#${heading.slug}`)
          .join(", ")
      )
      .forEach((h) => headingsObserver.observe(h));
    container?.addEventListener("scroll", handleScroll);
    onCleanup(() => {
      headingsObserver.disconnect();
      container?.removeEventListener("scroll", handleScroll);
    });
  });

  return (
    <>
      <div
        class={clsx(
          "w-56 flex-col justify-start top-0 pt-24 xl:fixed right-0 hidden xl:flex gap-2",
          "mr-[max(0px,calc((100%-(1536px))/2))]"
        )}
      >
        <IconButton
          text="soft"
          class="font-bold justify-start m-0"
          variant="text"
          badge
          hover={false}
          path={mdiListBox}
          label="On This Page"
        />
        <For each={headings()}>
          {(heading) => {
            return (
              <Button
                variant="text"
                text={activeHeading() === heading.slug ? "base" : "soft"}
                color={activeHeading() === heading.slug ? "primary" : "base"}
                class={clsx("text-start m-0", heading.depth === 3 && "ml-6")}
                size={heading.depth === 2 ? "medium" : "small"}
                onClick={() => {
                  const element = document.getElementById(heading.slug);

                  if (!element) return;

                  const rect = element.getBoundingClientRect();
                  const y = rect.top + window.scrollY - 60;

                  scroll(window, {
                    top: y,
                    behavior: "smooth"
                  });
                  setActiveHeading(heading.slug);
                }}
              >
                {heading.text}
              </Button>
            );
          }}
        </For>
      </div>
      <div class="min-w-56 hidden xl:flex" />
    </>
  );
};

export { OnThisPage };
