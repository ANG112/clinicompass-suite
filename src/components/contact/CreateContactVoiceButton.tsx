import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type Status = "idle" | "recording" | "processing" | "done" | "error";

interface CreatedContact {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  category?: { label?: string };
  center?: { name?: string };
}

interface SessionResult {
  intent: "create_session" | "append_to_session";
  session: { id: string; session_number: number };
  entity: { entity_type: "patient" | "contact"; entity_id: string; display_name: string };
}

export function CreateContactVoiceButton() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [transcript, setTranscript] = useState("");
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedContact | null>(null);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>("");
  const streamRef = useRef<MediaStream | null>(null);

  const reset = () => {
    setStatus("idle");
    setTranscript("");
    setInterpretation(null);
    setCreated(null);
    setSessionResult(null);
    transcriptRef.current = "";
  };

  const processTranscript = useCallback(async () => {
    setStatus("processing");
    const finalTranscript = transcriptRef.current.trim();
    setTranscript(finalTranscript);

    if (!finalTranscript) {
      setStatus("error");
      toast.error("No se pudo transcribir el audio. Habla más claro.");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("create-contact-voice", {
        body: { transcription: finalTranscript },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setInterpretation(data.interpretation || null);
      setStatus("done");

      if (data.intent === "create_session" || data.intent === "append_to_session") {
        setSessionResult({ intent: data.intent, session: data.session, entity: data.entity });
        const verb = data.intent === "create_session" ? "creada" : "actualizada";
        toast.success(`Sesión ${data.session.session_number} de ${data.entity.display_name} ${verb}`);
        qc.invalidateQueries({ queryKey: ["patient_sessions"] });
        qc.invalidateQueries({ queryKey: ["patient_synopsis"] });
      } else {
        setCreated(data.contact);
        toast.success(`Contacto "${data.contact.first_name} ${data.contact.last_name || ""}" creado`);
        qc.invalidateQueries({ queryKey: ["contacts"] });
      }
    } catch (err: any) {
      setStatus("error");
      toast.error(err.message || "Error al procesar instrucción");
    }
  }, [qc]);

  const startRecording = useCallback(async () => {
    reset();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        // Processing is triggered by recognition.onend to ensure final transcript is captured
      };

      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) {
        toast.error("Tu navegador no soporta dictado por voz. Usa Chrome o Edge.");
        return;
      }
      const recognition = new SR();
      recognition.lang = "es-ES";
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            transcriptRef.current += t + " ";
          } else {
            interim += t;
          }
        }
        setTranscript((transcriptRef.current + " " + interim).trim());
      };
      recognition.onerror = () => {};
      recognition.onend = () => {
        // Final results have all flushed by now
        processTranscript();
      };
      recognition.start();
      recognitionRef.current = recognition;

      recorder.start();
      mediaRecorderRef.current = recorder;
      setStatus("recording");
    } catch (err: any) {
      setStatus("error");
      toast.error(err.message || "No se pudo acceder al micrófono");
    }
  }, [processTranscript]);

  const stopRecording = useCallback(() => {
    setStatus("processing");
    try { mediaRecorderRef.current?.stop(); } catch {}
    try { recognitionRef.current?.stop(); } catch {}
    mediaRecorderRef.current = null;
  }, []);

  const handleClose = () => {
    if (status === "recording") stopRecording();
    setOpen(false);
    setTimeout(reset, 300);
  };

  return (
    <>
      <Button size="sm" variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <Sparkles className="h-4 w-4" /> Asistente de voz
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Mic className="h-4 w-4 text-primary" /> Asistente de voz
            </DialogTitle>
            <DialogDescription className="space-y-1">
              <span className="block">Dicta una instrucción. Puedes:</span>
              <span className="block text-xs">• Crear contacto: <em>"Crea un contacto llamado Juan Pérez, teléfono 612345678..."</em></span>
              <span className="block text-xs">• Crear sesión: <em>"Crea una nueva sesión para María López en la que el doctor recomendó..."</em></span>
              <span className="block text-xs">• Añadir a sesión: <em>"Añade en la sesión 4 de María López que se ha pautado nuevo tratamiento..."</em></span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {status === "idle" && (
                <Button onClick={startRecording} className="gap-2">
                  <Mic className="h-4 w-4" /> Empezar a dictar
                </Button>
              )}
              {status === "recording" && (
                <Button onClick={stopRecording} variant="destructive" className="gap-2 animate-pulse">
                  <Square className="h-4 w-4" /> Detener y procesar
                </Button>
              )}
              {status === "processing" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Procesando con IA...
                </div>
              )}
              {status === "done" && (
                <div className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" /> Procesado correctamente
                </div>
              )}
              {status === "error" && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" /> Hubo un error
                </div>
              )}
            </div>

            {transcript && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Transcripción</p>
                <p className="text-sm text-foreground italic">"{transcript}"</p>
              </div>
            )}

            {interpretation && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                <p className="text-[10px] uppercase tracking-wider text-primary mb-1">Interpretación IA</p>
                <p className="text-xs text-foreground">{interpretation}</p>
              </div>
            )}

            {sessionResult && (
              <div className="rounded-lg bg-success/10 border border-success/30 p-3 space-y-1">
                <p className="text-xs font-semibold text-foreground">
                  ✓ Sesión {sessionResult.session.session_number} {sessionResult.intent === "create_session" ? "creada" : "actualizada"}
                </p>
                <p className="text-sm text-foreground">Paciente: {sessionResult.entity.display_name}</p>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      handleClose();
                      const path = sessionResult.entity.entity_type === "patient" ? "pacientes" : "contactos";
                      navigate(`/${path}/${sessionResult.entity.entity_id}`);
                    }}
                  >
                    Ver ficha
                  </Button>
                  <Button size="sm" onClick={reset}>Otra instrucción</Button>
                </div>
              </div>
            )}

            {created && (
              <div className="rounded-lg bg-success/10 border border-success/30 p-3 space-y-1">
                <p className="text-xs font-semibold text-foreground">✓ Contacto creado</p>
                <p className="text-sm text-foreground">{created.first_name} {created.last_name || ""}</p>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {created.phone && <p>📞 {created.phone}</p>}
                  {created.email && <p>✉️ {created.email}</p>}
                  {created.center?.name && <p>🏥 {created.center.name}</p>}
                  {created.category?.label && <p>🏷️ {created.category.label}</p>}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => { handleClose(); navigate(`/contactos/${created.id}`); }}>
                    Ver ficha
                  </Button>
                  <Button size="sm" onClick={reset}>Otra instrucción</Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
