import { Component } from "solid-js";
import { MiniEditor } from "#components/fragments";

interface ContentPieceTitleProps {
  initialTitle: string;
  editable?: boolean;
  setTitle(title: string): void;
}

const ContentPieceTitle: Component<ContentPieceTitleProps> = (props) => {
  return (
    <MiniEditor
      content="paragraph"
      readOnly={props.editable === false}
      initialValue={props.initialTitle}
      onBlur={(editor) => {
        props.setTitle(editor.getText());
      }}
      class="!text-4xl font-bold"
      placeholder="Title"
    />
  );
};

export { ContentPieceTitle };
