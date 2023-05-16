import Collaboration from "@tiptap/extension-collaboration";
import { yUndoPlugin, yUndoPluginKey, ySyncPlugin } from "y-prosemirror";

const Collab = Collaboration.extend({
  addProseMirrorPlugins() {
    const fragment =
      this.options.fragment || this.options.document.getXmlFragment(this.options.field);
    const yUndoPluginInstance = yUndoPlugin();
    const originalUndoPluginView = yUndoPluginInstance.spec.view;

    yUndoPluginInstance.spec.view = (view) => {
      const { undoManager } = yUndoPluginKey.getState(view.state);

      if (undoManager.restore) {
        undoManager.restore();
        undoManager.restore = () => {};
      }

      const viewRet = originalUndoPluginView?.(view);

      return {
        destroy: () => {
          const hasUndoManSelf = undoManager.trackedOrigins.has(undoManager);
          const observers = undoManager._observers;

          undoManager.restore = () => {
            if (hasUndoManSelf) {
              undoManager.trackedOrigins.add(undoManager);
            }

            undoManager.doc.on("afterTransaction", undoManager.afterTransactionHandler);
            undoManager._observers = observers;
          };
          viewRet?.destroy?.();
        }
      };
    };

    return [ySyncPlugin(fragment), yUndoPluginInstance];
  }
});

export { Collab };
