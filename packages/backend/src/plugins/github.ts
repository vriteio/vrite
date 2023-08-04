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
      "-----BEGIN RSA PRIVATE KEY-----\nMIIEpQIBAAKCAQEAvafYAZx8VtEzZcn9WoHcc+6tcgJAslPIp6zIz2nxe34LFgjZ\nGLtPHvzAqaM5oaxWoJ9OSBMDTEvB+5WOt6fo5BwdJ0hP3y0UBlca462FelnusZT0\ndt2e4Iv5jCbXTFaa4Ft2vKDli2YbgpPLgoTopCbAfLWZaXBSl//NVM7+yA32XiUN\nx8387Rx3sLz6MYUHkeBd5uUlWwCGcO5fYQE6w7egcCG4yqgrjV2p/UCPlKY22HGL\nTzbp15RH4HyRMML/u/5nLZX4Fu5xkEGRMtYSMJE0igW2TNG6Z/Be32YZd2CqPAwo\nONCPi9BPkpiALtYwtjwRvqNjiN2go1pvPzelYwIDAQABAoIBAQCMKia/Ehrmwtfc\ni4q9wCngWG5BSx7rbHZoTY9fkynQHdgtob5ow8321c/Bz4tBTC/9p57gL4UJdxfX\nSrHeU68QHyMArDWzeApLoUaTK+PxB9Qb1D1UN/g6ddipVu9ZUMxHsfEv+S2Md5sv\nRvFp9bZF0woBYOkPft7bzUbAPfcYe8tjQXocJ+sl5w1J9i91Ne8x3v7sntOvu85r\nadFxdQRkQ4yZgTPyNiL3foqcGHmE3S7szYdDsTADrZxTKnWdoujL4lH8J0UGI/rM\nbzrdtuTNIHvvq2V0+wjxJHSJcVFeleb15YnQ9+13ulkFaLU6hXpIMlWfSe5HuCG9\n4bPiGC2ZAoGBAOH1qVstUPFR7ls5ZizK+1OrosMNrRX20G/oLqKx0PwKM2Dcytbi\n03RTogGvUL1QCv1HzqrthQIQD5A+nxGoVF7hpfwPolBdrfxLTvx9HIV4IprkVum6\n8+eN7AxZyoALLwzRrq7mfqaDY6GXLXSFyUQBJXz19U8W22VRaz9E/0y9AoGBANbe\nm6rV+Hgcno1xN03hztmUjEeWzw7debKMZ72Y5bigXmp6JQ8/RHWdNR8XWTBDKj0/\nvtzNXg8OXySlQnYxbQOUo/VjAS9YgHx0kFwutFHV1rOmlblt4s2MpYegDTXw0dxw\nqE59sulbbY7udFQkwfOo0UTasfN6BkiAebr++KyfAoGBAODuomsQHk5LqAIJjouy\neCOfbQPMXmvJ6U4tDBeK+SWcpe6bfBQTcjmPc2tH8RCzWG0viSygCtK12DhYDhMO\nxQY6i/fyPDrSNns7IGK5zKWUpKYZ/ebn4xqzLbJRxAJYn7qcFM8oxhTOIGTgUDB5\naZQXrBDL6ymS8E3YkfFGpvnlAoGBAMmz5KuE+x89tnUOb50TuUq00M6vOiY5L/G1\nLflkW1lqaddIXBupB4nlDqXmFBpjInamrXO28XHuys+qtu4ezbgLw7Ipw0X/rXWn\nMpDmYu1jcI3qdijAh6TvP8BGNcCKFWb69nPgOaAn7Hu9SsRmUQ97TR92sI/f36AV\nwrAQg73/AoGABxebF51N7iQBNfsWWLwObgnNcmd7gY9YRE8VvFtH2/iPZ6jFRlSf\na38PxnOpAYvOMlMFIrHLJOtPKzjWmqurfK+8y4KJf9K35x1qATcqePluaWAhGGKW\nmvfqpgrfrlWQ5x6f+i8bnLiCPqauEnuGUIf5bi6ZePAWAZwE7xzJzwA=\n-----END RSA PRIVATE KEY-----",
    webhooks: { secret: "8C4CC26F4CBF5" },
    oauth: {
      clientId: "Iv1.69ac82cb395e9de7",
      clientSecret: "e9efb37eae675ac4a8e7ec995d149c6e5ab3abfa"
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
