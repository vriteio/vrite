/** @jsxImportSource react */

import { Heading, Img, Link, Section } from "@react-email/components";
import { PUBLIC_APP_URL } from "./constants";
import * as React from "react";

interface EmailHeaderProps {
  children?: React.ReactNode;
}

const EmailHeader: React.FC<EmailHeaderProps> = (props) => {
  return (
    <>
      <Section className="my-[32px]">
        <Link href={PUBLIC_APP_URL}>
          <Img
            src={`${PUBLIC_APP_URL}/assets/banner-email.png`}
            width="500"
            height="32"
            alt="Andesine"
            className="email-logo-light my-0 mr-auto"
          />
        </Link>
        <Link href={PUBLIC_APP_URL}>
          <Img
            src={`${PUBLIC_APP_URL}/assets/banner-dark.png`}
            width="500"
            height="32"
            alt="Andesine"
            className="email-logo-dark my-0 mr-auto"
            style={{ display: "none", maxHeight: 0, maxWidth: 0, overflow: "hidden" }}
          />
        </Link>
      </Section>
      <Heading className="text-[36px] font-bold text-start p-0 mb-[12px] mx-0">
        {props.children}
      </Heading>
    </>
  );
};

export { EmailHeader };
