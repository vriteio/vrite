import { mdiMenuClose, mdiMenuOpen } from "@mdi/js";
import { Component } from "solid-js";
import { IconButton } from "#components/primitives";
import { useLocalStorage } from "#context";

const RightPanelMenu: Component<{ variant?: "text" | "solid" }> = (props) => {
  const { storage, setStorage } = useLocalStorage();

  return (
    <IconButton
      path={Number(storage().rightPanelWidth || 0) > 0 ? mdiMenuClose : mdiMenuOpen}
      variant={props.variant}
      text="soft"
      class="m-0"
      onClick={() => {
        if (Number(storage().rightPanelWidth || 0) > 0) {
          setStorage((storage) => ({ ...storage, rightPanelWidth: 0 }));
        } else {
          setStorage((storage) => ({ ...storage, rightPanelWidth: 375 }));
        }
      }}
    />
  );
};

export { RightPanelMenu };
