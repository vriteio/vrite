import { ScrollShadow, createRef } from "@andesine/components";
import { Title } from "@solidjs/meta";
import { Component, JSX } from "solid-js";

import { Breadcrumbs } from "#web/components/breadcrumbs";

interface SettingsPageProps {
  children: JSX.Element;
  title: string;
  parentTitle?: string;
}

const SettingsPage: Component<SettingsPageProps> = (props) => {
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);

  return (
    <>
      <Title>{props.title} settings | Andesine</Title>
      <Breadcrumbs
        icon={<span class="i-lucide:settings-2 h-5 w-5" />}
        iconTooltip="Settings"
        items={[
          ...(props.parentTitle ? [{ label: props.parentTitle }] : []),
          { label: props.title }
        ]}
      />
      <div class="flex w-full flex-1 overflow-hidden px-4">
        <div class="relative flex h-full w-full overflow-hidden">
          <ScrollShadow scrollableContainerRef={scrollableContainerRef} />
          <div class="relative z-0 w-full overflow-auto p-5" ref={setScrollableContainerRef}>
            <div class="flex w-full flex-col items-center">
              <div class="relative my-2 flex w-full max-w-[44rem] flex-col">
                <h1 class="my-3 text-5xl font-semibold">{props.title}</h1>
                {props.children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export { SettingsPage };
