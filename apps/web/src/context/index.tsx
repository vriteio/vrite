import { ParentComponent } from "solid-js";
import { ShortcutsProvider } from "@andesine/components/context";
import { ContentProvider } from "./content";
import { NotificationsProvider } from "./notifications";
import { UpdatesProvider } from "./updates";
import { LayoutProvider } from "./layout";

const AppProvider: ParentComponent = (props) => {
  return (
    <UpdatesProvider>
      <NotificationsProvider>
        <ContentProvider>
          <LayoutProvider>
            <ShortcutsProvider>{props.children}</ShortcutsProvider>
          </LayoutProvider>
        </ContentProvider>
      </NotificationsProvider>
    </UpdatesProvider>
  );
};

export { AppProvider };
export * from "./updates";
export * from "./notifications";
export * from "./content";
export * from "./layout";
export * from "@andesine/components/context";
