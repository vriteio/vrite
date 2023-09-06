import { Component, createSignal } from "solid-js";
import { IconButton, Tooltip } from "@vrite/components";
import { mdiCursorPointer, mdiSelect, mdiTrashCan, mdiTrashCanOutline } from "@mdi/js";
import { SearchableSelect } from "#components/fragments";

interface WrapperMenuProps {
  state: {
    deleteNode(): void;
  };
}

const WrapperMenu: Component<WrapperMenuProps> = (props) => {
  const [options, setOptions] = createSignal([
    { label: "Testing", value: "test" },
    { label: "Testing 2", value: "test2" }
  ]);
  const [selectedOption, setSelectedOption] = createSignal<{ label: string; value: string } | null>(
    null
  );

  return (
    <div class="w-full flex items-center justify-start text-base" contentEditable={false}>
      <div>
        <SearchableSelect
          extractId={(option) => option.value}
          filterOption={(option, query) => option.label.toLowerCase().includes(query.toLowerCase())}
          options={options()}
          renderOption={(option) => <div class="text-start">{option.label}</div>}
          selectOption={(option) => {
            setSelectedOption(option);
          }}
          selected={selectedOption()}
          loading={false}
          placeholder="Testing"
          buttonProps={{
            class: "bg-gray-100",
            color: "base"
          }}
        />
      </div>
    </div>
  );
};

export { WrapperMenu };
