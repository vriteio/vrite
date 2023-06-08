import { Component } from "solid-js";
import { MiniCodeEditor } from "#components/fragments";
import { useNotificationsContext } from "#context";

interface CustomDataSectionProps {
  customData: Record<string, any>;
  inEditor?: boolean;
  editable?: boolean;
  setCustomData(customData: Record<string, any>): void;
}

const CustomDataSection: Component<CustomDataSectionProps> = (props) => {
  const { notify } = useNotificationsContext();
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
    <MiniCodeEditor
      maxHeight={400}
      code={JSON.stringify(props.customData, null, 2)}
      readOnly={props.editable === false}
      onSave={props.editable === false ? undefined : handleSave}
    />
  );
};

export { CustomDataSection };
