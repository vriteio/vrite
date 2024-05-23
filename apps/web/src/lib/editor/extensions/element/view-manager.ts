import { CustomView } from "./utils";
import { nanoid } from "nanoid";
import { createNanoEvents } from "nanoevents";
import { SolidEditor } from "@vrite/tiptap-solid";
import { Node } from "@tiptap/pm/model";

interface ElementDisplay {
  onSelect(): void;
  onDeselect(): void;
  onUpdate?(node: Node): void;
  unmount(): void;
}

const customViews = new Map<string, CustomView>();
const loaders = new Map<string, Promise<void>>();
const emitter = createNanoEvents();
const createLoader = (element: HTMLElement): (() => void) => {
  const loadingId = nanoid();

  let loaded = (): void => {};

  element.setAttribute("data-loader-id", loadingId);
  loaders.set(
    loadingId,
    new Promise<void>((resolve) => {
      loaded = resolve;
    }).then(() => {
      loaders.delete(loadingId);
      element.removeAttribute("data-loader-id");
    })
  );

  return loaded;
};
const getTreeUID = async (editor: SolidEditor, pos: number): Promise<string | null> => {
  const resolvedPos = editor.state.doc.resolve(pos);
  const parentPos = pos - resolvedPos.parentOffset - 1;

  if (parentPos >= 0) {
    const parentElement = editor.view.nodeDOM(parentPos) as HTMLElement;
    const parentLoadingId = parentElement.getAttribute("data-loader-id");

    if (parentLoadingId) {
      await loaders.get(parentLoadingId);
    }

    return parentElement?.getAttribute?.("data-uid") || null;
  }

  return null;
};

export { createLoader, getTreeUID, customViews, loaders, emitter };
export type { ElementDisplay };
