import clsx from "clsx";
import { type Component, type JSX, splitProps } from "solid-js";
import styles from "./styles.module.scss";

interface DotsBackgroundProps extends JSX.HTMLAttributes<HTMLDivElement> {
  class?: string;
}

const DotsBackground: Component<DotsBackgroundProps> = (props) => {
  const [, passedProps] = splitProps(props, ["class"]);

  return <div {...passedProps} class={clsx(styles.background, props.class)} />;
};

export { DotsBackground };
