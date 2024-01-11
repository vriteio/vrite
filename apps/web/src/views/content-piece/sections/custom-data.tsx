import { Component } from "solid-js";
import { MiniCodeEditor } from "#components/fragments";
import { useNotifications } from "#context";

interface CustomDataSectionProps {
  customData: Record<string, any>;
  inEditor?: boolean;
  editable?: boolean;
  setCustomData(customData: Record<string, any>): void;
}

const CustomDataSection: Component<CustomDataSectionProps> = (props) => {
  const { notify } = useNotifications();
  const handleSave = (code: string): void => {
    try {
      const json = JSON.parse(code);

      json["$schema"] = undefined;
      props.setCustomData(json);
    } catch (error) {
      notify({ text: "Couldn't save custom data", type: "error" });
    }
  };

  return (
    <div class="m-1">
      <MiniCodeEditor
        maxHeight={400}
        class="box-border"
        code={JSON.stringify(props.customData, null, 2)}
        readOnly={props.editable === false}
        onSave={props.editable === false ? undefined : handleSave}
      />
    </div>
  );
};

export { CustomDataSection };
