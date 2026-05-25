import { SolidEditor } from "./editor";
import { Accessor, Context, createContext, useContext } from "solid-js";
import { NodeViewProps } from "@tiptap/core";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Attrs = Record<string, any>;

interface SolidNodeViewProps<A extends Attrs = Attrs> extends NodeViewProps {
  node: ProseMirrorNode & { attrs: A };
  editor: SolidEditor;
}
interface SolidNodeViewContextProps<A extends Attrs = Attrs> {
  state: Accessor<
    SolidNodeViewProps<A> & {
      onDragStart?(event: DragEvent): void;
    }
  >;
}

const SolidNodeViewContext = createContext();
const useSolidNodeView = <A extends Attrs = Attrs>(): SolidNodeViewContextProps<A> => {
  return useContext(SolidNodeViewContext as Context<SolidNodeViewContextProps<A>>);
};

export { SolidNodeViewContext, useSolidNodeView };
export type { SolidNodeViewContextProps, SolidNodeViewProps, Attrs };
