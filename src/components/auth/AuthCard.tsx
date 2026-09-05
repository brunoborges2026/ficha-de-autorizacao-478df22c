import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="hidden bg-secondary p-12 text-secondary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="inline-flex w-fit rounded-lg bg-card px-5 py-3 shadow-elegant">
          <Logo className="h-12" />
        </div>
        <div className="max-w-md">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Plataforma interna</p>
          <h2 className="text-4xl font-bold leading-tight">
            Autorizações de comercialização com assinatura digital.
          </h2>
          <p className="mt-4 text-base text-secondary-foreground/70">
            Crie a ficha em três etapas, envie pelo WhatsApp e receba o documento assinado com selfie,
            geolocalização e certificado de validação.
          </p>
        </div>
        <p className="text-xs text-secondary-foreground/50">
          Vetorial Imóveis e Arquitetura • CRECI 30038-J • Caraguatatuba-SP
        </p>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo className="h-12" />
          </div>
          <div className="rounded-lg border border-border bg-card p-6 shadow-elegant sm:p-8">
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
            <div className="mt-6">{children}</div>
          </div>
          {footer && <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
