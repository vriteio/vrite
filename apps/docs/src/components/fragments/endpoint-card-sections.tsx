import { Button } from "#components/primitives";
import { ParentComponent, createSignal } from "solid-js";

interface EndpointCardSectionsProps {
  sections: Array<{ label: string; id: string }>;
}

const EndpointCardSections: ParentComponent<EndpointCardSectionsProps> = (props) => {
  const [activeSection, setActiveSection] = createSignal(props.sections[0].id);

  return (
    <>
      <div class="flex w-full gap-2">
        {props.sections.map((section) => {
          return (
            <Button
              variant={section.id === activeSection() ? "solid" : "text"}
              text={section.id === activeSection() ? "base" : "soft"}
              color="contrast"
              class="py-1 m-0 text-xl font-semibold"
              onClick={() => {
                setActiveSection(section.id);
              }}
            >
              {section.label}
            </Button>
          );
        })}
      </div>
      <div data-active-section={activeSection()}>{props.children}</div>
    </>
  );
};

export { EndpointCardSections };
