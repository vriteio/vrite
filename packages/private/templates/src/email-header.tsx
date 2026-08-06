import { Section, Img, Heading } from "@react-email/components";
import { PUBLIC_APP_URL } from "./constants";
import * as React from "react";

interface EmailHeaderProps {
  children?: React.ReactNode;
}

const EmailHeader: React.FC<EmailHeaderProps> = (props) => {
  return (
    <>
      <Section className="my-[32px]">
        <Img
          src={`${PUBLIC_APP_URL}/assets/banner.png`}
          width="500"
          height="32"
          alt="Andesine"
          className="my-0 mr-auto"
        />
      </Section>
      <Heading className="text-[36px] font-bold text-start p-0 mb-[12px] mx-0">
        {props.children}
      </Heading>
    </>
  );
};

export { EmailHeader };
