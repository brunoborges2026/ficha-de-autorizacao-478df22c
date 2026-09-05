import { createFileRoute } from "@tanstack/react-router";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nova senha | Vetorial Autorizações" },
      { name: "description", content: "Redefina a senha da sua conta Vetorial." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Nova senha | Vetorial Autorizações" },
      { property: "og:description", content: "Redefina a senha da sua conta Vetorial." },
    ],
  }),
  component: () => <SetPasswordForm mode="recovery" />,
});
