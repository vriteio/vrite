---
title: "Self-Hosting Vrite with Docker"
slug: "self-hosting/docker"
---

Vrite aims to provide the best and most accessible technical writing experience. To do so, we provide both a ready, [easy-to-use “Vrite Cloud” instance](https://app.vrite.io/), as well as an option for you to **self-host Vrite** on your own servers.

The recommended way to self-host Vrite is with [Docker](https://docs.docker.com/engine/install/) and [Docker Compose](https://docs.docker.com/compose/install/) - both of which you need to have installed on your machine.

Start by cloning the Vrite repository and preparing the `docker.env` file:

```bash
git clone https://github.com/vriteio/vrite

cd vrite

cp .env.example docker.env

```

Then, open the `docker.env` file and fill in the environment variables. You can refer to the [Configuration](/self-hosting/configuration) section for more information on the available options.

When you’re done, you can start Vrite with:

```bash
docker compose up

```

> **Important!** Currently, when self-hosting, Vrite extensions aren’t available, as the Vrite Extension System isn’t ready yet. We’ll enable later on.
