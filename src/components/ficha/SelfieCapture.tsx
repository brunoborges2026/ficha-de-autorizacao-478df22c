import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/** Front camera selfie capture with a file-upload fallback. Returns a JPEG data URL. */
export function SelfieCapture({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [live, setLive] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLive(false);
  }, []);

  useEffect(() => stop, [stop]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      setLive(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      toast.error("Não foi possível abrir a câmera. Você pode enviar uma foto do seu dispositivo.");
      fileRef.current?.click();
    }
  };

  const shoot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    onChange(canvas.toDataURL("image/jpeg", 0.82));
    stop();
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(jpeg|jpg|png)$/.test(file.type)) {
      toast.error("Envie uma imagem JPG ou PNG.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-md border border-border bg-muted">
        {value ? (
          <img src={value} alt="Selfie capturada" className="aspect-[4/3] w-full object-cover" />
        ) : live ? (
          <video
            ref={videoRef}
            playsInline
            muted
            className="aspect-[4/3] w-full  object-cover"
          />
        ) : (
          <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 p-6 text-center">
            <Camera className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Tire uma selfie segurando seu documento de identidade (RG ou CNH) ao lado do rosto.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {value ? (
          <Button type="button" variant="outline" onClick={() => onChange(null)}>
            <RefreshCw className="mr-2 h-4 w-4" /> Tirar outra foto
          </Button>
        ) : live ? (
          <>
            <Button type="button" onClick={shoot}>
              <Camera className="mr-2 h-4 w-4" /> Capturar
            </Button>
            <Button type="button" variant="ghost" onClick={stop}>
              Cancelar
            </Button>
          </>
        ) : (
          <>
            <Button type="button" onClick={start}>
              <Camera className="mr-2 h-4 w-4" /> Abrir câmera
            </Button>
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> Enviar foto
            </Button>
          </>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png"
        capture="user"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </div>
  );
}
