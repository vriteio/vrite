import { SendRequest } from "./request";

interface Profile {
  /**
   * User ID
   */
  id: string;
  /**
   * User avatar URL
   */
  avatar?: string;
  /**
   * Username
   */
  username: string;
  /**
   * User's personal bio
   */
  bio?: string;
  /**
   * User's full name
   */
  fullName?: string;
  /**
   * User's email
   */
  email: string;
  /**
   * Whether the user's new email is verified in the email change process
   */
  newEmailChangeInVerification?: boolean;
  /**
   * Whether the user's old email is verified in the email change process
   */
  oldEmailChangeInVerification?: boolean;
  /**
   * Whether the user's password is verified in the password change process
   */
  passwordChangeInVerification?: boolean;
  /**
   * Whether the user's email is verified
   */
  emailInVerification?: boolean;
}
interface ProfileEndpoints {
  get(): Promise<Profile>;
}

const basePath = "/profile";
const createProfileEndpoints = (sendRequest: SendRequest): ProfileEndpoints => {
  return {
    get: () => {
      return sendRequest<Profile>("GET", `${basePath}`);
    }
  };
};

export { createProfileEndpoints };
export type { Profile, ProfileEndpoints };
