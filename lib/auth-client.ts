import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  // fallback to window origin in browser to avoid hardcoding localhost on vercel previews
  baseURL: typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  plugins: [organizationClient()],
});
