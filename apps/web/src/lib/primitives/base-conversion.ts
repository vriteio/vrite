import basex from "base-x";

const b16 = basex("0123456789abcdef");
const b62 = basex("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
const hexToBytes = (hex: string) => {
  const bytes = b16.decode(hex);
  const expectedLength = Math.ceil(hex.length / 2);

  return bytes.length > expectedLength ? bytes.slice(bytes.length - expectedLength) : bytes;
};
const bytesToHex = (bytes: Uint8Array) => b16.encode(bytes);
const base62ToBytes = (base62: string) => b62.decode(base62);
const bytesToBase62 = (bytes: Uint8Array) => b62.encode(bytes);

export { bytesToHex, hexToBytes, base62ToBytes, bytesToBase62 };
