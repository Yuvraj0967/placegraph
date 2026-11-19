// Configuration comes ONLY from environment variables (.env). No credentials are hard-coded.
export function requireEnv(name) {
  const v = process.env[name];
  if (!v || v.startsWith('change-me')) {
    throw new Error(`Missing environment variable ${name}. Run "npm run init" (creates .env with random secrets) or copy .env.example to .env.`);
  }
  return v;
}
