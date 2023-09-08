import { Component, createEffect, createSignal } from "solid-js";
import { SearchableSelect } from "#components/fragments";
import { App, useAuthenticatedUserData } from "#context";

interface WrapperMenuProps {
  state: {
    key: string;
    setKey(key: string): void;
  };
}

const WrapperMenu: Component<WrapperMenuProps> = (props) => {
  const { workspaceSettings } = useAuthenticatedUserData();
  const selectedOption = (): App.Wrapper | null => {
    return (
      (workspaceSettings()?.wrappers || []).find((wrapper) => wrapper.key === props.state.key) ||
      null
    );
  };

  props.state.setKey(selectedOption()?.key || "");

  return (
    <div class="w-full flex items-center justify-start text-base" contentEditable={false}>
      <div>
        <SearchableSelect
          extractId={(option) => option.key}
          filterOption={(option, query) => option.label.toLowerCase().includes(query.toLowerCase())}
          options={workspaceSettings()?.wrappers || []}
          renderOption={(option) => <div class="text-start">{option.label}</div>}
          selectOption={(option) => {
            props.state.setKey(option?.key || "");
          }}
          selected={selectedOption()}
          loading={false}
          placeholder="Wrapper"
          buttonProps={{
            class: "bg-gray-100",
            color: "base",
            text: "soft"
          }}
        />
      </div>
    </div>
  );
};

export { WrapperMenu };
