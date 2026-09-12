import { useRef, useState } from "react";
import type { ComponentType } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";

// react-signature-canvas ships React 18 class typings; alias it for React 19 JSX.
const Pad = SignatureCanvas as unknown as ComponentType<{
  ref?: unknown;
  penColor?: string;
  onEnd?: () => void;
  clearOnResize?: boolean;
  canvasProps?: { className?: string };
}>;

/** Touch/mouse signature canvas. Emits a transparent PNG data URL (or null when cleared). */
export function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const ref = useRef<SignatureCanvas>(null);
  const [hasInk, setHasInk] = useState(false);

  const commit = () => {
    const pad = ref.current;
    if (!pad || pad.isEmpty()) {
      setHasInk(false);
      onChange(null);
      return;
    }
    setHasInk(true);
    onChange(pad.getCanvas().toDataURL("image/png"));
  };

  const clear = () => {
    ref.current?.clear();
    setHasInk(false);
    onChange(null);
  };

  return (
    <div className="space-y-3">
      <div className="relative rounded-md border border-border bg-card">
        <Pad
          ref={ref}
          penColor="#0f172a"
          onEnd={commit}
          clearOnResize={false} canvasProps={{ className: "h-44 w-full touch-none rounded-md sm:h-52" }}
        />

        {!hasInk && (
          <span className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-xs text-muted-foreground">
            Assine aqui com o dedo ou o mouse
          </span>
        )}
      </div>
      <Button type="button" variant="outline" onClick={clear} disabled={!hasInk}>
        <Eraser className="mr-2 h-4 w-4" /> Refazer assinatura
      </Button>
    </div>
  );
}
