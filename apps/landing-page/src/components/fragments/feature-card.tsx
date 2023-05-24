import clsx from "clsx";
import type { Component, JSX } from "solid-js";
import { IconButton, Button, Card, Image } from "#components/primitives";

interface FeatureCardProps {
  reverse?: boolean;
  gradient?: boolean;
  icon?: string;
  label?: string;
  vertical?: boolean;
  header: string;
  content: JSX.Element;
  imageAlt: string;
  imageDark: string;
  imageLight: string;
}
interface TextFeatureCardProps {
  icon: string;
  label: string;
  header: string;
  text: JSX.Element;
  class?: string;
}

const FeatureCard: Component<FeatureCardProps> = (props) => {
  return (
    <Card
      class={clsx(
        "flex flex-col items-start justify-start w-full h-full p-4 m-0 md:p-8",
        !props.vertical && (props.reverse ? "md:flex-row-reverse" : "md:flex-row"),
        props.vertical ? "md:flex-col" : "md:flex-row"
      )}
      color={props.gradient ? "primary" : "contrast"}
    >
      <div
        class={clsx(
          "flex justify-center items-center h-full",
          !props.vertical && "md:p-12 md:flex-1"
        )}
      >
        <div class="flex flex-col justify-center items-start">
          {props.icon && (
            <IconButton
              path={props.icon || ""}
              class="m-0 px-1"
              badge
              size="small"
              color={props.gradient ? "contrast" : "primary"}
              label={props.label}
              text={props.gradient ? "soft" : "primary"}
            />
          )}
          {!props.icon && (
            <Button
              badge
              class="px-1"
              color={props.gradient ? "contrast" : "primary"}
              size="small"
              text={props.gradient ? "soft" : "primary"}
            >
              {props.label}
            </Button>
          )}
          <h2
            class={clsx(
              "text-2xl md:text-3xl mt-2",
              props.gradient ? "" : "text-gray-700 dark:text-gray-100"
            )}
          >
            {props.header}
          </h2>
          <p
            class={clsx(
              "mt-2 md:text-lg",
              props.gradient ? "" : "text-gray-600 dark:text-gray-200",
              !props.vertical && "max-w-[26rem]"
            )}
          >
            {props.content}
          </p>
        </div>
      </div>
      <div class={clsx(!props.vertical && "md:flex-1")}>
        <Image
          alt={props.imageAlt}
          srcDark={props.imageDark}
          srcLight={props.imageLight}
          class="gradient-image-mask"
        />
      </div>
    </Card>
  );
};
const TextFeatureCard: Component<TextFeatureCardProps> = (props) => {
  return (
    <Card class={clsx("h-full p-4 m-0", props.class)} color="contrast">
      <div class="flex flex-col items-start justify-center h-full">
        <div class="flex flex-col items-start justify-center">
          <IconButton
            path={props.icon}
            badge
            size="small"
            color="primary"
            class="px-1"
            label={props.label}
          />
        </div>
        <h2 class="mt-2 text-xl text-gray-700 dark:text-gray-100 md:text-2xl">{props.header}</h2>
        <p class="mt-2 text-gray-600 dark:text-gray-200 md:text-lg">{props.text}</p>
      </div>
    </Card>
  );
};

export { FeatureCard, TextFeatureCard };
