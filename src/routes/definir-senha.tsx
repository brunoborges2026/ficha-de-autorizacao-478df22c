import { createFileRoute } from "@tanstack/react-router";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";

export const Route = createFileRoute("/definir-senha")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Definir senha | Vetorial Autorizações" },
      { name: "description", content: "Crie sua senha de acesso à plataforma Vetorial." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Definir senha | Vetorial Autorizações" },
      { property: "og:description", content: "Crie sua senha de acesso à plataforma Vetorial." },
    ],
  }),
  component: () => <SetPasswordForm mode="first-access" />,
});
