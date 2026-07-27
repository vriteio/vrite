import { ScrollShadow, createRef } from "@andesine/components";
import { Title } from "@solidjs/meta";
import { RouteSectionProps } from "@solidjs/router";
import { Component } from "solid-js";
import { useRouteData } from "#web/lib/routes";
import { SettingsProvider } from "./settings-context";
import { VerificationDialog } from "./verification-dialog";

const SettingsLayout: Component<RouteSectionProps> = (props) => {
  const routeData = useRouteData();
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const title = () => routeData()?.title || "Settings";

  return (
    <SettingsProvider>
      <Title>{`${title()} settings | Andesine`}</Title>
      <div class="flex w-full flex-1 overflow-hidden px-4">
        <div class="relative flex h-full w-full overflow-hidden">
          <ScrollShadow scrollableContainerRef={scrollableContainerRef} />
          <div class="relative z-0 w-full overflow-auto p-5" ref={setScrollableContainerRef}>
            <div class="flex w-full flex-col items-center">
              <div class="relative my-2 flex w-full max-w-[44rem] flex-col">
                <h1 class="my-3 text-5xl font-semibold">{title()}</h1>
                {props.children}
              </div>
            </div>
          </div>
        </div>
      </div>
      <VerificationDialog />
    </SettingsProvider>
  );
};

export default SettingsLayout;
