import logoAsset from "@/assets/vetorial-logo.png.asset.json";
import { cn } from "@/lib/utils";

export const LOGO_URL = logoAsset.url;

export function Logo({ className, variant = "default" }: { className?: string; variant?: "default" | "light" }) {
  return (
    <img
      src={LOGO_URL}
      alt="Vetorial Imóveis e Arquitetura"
      className={cn("h-10 w-auto object-contain", variant === "light" && "brightness-0 invert", className)}
    />
  );
}
