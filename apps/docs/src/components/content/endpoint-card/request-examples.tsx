import { RequestExample } from "./rehype-examples";
import { ParentComponent, createEffect, createSignal } from "solid-js";
import { Select } from "#components/primitives";

interface RequestExamplesProps {
  requestExamples: RequestExample[];
}

const [selectedExample, setSelectedExample] = createSignal("curl");
const RequestExamples: ParentComponent<RequestExamplesProps> = (props) => {
  createEffect(() => {
    const exampleSelectorElements = document.querySelectorAll(
      "[data-example-selector]"
    ) as NodeListOf<HTMLSelectElement>;
    const exampleElements = document.querySelectorAll("[data-example]") as NodeListOf<HTMLElement>;

    exampleElements.forEach((element) => {
      if (element.dataset.example === selectedExample()) {
        element.style.display = "block";
      } else {
        element.style.display = "";
      }
    });
    exampleSelectorElements.forEach((element) => {
      element.value = selectedExample();
    });
  });

  return (
    <div class="bg-gray-800 rounded-2xl">
      <div class="px-3 pt-2 pb-1 text-white font-semibold flex justify-start items-center leading-8">
        <span class="flex-1">Request</span>
        <Select
          class="bg-gray-900 m-0"
          value={selectedExample()}
          setValue={setSelectedExample}
          data-example-selector
          options={[
            { label: "cURL", value: "curl" },
            ...props.requestExamples.map((example) => ({
              label: example.label,
              value: example.label.toLowerCase()
            }))
          ]}
        />
      </div>
      {props.children}
    </div>
  );
};

export { RequestExamples };
