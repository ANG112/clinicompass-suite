import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, CheckCircle2, AlertCircle, History, Play, Pause } from "lucide-react";
import { useVoiceEdit } from "@/hooks/useVoiceEdit";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Status = "idle" | "recording" | "processing" | "done" | "error";

interface Props {
  entityType: "patient" | "contact";
  entityId: string;
}

export function VoiceEditSection({ entityType, entityId }: Props) {
  const { editMutation, voiceEdits, isLoadingEdits } = useVoiceEdit(entityType, entityId);
  const audioRecorder = useAudioRecorder({ entityType, entityId, folder: "voice-edits" });
  const [status, setStatus] = useState<Status>("idle");
  const [lastResult, setLastResult] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);

  const startRecording = useCallback(async () => {
    setLastResult(null);
    setStatus("recording");
    try {
      const result = await audioRecorder.startRecording();
      // This resolves when stopRecording is called
      setStatus("processing");
      if (!result.transcription) {
        setStatus("error");
        toast.error("No se pudo transcribir el audio. Intenta de nuevo.");
        return;
      }
      const editResult = await editMutation.mutateAsync({
        transcription: result.transcription,
        audioFilePath: result.audioFilePath,
      });
      setLastResult(editResult);
      setStatus("done");
      if (editResult.changes?.length > 0) {
        toast.success(`${editResult.changes.length} campo(s) actualizado(s)`);
      } else {
        toast.info("No se detectaron cambios en la instrucción");
      }
      setTimeout(() => setStatus("idle"), 5000);
    } catch (err: any) {
      setStatus("error");
      toast.error(err.message || "Error al procesar");
      setTimeout(() => setStatus("idle"), 4000);
    }
  }, [audioRecorder, editMutation]);

  const stopRecording = useCallback(() => {
    audioRecorder.stopRecording();
  }, [audioRecorder]);

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold font-heading text-foreground flex items-center gap-2">
          <Mic className="h-4 w-4 text-primary" />
          Editar ficha por voz
        </h3>
        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setShowHistory(!showHistory)}>
          <History className="h-3.5 w-3.5" /> Historial
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        Dicta instrucciones como: "cambia el teléfono por 612345678" o "la fecha de nacimiento es el 15 de marzo de 1990"
      </p>

      <div className="flex items-center gap-3">
        {status === "idle" && (
          <Button onClick={startRecording} size="sm" className="gap-2">
            <Mic className="h-4 w-4" /> Grabar instrucción
          </Button>
        )}
        {status === "recording" && (
          <Button onClick={stopRecording} variant="destructive" size="sm" className="gap-2 animate-pulse">
            <Square className="h-4 w-4" /> Detener grabación
          </Button>
        )}
        {status === "processing" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Procesando instrucción...
          </div>
        )}
        {status === "done" && lastResult && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            {lastResult.changes?.length > 0
              ? `Actualizado: ${lastResult.changes.map((c: any) => c.label || c.field).join(", ")}`
              : "Sin cambios detectados"}
          </div>
        )}
        {status === "error" && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" /> Error al procesar
          </div>
        )}
      </div>

      {/* Change details */}
      {lastResult?.changes?.length > 0 && (
        <div className="mt-3 rounded-lg bg-muted/50 p-3 space-y-1.5">
          <p className="text-xs font-medium text-foreground">Cambios aplicados:</p>
          {lastResult.changes.map((c: any, i: number) => (
            <div key={i} className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{c.label || c.field}:</span>{" "}
              <span className="line-through">{c.old_value || "(vacío)"}</span> → <span className="text-primary font-medium">{c.new_value}</span>
              {c.reason && <span className="italic ml-1">({c.reason})</span>}
            </div>
          ))}
        </div>
      )}

      {/* History */}
      {showHistory && (
        <div className="mt-4 space-y-2 border-t pt-3">
          <p className="text-xs font-semibold text-foreground">Historial de ediciones por voz</p>
          {isLoadingEdits ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : !voiceEdits?.length ? (
            <p className="text-xs text-muted-foreground">Sin ediciones registradas</p>
          ) : (
            voiceEdits.map((edit: any) => (
              <div key={edit.id} className="rounded-lg bg-muted/30 p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(edit.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                  </span>
                  {edit.audio_file_path && <AudioPlayer filePath={edit.audio_file_path} />}
                </div>
                {edit.transcription && (
                  <p className="text-xs italic text-muted-foreground">"{edit.transcription}"</p>
                )}
                {edit.interpreted_instruction && (
                  <p className="text-xs text-foreground">{edit.interpreted_instruction}</p>
                )}
                {Array.isArray(edit.fields_changed) && edit.fields_changed.length > 0 && (
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {(edit.fields_changed as any[]).map((c, j) => (
                      <div key={j}>
                        <span className="font-medium">{c.label || c.field}:</span>{" "}
                        {c.old_value ?? "(vacío)"} → {c.new_value}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function AudioPlayer({ filePath }: { filePath: string }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = async () => {
    if (playing && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }

    if (!audioRef.current) {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.storage
        .from("patient-audios")
        .createSignedUrl(filePath, 3600);
      if (data?.signedUrl) {
        const audio = new Audio(data.signedUrl);
        audio.onended = () => setPlaying(false);
        audioRef.current = audio;
        audio.play();
        setPlaying(true);
      }
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handlePlay} title="Reproducir audio">
      {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
    </Button>
  );
}
