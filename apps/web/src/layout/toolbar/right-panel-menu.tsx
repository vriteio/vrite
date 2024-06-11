import { mdiMenuClose, mdiMenuOpen } from "@mdi/js";
import { Component } from "solid-js";
import { IconButton, Tooltip } from "#components/primitives";
import { useLocalStorage } from "#context";

const RightPanelMenu: Component<{ variant?: "text" | "solid" }> = (props) => {
  const { storage, setStorage } = useLocalStorage();
  const rightPanelOpened = (): boolean => Number(storage().rightPanelWidth || 0) > 0;

  return (
    <Tooltip
      text={`${rightPanelOpened() ? "Hide" : "Show"} Menu`}
      side="left"
      class="-ml-1"
      wrapperClass="flex"
    >
      <IconButton
        path={rightPanelOpened() ? mdiMenuClose : mdiMenuOpen}
        variant={props.variant}
        text="soft"
        class="m-0"
        onClick={() => {
          setStorage((storage) => ({ ...storage, rightPanelWidth: rightPanelOpened() ? 0 : 375 }));
        }}
      />
    </Tooltip>
  );
};

export { RightPanelMenu };
