import { ParentComponent, Show } from "solid-js";
import { IconButton, Card } from "#components/primitives";

interface SectionProps {
  title?: string;
  icon?: string;
  label?: string;
}

const Section: ParentComponent<SectionProps> = (props) => {
  return (
    <div class="max-w-screen-xl w-full p-4 m-0 sm:p-8 md:p-8 relative">
      <Show when={props.icon || props.label || props.title}>
        <div class="flex flex-col items-start justify-center pb-4">
          <Show when={props.icon || props.label}>
            <IconButton path={props.icon} label={props.label} color="primary" badge />
          </Show>
          <Show when={props.title}>
            <h2 class="text-3xl md:text-4xl">{props.title}</h2>
          </Show>
        </div>
      </Show>
      {props.children}
    </div>
  );
};

export { Section };
