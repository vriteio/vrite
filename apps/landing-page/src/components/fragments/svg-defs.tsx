import type { Component } from "solid-js";

const SVGDefs: Component = () => {
  return (
    <svg height="0" width="0">
      <defs>
        <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
          <stop stop-color="#ef4444" offset="0%" />
          <stop stop-color="#f97316" offset="100%" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export { SVGDefs };
