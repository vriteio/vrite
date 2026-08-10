import { type Accessor, type Component, createEffect, onCleanup } from "solid-js";
import { createSlashMenuPlugin, slashMenuPluginKey } from "./plugin";
import { type Editor } from "@tiptap/core";
import { createSlashMenuItems } from "./items";
import { MobileSlashMenuTrigger } from "./mobile-trigger";

interface SlashMenuProps {
  editor: Editor;
  menuContainerRef: Accessor<HTMLElement | null>;
}

const SlashMenu: Component<SlashMenuProps> = (props) => {
  const menuItems = createSlashMenuItems();

  createEffect(() => {
    const slashMenuPlugin = createSlashMenuPlugin({
      editor: props.editor,
      menuContainerRef: props.menuContainerRef,
      menuItems
    });

    props.editor.registerPlugin(slashMenuPlugin, (plugin, plugins) => [plugin, ...plugins]);

    onCleanup(() => {
      props.editor.unregisterPlugin(slashMenuPluginKey);
    });
  });
  return <MobileSlashMenuTrigger editor={props.editor} menuContainerRef={props.menuContainerRef} />;
};

export { SlashMenu };
