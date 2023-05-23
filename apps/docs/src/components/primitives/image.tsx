import clsx from "clsx";
import type { Component } from "solid-js";

interface ImageProps {
  srcLight: string;
  srcDark: string;
  alt: string;
  class?: string;
}

const Image: Component<ImageProps> = (props) => {
  return (
    <picture class={clsx(":base: block overflow-hidden", props.class)}>
      <source srcset={props.srcDark} media="(prefers-color-scheme: dark)" />
      <img src={props.srcLight} alt={props.alt} />
    </picture>
  );
};

export { Image };
