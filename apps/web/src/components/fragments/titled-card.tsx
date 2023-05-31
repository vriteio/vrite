import { Component, JSX } from "solid-js";
import { Card, Heading, IconButton } from "#components/primitives";

interface TitledCardProps {
  icon: string;
  label: string;
  children?: JSX.Element;
  action?: JSX.Element;
  gradient?: boolean;
}

const TitledCard: Component<TitledCardProps> = (props) => {
  return (
    <Card
      class="w-full flex flex-col m-0 p-0 gap-2 items-start"
      color={props.gradient ? "primary" : "base"}
    >
      <div class="flex justify-center items-center pl-3 pr-4 pt-3 w-full">
        <IconButton
          badge
          path={props.icon}
          text={props.gradient ? "primary" : "base"}
          class="m-0 pl-0"
          variant="text"
          hover={false}
        />
        <Heading level={2} class="pl-1 flex-1">
          {props.label}
        </Heading>
        {props.action}
      </div>
      <div class="flex flex-col justify-center items-center gap-2 w-full px-4 pb-4">
        {props.children}
      </div>
    </Card>
  );
};

export { TitledCard };
