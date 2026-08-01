import { getTenantBranding } from "~/lib/tenant-branding";
import { SignInForm } from "./signin-form";

// Server wrapper so the store name is in the first HTML paint. Fetching it
// client-side would flash the fallback name on every sign-in.
export default async function SignInPage() {
  const { name } = await getTenantBranding();
  return <SignInForm storeName={name} />;
}
