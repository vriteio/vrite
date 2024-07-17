import { ImageMetadata } from "astro";
import clsx from "clsx";
import type { Component } from "solid-js";

interface ImageProps {
  srcLight: ImageMetadata;
  srcDark: ImageMetadata;
  alt: string;
  class?: string;
}

const Image: Component<ImageProps> = (props) => {
  return (
    <picture class={clsx(":base: block overflow-hidden", props.class)}>
      <source srcset={props.srcDark.src} media="(prefers-color-scheme: dark)" />
      <img src={props.srcLight.src} alt={props.alt} />
    </picture>
  );
};

export { Image };
