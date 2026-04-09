import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, History, Volume2, ChevronDown, ChevronUp, Play, Pause } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { usePatientNote, usePatientNoteVersions, usePatientNoteAudios, useProcessPatientNote } from "@/hooks/usePatientNotes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  patientId?: string;
  contactId?: string;
}

type ProcessingStep = "idle" | "recording" | "uploading" | "processing" | "done" | "error";

const stepLabels: Record<ProcessingStep, string> = {
  idle: "",
  recording: "Grabando audio...",
  uploading: "Subiendo audio...",
  processing: "Procesando con IA...",
  done: "¡Listo!",
  error: "Error en el procesamiento",
};

export function PatientNotesSection({ patientId, contactId }: Props) {
  const entityId = patientId || contactId;
  const { data: patientNote, isLoading } = usePatientNote({ patientId, contactId });
  const { data: versions } = usePatientNoteVersions(patientNote?.id);
  const { data: audios } = usePatientNoteAudios(patientNote?.id);
  const processNote = useProcessPatientNote();

  const [step, setStep] = useState<ProcessingStep>("idle");
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [audiosOpen, setAudiosOpen] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start(250);
      setStep("recording");
    } catch (err) {
      toast.error("No se pudo acceder al micrófono. Verifica los permisos del navegador.");
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === "inactive") return;

    return new Promise<void>((resolve) => {
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        mediaRecorder.stream.getTracks().forEach((t) => t.stop());

        setStep("uploading");

        try {
          const reader = new FileReader();
          const base64 = await new Promise<string>((res, rej) => {
            reader.onload = () => {
              const result = reader.result as string;
              res(result.split(",")[1]);
            };
            reader.onerror = rej;
            reader.readAsDataURL(blob);
          });

          setStep("processing");

          await processNote.mutateAsync({
            patientId: patientId || undefined,
            contactId: contactId || undefined,
            audioBase64: base64,
            fileName: `nota_${Date.now()}.webm`,
          });

          setStep("done");
          toast.success("Notas actualizadas correctamente");
          setTimeout(() => setStep("idle"), 2000);
        } catch (err: any) {
          setStep("error");
          toast.error(err.message || "Error al procesar la nota de voz");
          setTimeout(() => setStep("idle"), 3000);
        }
        resolve();
      };
      mediaRecorder.stop();
    });
  }, [patientId, contactId, processNote]);

  const playAudio = async (filePath: string, audioId: string) => {
    if (playingAudio === audioId) {
      audioPlayerRef.current?.pause();
      setPlayingAudio(null);
      return;
    }

    try {
      const { data } = await supabase.storage.from("patient-audios").createSignedUrl(filePath, 300);
      if (!data?.signedUrl) { toast.error("No se pudo obtener el audio"); return; }

      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      const audio = new Audio(data.signedUrl);
      audioPlayerRef.current = audio;
      audio.onended = () => setPlayingAudio(null);
      audio.play();
      setPlayingAudio(audioId);
    } catch { toast.error("Error al reproducir audio"); }
  };

  const renderContent = (content: string) => {
    if (!content) return <p className="text-sm text-muted-foreground italic">Sin notas todavía. Graba una nota de voz para empezar.</p>;

    return (
      <div className="prose prose-sm max-w-none text-foreground">
        {content.split("\n").map((line, i) => {
          if (line.startsWith("## ")) {
            return <h4 key={i} className="text-xs font-bold text-primary mt-3 mb-1 uppercase tracking-wide">{line.replace("## ", "")}</h4>;
          }
          if (line.trim() === "-" || line.trim() === "") return null;
          return <p key={i} className="text-sm text-foreground/90 leading-relaxed mb-0.5">{line}</p>;
        })}
      </div>
    );
  };

  const isRecording = step === "recording";
  const isBusy = step !== "idle" && step !== "done" && step !== "error";

  if (!entityId) return null;

  return (
    <div className="space-y-4">
      <div className="stat-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold font-heading text-foreground">Notas del paciente</h3>
          <div className="flex items-center gap-2">
            {patientNote && (
              <>
                <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setVersionsOpen(true)}>
                  <History className="h-3.5 w-3.5" /> Historial ({versions?.length || 0})
                </Button>
                <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setAudiosOpen(true)}>
                  <Volume2 className="h-3.5 w-3.5" /> Audios ({audios?.length || 0})
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="min-h-[120px] p-4 rounded-lg bg-muted/50 border border-border/50 mb-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            renderContent(patientNote?.content || "")
          )}
        </div>

        <div className="flex items-center gap-3">
          {isRecording ? (
            <Button variant="destructive" size="sm" className="gap-2" onClick={stopRecording}>
              <Square className="h-4 w-4" />
              Detener grabación
            </Button>
          ) : (
            <Button
              size="sm"
              className="gap-2"
              onClick={startRecording}
              disabled={isBusy}
            >
              <Mic className="h-4 w-4" />
              Grabar nota de voz
            </Button>
          )}

          {step !== "idle" && (
            <div className="flex items-center gap-2 text-sm">
              {isBusy && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              {isRecording && <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />}
              <span className={step === "error" ? "text-destructive" : step === "done" ? "text-green-600" : "text-muted-foreground"}>
                {stepLabels[step]}
              </span>
            </div>
          )}
        </div>

        {patientNote?.updated_at && (
          <p className="text-[10px] text-muted-foreground mt-3">
            Última actualización: {format(new Date(patientNote.updated_at), "dd/MM/yyyy HH:mm", { locale: es })}
          </p>
        )}
      </div>

      {/* Version history dialog */}
      <Dialog open={versionsOpen} onOpenChange={setVersionsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Historial de versiones</DialogTitle>
            <DialogDescription>Versiones anteriores de las notas</DialogDescription>
          </DialogHeader>
          {!versions?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin historial de versiones</p>
          ) : (
            <div className="space-y-2">
              {versions.map((v) => (
                <div key={v.id} className="border rounded-lg p-3">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedVersion(expandedVersion === v.id ? null : v.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-primary">v{v.version_number}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(v.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                      </span>
                    </div>
                    {expandedVersion === v.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                  {expandedVersion === v.id && (
                    <div className="mt-3 p-3 bg-muted/50 rounded text-xs whitespace-pre-wrap">{v.content}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Audios history dialog */}
      <Dialog open={audiosOpen} onOpenChange={setAudiosOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Historial de audios</DialogTitle>
            <DialogDescription>Grabaciones de voz asociadas</DialogDescription>
          </DialogHeader>
          {!audios?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin audios grabados</p>
          ) : (
            <div className="space-y-3">
              {audios.map((a) => (
                <div key={a.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs h-7"
                      onClick={() => playAudio(a.file_path, a.id)}
                    >
                      {playingAudio === a.id ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                      {playingAudio === a.id ? "Pausar" : "Reproducir"}
                    </Button>
                  </div>
                  {a.transcription && (
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1">Transcripción:</p>
                      <p className="text-xs text-foreground/80">{a.transcription}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
