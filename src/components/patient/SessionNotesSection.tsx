import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Square, Loader2, Plus, FileText, CheckCircle2 } from "lucide-react";
import { useVoiceEdit } from "@/hooks/useVoiceEdit";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  entityType: "patient" | "contact";
  entityId: string;
}

export function SessionNotesSection({ entityType, entityId }: Props) {
  const { sessionMutation, sessionNotes, synopsis, isLoadingNotes, isLoadingSynopsis } = useVoiceEdit(entityType, entityId);
  const [manualContent, setManualContent] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "recording" | "processing">("idle");
  const mediaRecorder = useRef<MediaRecorder | null>(null);

  const handleManualSave = async () => {
    if (!manualContent.trim()) return;
    try {
      await sessionMutation.mutateAsync({ content: manualContent.trim(), source: "manual" });
      setManualContent("");
      setShowForm(false);
      toast.success("Sesión registrada y sinopsis actualizada");
    } catch (err: any) {
      toast.error(err.message || "Error al guardar la sesión");
    }
  };

  const startVoiceSession = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setVoiceStatus("processing");
        try {
          const transcription = await transcribeWithSpeechAPI();
          if (!transcription) {
            toast.error("No se pudo transcribir el audio");
            setVoiceStatus("idle");
            return;
          }
          await sessionMutation.mutateAsync({
            content: transcription,
            source: "voice",
            transcription,
          });
          toast.success("Sesión por voz registrada y sinopsis actualizada");
          setVoiceStatus("idle");
        } catch (err: any) {
          toast.error(err.message || "Error al procesar");
          setVoiceStatus("idle");
        }
      };
      recorder.start();
      mediaRecorder.current = recorder;
      setVoiceStatus("recording");
    } catch {
      toast.error("No se pudo acceder al micrófono");
    }
  }, [sessionMutation]);

  const stopVoiceSession = useCallback(() => {
    mediaRecorder.current?.stop();
  }, []);

  return (
    <div className="space-y-4">
      {/* Synopsis */}
      <div className="stat-card">
        <h3 className="text-sm font-semibold font-heading text-foreground mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Sinopsis
        </h3>
        {isLoadingSynopsis ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : synopsis?.content ? (
          <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{synopsis.content}</p>
        ) : (
          <p className="text-xs text-muted-foreground italic">Sin sinopsis. Se generará automáticamente al añadir la primera sesión.</p>
        )}
      </div>

      {/* Session history */}
      <div className="stat-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold font-heading text-foreground">Historial sesión a sesión</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setShowForm(!showForm)}>
              <Plus className="h-3.5 w-3.5" /> Manual
            </Button>
            {voiceStatus === "idle" && (
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={startVoiceSession}>
                <Mic className="h-3.5 w-3.5" /> Por voz
              </Button>
            )}
            {voiceStatus === "recording" && (
              <Button size="sm" variant="destructive" className="gap-1 text-xs animate-pulse" onClick={stopVoiceSession}>
                <Square className="h-3.5 w-3.5" /> Detener
              </Button>
            )}
            {voiceStatus === "processing" && (
              <Button size="sm" variant="outline" className="gap-1 text-xs" disabled>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Procesando...
              </Button>
            )}
          </div>
        </div>

        {/* Manual form */}
        {showForm && (
          <div className="mb-4 rounded-lg border p-3 space-y-2">
            <Textarea
              value={manualContent}
              onChange={(e) => setManualContent(e.target.value)}
              placeholder="Describe la sesión..."
              className="text-sm min-h-[80px]"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setManualContent(""); }}>Cancelar</Button>
              <Button size="sm" onClick={handleManualSave} disabled={sessionMutation.isPending || !manualContent.trim()}>
                {sessionMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                Guardar sesión
              </Button>
            </div>
          </div>
        )}

        {/* Notes list */}
        {isLoadingNotes ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : !sessionNotes?.length ? (
          <p className="text-sm text-muted-foreground text-center py-6">Sin sesiones registradas</p>
        ) : (
          <div className="space-y-2">
            {sessionNotes.map((note: any) => (
              <div key={note.id} className="rounded-lg bg-muted/30 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {format(new Date(note.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${note.source === "voice" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {note.source === "voice" ? "🎤 Voz" : "✍️ Manual"}
                  </span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-line">{note.content}</p>
                {note.transcription && note.source === "voice" && (
                  <p className="text-xs text-muted-foreground italic mt-1">Transcripción: "{note.transcription}"</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function transcribeWithSpeechAPI(): Promise<string | null> {
  return new Promise((resolve) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { resolve(null); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = "es-ES";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;
    let finalTranscript = "";
    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        }
      }
    };
    recognition.onerror = () => resolve(finalTranscript.trim() || null);
    recognition.onend = () => resolve(finalTranscript.trim() || null);
    recognition.start();
    setTimeout(() => { try { recognition.stop(); } catch {} }, 60000);
  });
}
