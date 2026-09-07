import { createElement } from "react";
import type { FichaPdfProps } from "@/components/ficha/FichaPdf";

export function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(blob);
  });
}

/** Renders the signed ficha PDF in the browser and returns it as a data URL. */
export async function generateFichaPdfDataUrl(props: FichaPdfProps) {
  const [{ pdf }, { FichaPdf }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/ficha/FichaPdf"),
  ]);
  const blob = await pdf(createElement(FichaPdf, props) as never).toBlob();
  return blobToDataUrl(blob);
}
