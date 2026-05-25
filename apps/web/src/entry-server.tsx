// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";

const handler = createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en" data-accent-color="energy">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <link rel="apple-touch-icon" href="/favicon.png" />
          <link rel="shortcut icon" type="image/svg+xml" href="/favicon.svg" />
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#F3F4F6" media="(prefers-color-scheme: light)" />
          <meta name="theme-color" content="#111827" media="(prefers-color-scheme: dark)" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <link
            rel="preload"
            as="font"
            crossorigin="anonymous"
            href="/nunito-latin-variable-wghtOnly-normal.woff2"
            type="font/woff2"
          />
          <link
            rel="preload"
            as="font"
            crossorigin="anonymous"
            href="/nunito-latin-ext-variable-wghtOnly-normal.woff2"
            type="font/woff2"
          />
          <link
            rel="preload"
            as="font"
            crossorigin="anonymous"
            href="/jetbrains-mono-wghtOnly-normal.woff2"
            type="font/woff2"
          />
          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));

export default handler;
