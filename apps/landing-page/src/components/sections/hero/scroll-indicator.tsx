import clsx from "clsx";
import { onMount, type Component, createSignal } from "solid-js";

const ScrollIndicator: Component = () => {
  const [visible, setVisible] = createSignal(true);
  const handleScroll = (): void => {
    if (window.scrollY > 100) {
      setVisible(false);
    } else {
      setVisible(true);
    }
  };

  onMount(() => {
    document.addEventListener("scroll", handleScroll);
  });

  return (
    <div
      class={clsx(
        "icon-scroll transition-opacity duration-250 ease-out",
        !visible() && "opacity-0"
      )}
    ></div>
  );
};

export { ScrollIndicator };
