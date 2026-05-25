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

  try {
    const domain = email.split("@")[1];
    const response = await fetch(`https://api.usercheck.com/domain/${domain}`, {
      ...(typeof config.USER_CHECK === "string"
        ? {
            headers: {
              Authorization: "Bearer " + config.USER_CHECK
            }
          }
        : {})
    });
    const result: UserCheckResponse = await response.json();

    if ("disposable" in result) {
      return !result.disposable;
    }

    if (result.status === 429) {
      // Too many requests
      return true;
    }

    return false;
  } catch (error) {
    console.error(error);

    return true;
  }
};

export { validateEmail };
