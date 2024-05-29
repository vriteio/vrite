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
      initialValue={props.editable ? props.initialTitle : props.initialTitle || "[No title]"}
      onBlur={(editor) => {
        props.setTitle(editor.getText());
      }}
      class="!text-2xl font-semibold !leading-7"
      placeholder="Title"
    />
  );
};

export { ContentPieceTitle };
