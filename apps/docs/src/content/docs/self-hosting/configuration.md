---
slug: "self-hosting/configuration"
title: "Configuring Self-Hosted Vrite"
---

To properly host Vrite, you first have to configure a couple of environment variables. This guide aims to give you an overview of the available options.

## Security

Providing a strong `SECRET` is important, as it’s the value used to encrypt JSON Web Tokens. You can generate one from the terminal with:

```bash
openssl rand -base64 32
```

## Cookies

The optional `COOKIE_DOMAIN` variable is used to set the `Domain` attribute for session cookies. If you make your Vrite services accessible at different subdomains (e.g. _api.vrite.io_, _app.vrite.io_, etc.) it’s important to set `COOKIE_DOMAIN` to your **top domain**, like _vrite.io_, for the necessary cookies to be accessible to all services.

## Email

Vrite uses email to handle registrations, magic link logins, and important verification messages. You have to configure email to be able to sign into your Vrite instance.

There are two email configuration options available:

- **SMTP** — sends emails through SMTP, compatible with most email providers;
- **SendGrid** — sends emails through SendGrid API;

For both, configure the `SENDER_EMAIL` and `SENDGER_NAME` variables.

Then, depending on the option you choose, configure the following:

```
# Email (SMTP)
SMTP_HOST=
SMTP_PORT=
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_SECURE=

# Email (SendGrid)
SENDGRID_API_KEY=
```

## S3

Vrite stores uploaded images using the S3. For local development, can use the S3 configuration provided in `.env.example` file, for connecting to [MinIO](https://min.io/) as set up in the `docker-compose.yml` file.

For production, make sure to either secure and properly configure your MinIO instance, or use an S3-compatible service — pretty much all should work.

## GitHub OAuth2

If you want to add _Sign in with GitHub_ option to your authentication page, make sure to provide the `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` variables. Follow [the official guide](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app) to acquire the values. Use `{{PUBLIC_APP_URL}}/login/github/callback` for your **Authorization callback URL**.

When the variables are not provided, the GitHub sign-in will be disabled.

## GitHub App

To enable Git sync and synchronize your content from your GitHub repo, you’ll have to provide credentials for your GitHub App. To obtain them, follow [the official guide](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app) (use `{{PUBLIC_APP_URL}}/github/callback` for your **Callback URL**) and then fill out the variables:

```
# GitHub App (optional - GitHub Git sync)
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_APP_CLIENT_ID=
GITHUB_APP_CLIENT_SECRET=
```

When the variables are not provided, the Git sync feature will be disabled.

## Weaviate

Vrite uses [Weaviate](https://weaviate.io/) to power its built-in semantic search. To enable it, you’ll have to provide `WEAVIATE_URL` and `WEAVIATE_API_KEY` variables, for Vrite to connect to your Weaviate instance.

Your Weaviate instance has to be properly configured to work with Vrite:

- It has to have [API Key authentication](https://weaviate.io/developers/weaviate/configuration/authentication#api-key) enabled;
- It has to have a default vectorizer module set;
- If the vectorizer isn’t `text2vec-openai` or OpenAI isn’t configured in Vrite, you have to provide proper configuration right inside your Weaviate instance, for the default vectorizer to work;

You can use the `weaviate` service from `docker-compose.yml` as a reference for basic setup with OpenAI vectorizer.

> **Important!** Currently, you have to configure Weaviate before you create your first Vrite Workspace, as each Workspace creates a [new tenant](https://weaviate.io/developers/weaviate/manage-data/multi-tenancy) in Weaviate. This means you can’t retroactively add Weaviate to your Vrite instance, for the time being.

When the variables are not provided, the search and AI question-answering features will be disabled.

## OpenAI

To enable AI question-answering, you have to configure both Weaviate and OpenAI. For the latter, you have to provide `OPENAI_API_KEY` and `OPENAI_ORGANIZATION` variables. You can find them in your [OpenAI dashboard](https://platform.openai.com/docs/api-reference/authentication).

The `OPENAI_API_KEY` will be automatically forwarded to your Weaviate instance to simplify the use of `text2vec-openai` vectorizer.

When the variables are not provided, the AI question-answering feature will be disabled.