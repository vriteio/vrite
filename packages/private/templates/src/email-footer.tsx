/** @jsxImportSource react */

import { Hr, Row, Column, Link, Img } from "@react-email/components";
import { PUBLIC_APP_URL, X_URL, LINKEDIN_URL, GITHUB_URL } from "./constants";
import * as React from "react";

const EmailFooter: React.FC = () => {
  return (
    <>
      <Hr className="email-divider my-[24px]" />
      <Row className="mb-[16px]">
        <Column className="my-0">
          <Row>
            <Column className="my-0">
              <Link href={X_URL}>
                <Img src={`${PUBLIC_APP_URL}/assets/x.png`} className="w-[24px]" alt="X" />
              </Link>
            </Column>
            <Column className="my-0">
              <Link href={LINKEDIN_URL}>
                <Img
                  src={`${PUBLIC_APP_URL}/assets/linkedin.png`}
                  className="w-[24px]"
                  alt="LinkedIn"
                />
              </Link>
            </Column>
            <Column className="my-0">
              <Link href={GITHUB_URL}>
                <Img
                  src={`${PUBLIC_APP_URL}/assets/github.png`}
                  className="w-[24px]"
                  alt="GitHub"
                />
              </Link>
            </Column>
          </Row>
        </Column>
        <Column className="w-[80%] text-[16px] text-gray-300 my-0"></Column>
      </Row>
      <Row className="mb-[24px]">
        <Column className="text-[12px] leading-[16px] text-gray-400 my-0 font-mono">
          Andesine, the adaptive
          <br /> content workspace.
        </Column>
      </Row>
    </>
  );
};

export { EmailFooter };
