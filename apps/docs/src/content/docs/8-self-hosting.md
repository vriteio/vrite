---
title: Self-hosting Vrite
category: Self-hosting
slug: self-hosting
---

Vrite aims to provide the best and most accessible technical writing experience of any headless CMS out there. To do so, we want to provide both a ready, [easy-to-use “Vrite Cloud” instance](https://app.vrite.io/), as well as allowing you to **self-host Vrite** on your own servers.

That said, while in **Public Beta**, Vrite is in active development with updates coming weekly and often even daily. Until we stabilize the core feature set of Vrite, the focus will stay on development, with the latest updates coming to the hosted instance as soon as they’re available. During this phase, Vrite Cloud will remain free for all users.

We plan to focus more on providing a better experience for **self-hosting** Vrite and **data migration** between different instances in a few months, right alongside Vrite entering its **first stable release** (planned for late **Q3 2023**)

With this in mind, self-hosting Vrite right now isn’t the best experience. That said, if you’re really interested to try and self-host Vrite, or want to contribute to Vrite’s development, here’s some information to help you get started with the [Vrite monorepo](https://github.com/vriteio/vrite/).

## Project Structure

Vrite monorepo is based on [Turborepo](https://turbo.build/repo). Among its most important dependencies are:

- [TypeScript](https://www.typescriptlang.org/) — the language the entirety of Vrite is written in;
- [Solid.js](https://solidjs.com/) — really fast UI framework powering nearly all of Vrite’s frontends;
- [Fastify](https://www.fastify.io/) — low-overhead Node.js web framework powering all of Vrite’s services;
- [tRPC](https://trpc.io/) — allows for fast development of end-to-end typesafe API for Vrite;
- [Tiptap](https://tiptap.dev/) & [ProseMirror](https://prosemirror.net/) — powerful Rich Text Editor (RTE) framework and toolkit powering Vrite editor;
- [Y.js](https://github.com/yjs/yjs) & [HocusPocus](https://hocuspocus.dev/) — libraries powering real-time collaboration in Vrite;
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) — code editor providing VS Code-like experience for everything code in Vrite;
- [Astro](https://astro.build/) — great Static Site Generator (SSG) powering Vrite landing page and docs;

The following is the current project structure:

- `/packages` — contains code shared by apps or packages meant for separate publication;
  - `/backend` — (`@vrite/backend`) backend code shared by all services;
  - `/components` — (`@vrite/component`) basic, primitive UI components shared by multiple frontend UI apps;
  - `/editor` — (`@vrite/editor`) contains custom and re-exported extensions for the Vrite editor (also used on the backend for JSON output processing)
  - `/extensions` — (`@vrite/extensions`) contains all of Vrite’s official Extensions;
  - `/scripts` — (`@vrite/script`) internal scripts for building and developing various packages and services;
  - `/sdk/javascript` — (`@vrite/sdk`) Vrite’s JavaScript SDK;
- `/apps` — contains all the frontends and services of Vrite
  - `/backend/api` — (`@vrite/api`) the REST API service;
  - `/backend/collaboration` — (`@vrite/collaboration`) the real-time collaboration service;
  - `/backend/core` — (`@vrite/core`) the main service hosting the app and internal API;
  - `/backend/extensions` — (`@vrite/extensions-backend`) the service dedicated to handling Vrite Extensions functions;
  - `/docs` — (`@vrite/docs`) the Vrite documentation;
  - `/landing-page` — (`@vrite/landing-page`) the Vrite landing page;
  - `/web` — (`@vrite/web`) the main Vrite app;

You can start a development server for all projects in the monorepo from the root using `pnpm dev` or for just a specific one using the `--filter` flag (e.g. `pnpm dev --filter @vrite/docs`). The same is applicable for `build` and `start` commands.

Not all packages projects provide all commands,

## Environment Variables

Most environment variables are meant to be configured at the root of the monorepo. To create your own `.env` file, you can follow the `.env.example`:

```
# Database
MONGO_URL=
REDIS_URL=
DATABASE=
# Security
SECRET=
# Domains
TOP_DOMAIN=
CALLBACK_DOMAIN=
# Serve
HOST=
# Email
SENDGRID_API_KEY=
SENDGRID_EMAIL_VERIFICATION_TEMPLATE_ID=
SENDGRID_MAGIC_LINK_TEMPLATE_ID=
SENDGRID_PASSWORD_CHANGE_VERIFICATION_TEMPLATE_ID=
SENDGRID_WORKSPACE_INVITE_TEMPLATE_ID=
SENDGRID_EMAIL_CHANGE_VERIFICATION_TEMPLATE_ID=
EMAIL=
SENDER_NAME=
# S3
S3_BUCKET=
S3_ENDPOINT=
S3_REGION=
S3_ACCESS_KEY=
S3_SECRET_KEY=
# GitHub OAuth2
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
# Frontend
PUBLIC_COLLAB_HOST=
PUBLIC_APP_HOST=
PUBLIC_API_HOST=
```

Right now Vrite depends on [MongoDB](https://www.mongodb.com/), [Redis](https://redis.com/), S3 storage, and [SendGrid](https://sendgrid.com/) to function. We hope to make some of these dependencies, like the mailing service, more flexible in the future.
