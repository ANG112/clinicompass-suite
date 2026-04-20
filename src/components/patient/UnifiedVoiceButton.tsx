import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Status = "idle" | "recording" | "processing" | "done" | "error";

interface Props {
  entityType: "patient" | "contact";
  entityId: string;
  /** Compact mode for use in list rows */
  compact?: boolean;
}

interface UnifiedResult {
  field_changes_applied: Array<{
    field: string;
    label: string;
    old_value: string | null;
    new_value: string;
    reason: string;
  }>;
  session_action_result: { type: "created" | "appended" | "error"; session_id?: string; session_number?: number; message?: string } | null;
  notes_appended: boolean;
  interpretation: string;
}

export function UnifiedVoiceButton({ entityType, entityId, compact }: Props) {
  const qc = useQueryClient();
  const audioRecorder = useAudioRecorder({ entityType, entityId, folder: "voice-edits" });
  const [status, setStatus] = useState<Status>("idle");
  const [lastResult, setLastResult] = useState<UnifiedResult | null>(null);

  const startRecording = useCallback(async () => {
    setLastResult(null);
    setStatus("recording");
    try {
      const result = await audioRecorder.startRecording();
      setStatus("processing");
      if (!result.transcription) {
        setStatus("error");
        toast.error("No se pudo transcribir el audio. Intenta de nuevo.");
        setTimeout(() => setStatus("idle"), 3000);
        return;
      }

      const { data, error } = await supabase.functions.invoke("process-voice-unified", {
        body: {
          transcription: result.transcription,
          entity_type: entityType,
          entity_id: entityId,
          audio_file_path: result.audioFilePath,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setLastResult(data);
      setStatus("done");

      // Build toast message
      const parts: string[] = [];
      if (data.field_changes_applied?.length > 0) {
        parts.push(`${data.field_changes_applied.length} campo(s) actualizado(s)`);
      }
      if (data.session_action_result?.type === "created") {
        parts.push(`sesión ${data.session_action_result.session_number ?? ""} creada`.trim());
      } else if (data.session_action_result?.type === "appended") {
        parts.push(`sesión ${data.session_action_result.session_number ?? ""} actualizada`.trim());
      } else if (data.notes_appended) {
        parts.push("observaciones actualizadas");
      }
      if (data.session_action_result || data.notes_appended) parts.push("sinopsis actualizada");
      if (parts.length > 0) {
        toast.success(parts.join(" · "));
      } else {
        toast.info("No se detectaron cambios ni sesiones en la instrucción");
      }

      // Invalidate all relevant queries
      qc.invalidateQueries({ queryKey: [entityType === "patient" ? "patient" : "contact", entityId] });
      qc.invalidateQueries({ queryKey: ["voice-edits", entityType, entityId] });
      qc.invalidateQueries({ queryKey: ["session-notes", entityType, entityId] });
      qc.invalidateQueries({ queryKey: ["patient-sessions", entityType, entityId] });
      qc.invalidateQueries({ queryKey: ["session-entries"] });
      qc.invalidateQueries({ queryKey: ["synopsis", entityType, entityId] });

      setTimeout(() => setStatus("idle"), 6000);
    } catch (err: any) {
      setStatus("error");
      toast.error(err.message || "Error al procesar");
      setTimeout(() => setStatus("idle"), 4000);
    }
  }, [audioRecorder, entityType, entityId, qc]);

  const stopRecording = useCallback(() => {
    audioRecorder.stopRecording();
  }, [audioRecorder]);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {status === "idle" && (
          <button
            className="h-10 w-10 rounded-full border border-primary/20 bg-primary/5 hover:bg-primary/15 flex items-center justify-center transition-colors"
            title="Grabar instrucción de voz"
            onClick={(e) => { e.stopPropagation(); startRecording(); }}
          >
            <Mic className="h-5 w-5 text-primary" />
          </button>
        )}
        {status === "recording" && (
          <button
            className="h-10 w-10 rounded-full border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center transition-colors animate-pulse"
            title="Detener grabación"
            onClick={(e) => { e.stopPropagation(); stopRecording(); }}
          >
            <Square className="h-5 w-5 text-destructive" />
          </button>
        )}
        {status === "processing" && (
          <div className="h-10 w-10 rounded-full border border-border bg-muted/30 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
        {status === "done" && (
          <div className="h-10 w-10 rounded-full border border-green-200 bg-green-50 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
        )}
        {status === "error" && (
          <div className="h-10 w-10 rounded-full border border-destructive/20 bg-destructive/5 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold font-heading text-foreground flex items-center gap-2">
          <Mic className="h-4 w-4 text-primary" />
          Asistente de voz
        </h3>
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        Dicta cualquier instrucción: cambios en la ficha, notas de sesión, o ambas cosas a la vez. La IA clasificará y ejecutará automáticamente.
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
            <Loader2 className="h-4 w-4 animate-spin" /> Procesando con IA...
          </div>
        )}
        {status === "done" && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" /> Procesado correctamente
          </div>
        )}
        {status === "error" && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" /> Error al procesar
          </div>
        )}
      </div>

      {/* Results summary */}
      {lastResult && (status === "done") && (
        <div className="mt-3 rounded-lg bg-muted/50 p-3 space-y-2">
          {lastResult.interpretation && (
            <p className="text-xs text-muted-foreground italic">"{lastResult.interpretation}"</p>
          )}
          
          {lastResult.field_changes_applied.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">📝 Cambios en la ficha:</p>
              {lastResult.field_changes_applied.map((c, i) => (
                <div key={i} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{c.label}:</span>{" "}
                  <span className="line-through">{c.old_value || "(vacío)"}</span> → <span className="text-primary font-medium">{c.new_value}</span>
                </div>
              ))}
            </div>
          )}

          {lastResult.session_action_result && lastResult.session_action_result.type !== "error" && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">🩺 Sesión registrada:</p>
              <p className="text-xs text-muted-foreground">
                {lastResult.session_action_result.type === "created"
                  ? `Se ha creado la sesión ${lastResult.session_action_result.session_number ?? ""}.`
                  : `Se ha actualizado la sesión ${lastResult.session_action_result.session_number ?? ""}.`}
              </p>
              <p className="text-[10px] text-green-600">✓ Sinopsis actualizada automáticamente</p>
            </div>
          )}

          {lastResult.notes_appended && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">📝 Observaciones actualizadas:</p>
              <p className="text-xs text-muted-foreground">La instrucción se ha añadido a las notas del paciente/contacto.</p>
            </div>
          )}

          {lastResult.field_changes_applied.length === 0 && !lastResult.session_action_result && !lastResult.notes_appended && (
            <p className="text-xs text-muted-foreground">No se detectaron cambios ni sesiones.</p>
          )}
        </div>
      )}
    </div>
  );
}
