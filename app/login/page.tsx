import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return <AuthForm showDemoHint={process.env.NODE_ENV !== "production"} />;
}
