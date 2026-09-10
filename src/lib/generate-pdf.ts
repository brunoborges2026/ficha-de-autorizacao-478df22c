import { createElement } from "react";
import type { FichaPdfProps } from "@/components/ficha/FichaPdf";

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(blob);
  });
}

/** Converts an image URL (relative or absolute) to a base64 Data URL to avoid CORS/render issues in react-pdf */
export async function urlToDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  try {
    const fullUrl =
      url.startsWith("/") && typeof window !== "undefined"
        ? `${window.location.origin}${url}`
        : url;
    const res = await fetch(fullUrl);
    if (!res.ok) return url;
    const blob = await res.blob();
    return await blobToDataUrl(blob);
  } catch (err) {
    console.warn("Não foi possível pré-carregar imagem para DataURL:", err);
    return url;
  }
}

/** Renders the signed ficha PDF in the browser and returns it as a Blob. */
export async function generateFichaPdfBlob(props: FichaPdfProps): Promise<Blob> {
  const [{ pdf }, { FichaPdf }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/ficha/FichaPdf"),
  ]);

  // Pre-load images as Data URLs so react-pdf renders them without external network requests
  const [logoDataUrl, selfieDataUrl, signatureDataUrl] = await Promise.all([
    props.logoDataUrl ? Promise.resolve(props.logoDataUrl) : urlToDataUrl("/vetorial-logo.png"),
    urlToDataUrl(props.selfieDataUrl),
    urlToDataUrl(props.signatureDataUrl),
  ]);

  const resolvedProps: FichaPdfProps = {
    ...props,
    logoDataUrl,
    selfieDataUrl,
    signatureDataUrl,
  };

  return await pdf(createElement(FichaPdf, resolvedProps) as never).toBlob();
}

/** Renders the signed ficha PDF in the browser and returns it as a data URL. */
export async function generateFichaPdfDataUrl(props: FichaPdfProps): Promise<string> {
  const blob = await generateFichaPdfBlob(props);
  return blobToDataUrl(blob);
}

/** Renders and initiates automatic browser download of the signed ficha PDF. */
export async function downloadFichaPdf(
  props: FichaPdfProps,
  filename?: string,
): Promise<{ blob: Blob; dataUrl: string }> {
  const blob = await generateFichaPdfBlob(props);
  const dataUrl = await blobToDataUrl(blob);
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  const rawName = props.owner?.nome || "ficha";
  const sanitizedName = rawName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  a.download = filename || `autorizacao-${sanitizedName || "assinada"}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
  return { blob, dataUrl };
}
