import { Component, createEffect } from "solid-js";

const ScrollbarWidth: Component = () => {
  const calculateScrollbarWidth = (): void => {
    document.documentElement.style.setProperty(
      "--scrollbar-width",
      `${window.innerWidth - document.documentElement.clientWidth}px`
    );
  };

  // recalculate on resize
  window.addEventListener("resize", calculateScrollbarWidth, false);
  // recalculate on dom load
  document.addEventListener("DOMContentLoaded", calculateScrollbarWidth, false);
  // recalculate on load (assets loaded as well)
  window.addEventListener("load", calculateScrollbarWidth);
  calculateScrollbarWidth();

  return <></>;
};

export { ScrollbarWidth };
