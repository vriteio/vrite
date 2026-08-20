/** @jsxImportSource react */

import { Head } from "@react-email/components";
import * as React from "react";

const darkModeStyles = `
  :root {
    color-scheme: light dark;
    supported-color-schemes: light dark;
  }

  .email-logo-dark {
    display: none;
    max-height: 0;
    max-width: 0;
    overflow: hidden;
    mso-hide: all;
  }

  @media (prefers-color-scheme: dark) {
    .email-body,
    .email-container {
      background-color: #111827 !important;
      color: #f3f4f6 !important;
    }

    .email-code {
      background-color: #1f2937 !important;
      color: #f3f4f6 !important;
    }

    .email-button {
      background-color: #f3f4f6 !important;
      color: #111827 !important;
    }

    .email-divider {
      border-color: #374151 !important;
    }

    .email-logo-light {
      display: none !important;
    }

    .email-logo-dark {
      display: block !important;
      max-height: 32px !important;
      max-width: 500px !important;
      overflow: visible !important;
    }
  }

  [data-ogsc] .email-body,
  [data-ogsc] .email-container {
    background-color: #111827 !important;
    color: #f3f4f6 !important;
  }

  [data-ogsc] .email-code {
    background-color: #1f2937 !important;
    color: #f3f4f6 !important;
  }

  [data-ogsc] .email-button {
    background-color: #f3f4f6 !important;
    color: #111827 !important;
  }

  [data-ogsc] .email-divider {
    border-color: #374151 !important;
  }

  [data-ogsc] .email-logo-light {
    display: none !important;
  }

  [data-ogsc] .email-logo-dark {
    display: block !important;
    max-height: 32px !important;
    max-width: 500px !important;
    overflow: visible !important;
  }

  [data-ogsb] .email-body,
  [data-ogsb] .email-container {
    background-color: #111827 !important;
  }

  [data-ogsb] .email-code {
    background-color: #1f2937 !important;
  }

  [data-ogsb] .email-button {
    background-color: #f3f4f6 !important;
  }
`;
const EmailHead: React.FC = () => (
  <Head>
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <style>{darkModeStyles}</style>
  </Head>
);

export { EmailHead };
