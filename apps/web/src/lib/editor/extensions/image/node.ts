import { ImageView } from "./view";
import { SolidNodeViewRenderer } from "@vrite/tiptap-solid";
import { Plugin } from "@tiptap/pm/state";
import { Image as BaseImage, ImageAttributes, ImageOptions } from "@vrite/editor";
import { createSignal } from "solid-js";

const Image = BaseImage.extend({
  addStorage() {
    const [droppedFile, setDroppedFile] = createSignal<File | null>(null);

    return {
      droppedFile,
      setDroppedFile
    };
  },
  addNodeView() {
    return SolidNodeViewRenderer(ImageView);
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            drop: (view, event) => {
              const hasFiles =
                event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length;

              if (!hasFiles) {
                return false;
              }

              const [image] = [...(event.dataTransfer as DataTransfer).files].filter((file) => {
                const regex = /image/i;

                return regex.test(file.type);
              });

              if (!image) {
                return false;
              }

              event.preventDefault();

              const { schema } = view.state;
              const coordinates = view.posAtCoords({
                left: event.clientX,
                top: event.clientY
              });

              if (coordinates) {
                this.storage.setDroppedFile(image);

                const node = schema.nodes.image.create();
                const transaction = view.state.tr.insert(coordinates.pos, node);

                view.dispatch(transaction);
              }

              return true;
            }
          }
        }
      })
    ];
  }
});

export { Image };
export type { ImageAttributes, ImageOptions };
