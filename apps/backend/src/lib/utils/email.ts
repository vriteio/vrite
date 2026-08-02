import { config } from "#backend/lib/config";

type UserCheckResponse =
  | {
      status: number;
      error: string;
    }
  | {
      status: number;
      domain: string;
      mx: boolean;
      disposable: boolean;
      public_domain: boolean;
      did_you_mean: string | null;
    };

const validateEmail = async (email: string): Promise<boolean> => {
  if (!config.USER_CHECK) return true;

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 5_000);

  try {
    const domain = email.split("@")[1];
    const response = await fetch(`https://api.usercheck.com/domain/${domain}`, {
      signal: abortController.signal,
      ...(typeof config.USER_CHECK === "string"
        ? {
            headers: {
              Authorization: "Bearer " + config.USER_CHECK
            }
          }
        : {})
    });
    if (!response.ok) {
      console.error("UserCheck email-domain check unavailable", { status: response.status });
      return true;
    }

    const result: UserCheckResponse = await response.json();

    if ("disposable" in result) {
      return !result.disposable;
    }

    console.error("UserCheck email-domain check returned an error", {
      status: result.status
    });
    return true;
  } catch (error) {
    console.error("UserCheck email-domain check unavailable", { error });

    return true;
  } finally {
    clearTimeout(timeout);
  }
};

export { validateEmail };
