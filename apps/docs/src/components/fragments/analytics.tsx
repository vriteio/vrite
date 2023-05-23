import Plausible from "plausible-tracker";
import type { Component } from "solid-js";

const plausibleConfig = {
  trackLocalhost: false,
  domain: "vrite.io"
};
const trackSignUp = (): void => {
  const { trackEvent } = Plausible(plausibleConfig);

  trackEvent("sign-up");
};
const Analytics: Component = () => {
  const { trackPageview } = Plausible(plausibleConfig);

  trackPageview();

  return <></>;
};

export { Analytics, trackSignUp };
