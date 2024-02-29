import { RequestExample } from "./rehype-examples";
import { ParentComponent, createEffect, createSignal } from "solid-js";
import { Select } from "#components/primitives";

interface RequestExamplesProps {
  requestExamples: RequestExample[];
  curl?: boolean;
}

const [selectedExample, setSelectedExample] = createSignal("curl");
const RequestExamples: ParentComponent<RequestExamplesProps> = (props) => {
  const [containerRef, setContainerRef] = createSignal<HTMLElement | null>(null);
  const selectedExampleInView = (): string => {
    if (props.curl === false && selectedExample() === "curl") {
      return props.requestExamples[0].label.toLowerCase();
    }

    return selectedExample();
  };

  createEffect(() => {
    const container = containerRef();

    if (!container) return;

    const exampleElements = container.querySelectorAll("[data-example]") as NodeListOf<HTMLElement>;

    exampleElements.forEach((element) => {
      if (element.dataset.example === selectedExampleInView()) {
        element.style.display = "block";
      } else {
        element.style.display = "";
      }
    });
  });

  return (
    <div class="bg-gray-800 rounded-2xl" ref={setContainerRef}>
      <div class="px-3 pt-2 pb-1 text-white font-semibold flex justify-start items-center leading-8">
        <span class="flex-1">Request</span>
        <Select
          class="bg-gray-900 m-0"
          value={selectedExampleInView()}
          setValue={setSelectedExample}
          data-example-selector
          options={[
            ...(props.curl === false ? [] : [{ label: "cURL", value: "curl" }]),
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
