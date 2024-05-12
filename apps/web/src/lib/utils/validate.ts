const validateEmail = (input: string): boolean => {
  /* prettier-ignore */
  // eslint-disable-next-line no-control-regex
  const emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;

  return emailRegex.test(input);
};
const validateKey = (input: string): boolean => {
  const variantRegex = /^[a-z0-9_]*$/;

  return input.length > 0 && input.length < 20 && variantRegex.test(input);
};
const validateUsername = validateKey;
const validateURL = (input: string): boolean => {
  let url: URL | null = null;

  try {
    url = new URL(input);
  } catch (_) {
    return false;
  }

  return url.protocol === "http:" || url.protocol === "https:";
};
const validateRedirectURL = (input: string): boolean => {
  if (input.startsWith("/")) return true;
  if (validateURL(input) && input.startsWith(window.env.PUBLIC_APP_URL)) return true;

  return false;
};
const validatePassword = (input: string): boolean => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  return passwordRegex.test(input);
};

export {
  validateEmail,
  validateUsername,
  validateKey,
  validateURL,
  validatePassword,
  validateRedirectURL
};
