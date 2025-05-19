// Utility to get secrets from Docker secrets or environment variables
import fs from "fs";

export function getSecret(name: string, fallback?: string): string | undefined {
  const path = `/run/secrets/${name}`;
  if (fs.existsSync(path)) {
    return fs.readFileSync(path, "utf8").trim();
  }
  return process.env[name] || fallback;
}
