import { Component } from "solid-js";

const SVGDefs: Component = () => {
  return (
    <svg height="0" width="0">
      <defs>
        <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
          <stop stop-color="var(--color-secondary)" offset="0%" />
          <stop stop-color="var(--color-primary)" offset="100%" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export { SVGDefs };
