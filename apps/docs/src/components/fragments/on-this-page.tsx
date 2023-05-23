import { Component, For, onMount, onCleanup, createSignal, createMemo } from "solid-js";
import type { MarkdownHeading } from "astro";
import { Button } from "#components/primitives";

interface OnThisPageProps {
  headings: MarkdownHeading[];
}

const OnThisPage: Component<OnThisPageProps> = (props) => {
  const [activeHeading, setActiveHeading] = createSignal(props.headings[0]?.slug || "");
  const headings = createMemo(() => {
    return props.headings.filter((heading) => {
      return heading.depth === 2;
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
    const observerOptions: IntersectionObserverInit = {
      rootMargin: "-100px 0% -66%",
      threshold: 1
    };
    const headingsObserver = new IntersectionObserver(setCurrent, observerOptions);

    document
      .querySelectorAll(
        headings()
          .map((heading) => `#${heading.slug}`)
          .join(", ")
      )
      .forEach((h) => headingsObserver.observe(h));
    onCleanup(() => {
      headingsObserver.disconnect();
    });
  });

  return (
    <div class="w-56 flex-col justify-start top-16 sticky hidden xl:flex gap-2">
      <Button text="soft" class="font-bold text-start m-0" variant="text" badge>
        On this page
      </Button>
      <For each={headings()}>
        {(heading) => {
          return (
            <Button
              variant="text"
              text={activeHeading() === heading.slug ? "base" : "soft"}
              color={activeHeading() === heading.slug ? "primary" : "base"}
              class="text-start m-0"
              onClick={() => {
                document.getElementById(heading.slug)?.scrollIntoView({
                  block: "start",
                  inline: "nearest"
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
  );
};

export { OnThisPage };
