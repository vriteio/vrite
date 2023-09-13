Vrite aims to provide the best and most accessible technical writing experience. To do so, we provide both a ready, [easy-to-use “Vrite Cloud” instance](https://app.vrite.io/), as well as an option for you to **self-host Vrite** on your own servers.

The recommended way self-host Vrite is with [Docker](https://docs.docker.com/engine/install/) and [Docker Compose](https://docs.docker.com/compose/install/) - both of which you need to have installed on your machine.

Start by cloning the Vrite repository and preparing the `docker.env` file:

```bash
git clone https://github.com/vriteio/vrite

cd vrite

cp .env.example docker.env
```

Then, open the `docker.env` file and fill in the environment variables. You can refer to the **Configuration** section below for more information on configuration.

When you’re done, you can start Vrite with:

```bash
docker-compose up
```

## Configuration

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
