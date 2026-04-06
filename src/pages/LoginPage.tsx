import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stethoscope, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { first_name: firstName, last_name: lastName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Revisa tu email para confirmar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Sesión iniciada correctamente");
      }
    } catch (err: any) {
      toast.error(err.message || "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Stethoscope className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-foreground">SaludCRM</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestión sanitaria integral</p>
        </div>

        <div className="bg-card rounded-xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold font-heading text-foreground mb-4">
            {isSignUp ? "Crear cuenta" : "Iniciar sesión"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nombre</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="h-9"
                    placeholder="Nombre"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Apellido</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="h-9"
                    placeholder="Apellido"
                  />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-9"
                placeholder="tu@email.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Contraseña</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-9"
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isSignUp ? "Crear cuenta" : "Entrar"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs text-primary hover:underline"
            >
              {isSignUp ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate"}
            </button>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-4">
          Acceso exclusivo para personal autorizado
        </p>
      </div>
    </div>
  );
}
