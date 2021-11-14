import { createHash as cryptoCreateHash } from "crypto";

export const createHash = (fileName: string, source: string): string => {
  const hash = cryptoCreateHash("sha256");
  hash.update(fileName);
  hash.update(":");
  hash.update(source);

  return hash.digest("hex").substr(0, 8);
};
