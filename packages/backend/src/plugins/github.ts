import { App, Octokit, createNodeMiddleware } from "octokit";
import MiddiePlugin from "@fastify/middie";
import { publicPlugin } from "#lib/plugin";

declare module "fastify" {
  interface FastifyInstance {
    github: App;
  }
}

const githubPlugin = publicPlugin(async (fastify) => {
  const app = new App({
    appId: "364789",
    privateKey:
      "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEAtGcGhHP7P5MfhWjRnfBlZEv7l+F6pQX82i2sen7reflFhc/J\nmArTAVr+toIVqOVjBKVyVF3FbNT9Vg5Toe3GHTAbIKUYknS3twsZuzBrTPBEXyk9\nw7rXrN+PyICRtPeMqXA73HsygViR8B8PIUebGhv7P9wECUADP6eRbSRs2Ph/SdZ/\n/RHI9xhp0nT36KcHBBEH9YcumVTqpAk9CJCyfuBfPz5z5GgyG0xqy/QHux7d5qEl\nzQDpbguLgfil2C6+4OkbVgTzFTMzpxvz6vXvQmnC0GxfO6oxWMKDXDDn9eVww27v\n7SA2/XlkKVCJ7SAJiQyjqmXnKa+yuNhFsFP69wIDAQABAoIBAQCIJzF+CeLYCnvB\nvmhl4SdE2SvbZyufHLPHHq2MDfo+pmlYIoitnY2++iQ/LlKWk/l1akCtd9Am4WEJ\n7+oizke1g7cVnkS7VCfLmC8lXde9y6Buibu522wnZtsnohFWGXcp8jDbqIdno6cR\nKP/MSDTBMdkgSzconA1Xn2pcix8zaKR3ZsrO7BSy2nvcs/U1Mzcmpo7OSzw2JgzG\nmWl2EYPdIVagreneuB5n5EkusSHNzlf6dWF38m9nEqfU6PNuTRpLMEAMPD8ffhQv\neEQzxrOcXfUkDYVo0R7MhBpJM7tqI/QwdCq0AC3dl9u57VWDLNHV1+Xc+5kAZ/87\nElYkajMhAoGBANzOYKHKuAQG++3S2GZpjlHEztLXu/QPgv/aAbF1Ij93ALnN4tTx\nJX0Gca2IwZmOhvFg4lJVQDSpyFUOgI/HlApk2wp8A20fHQ48tpyne1l6487PdgzO\nEbz/W5e0kS/JlE7vVUMlo1TCjc8CTz4wJV9Cg2KeLEDnaBuLJ74ngZufAoGBANEo\nCt//0isMqiOp/GQ79zLh6/ZsjAVArP/UhlltGGDB2cSXC2Juy0RtZYZqcqMtwyxQ\nWJCsfljGxxMCmps1TBVMryhwm06FSAKrGZn9Bc3Q9KH1ar8q6MCMMQw78uEVGh+J\n66LnNdJ5/h14huy7CAitO8vVooJO/GkMFLQtE2GpAoGAWcdUBRTe40xPrPBY6rMq\nmday3Ym4M1EHS65Bl/zvcuyZD/NFsp1mR8KSACQly6Dm/0gMXbuqAn+yI9tkrJFS\ngTNm2Il5/ylyb/KBsYprngNYkyNJdYVoMveFL1bM3ahRtBKeEVJBado9PJlMzRVY\nbLYno7Z6ed1dOC3JeAiqKzMCgYEAixrJmM7ota73nT6Z2QQ01UeCiuMIgRnRtVhg\nfitbkkZ7Eg+vB6lOUVU8t5gmZDa0Xs2VCatfYKXbkt4he2aIEoZs3EWAVUm5aeTn\n4w1wBcGaYfj6JOhh4mWa3VslnuNM+3rcF/0UQ8bU5j7Z5apCnpqwcVHFgksL/sWF\nI4vzHvkCgYAkNMN82ZNZXb1iOWo6zJRFw5M3i9+bul0+MWPZLCdn3DJF8Bp+kpEi\nC1sR7MqCHldsEXAlotQe9JQ9+1U1X2mqJUdNq0cOvtJsrwnpbC6NTTa9JKsTyghJ\ntjI4Xp+xGopZB9EIO3MlKs2pR5qYvHD98xsTjw14rj7BvkofT7fU0A==\n-----END RSA PRIVATE KEY-----",
    webhooks: { secret: "8C4CC26F4CBF5" },
    oauth: {
      clientId: "Iv1.69ac82cb395e9de7",
      clientSecret: "a1fa12edff25ca93ffe616a7b10e49c5c4e1c73f"
    }
  });

  fastify.decorate("github", app);
  fastify.get("/github/login", (req, res) => {
    const { url } = app.oauth.getWebFlowAuthorizationUrl({});

    res.redirect(url);
  });
  fastify.get("/github/callback", async (req, res) => {
    const { code } = req.query;
    const { authentication } = await app.oauth.createToken({
      code: code as string,
      state: ""
    });

    /* const response = await app.octokit.request("GET /installation/repositories", {
      headers: {
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });*/
    /* const response = await app.octokit.graphql(`query {
      viewer {
        repositories(first: 100, affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER], ownerAffiliations:[OWNER, ORGANIZATION_MEMBER, COLLABORATOR]) {
          pageInfo {hasNextPage, endCursor}
          nodes {
            name
            url
            isPrivate
            owner {
              login
            }
            defaultBranchRef {
              name
            }
          }
        }
      }
    }`);*/
    // console.log(response);
    res.redirect(`/?token=${authentication.token}`);
  });
  await fastify.register(MiddiePlugin);
  fastify.use(createNodeMiddleware(app));
});

export { githubPlugin };
