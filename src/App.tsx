import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { CenterProvider } from "@/components/layout/CenterSelector";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ContactsPage from "./pages/ContactsPage";
import ContactDetailPage from "./pages/ContactDetailPage";
import BusinessesPage from "./pages/BusinessesPage";
import AgendaPage from "./pages/AgendaPage";
import CentersPage from "./pages/CentersPage";
import SpecialtyPage from "./pages/SpecialtyPage";
import CampaignsPage from "./pages/CampaignsPage";
import BillingPage from "./pages/BillingPage";
import QuotesPage from "./pages/QuotesPage";
import InvoicesPage from "./pages/InvoicesPage";
import DocumentsPage from "./pages/DocumentsPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <CenterProvider>{children}</CenterProvider>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/contactos" element={<ProtectedRoute><ContactsPage key="all" /></ProtectedRoute>} />
            <Route path="/contactos/:id" element={<ProtectedRoute><ContactDetailPage /></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute><ContactsPage key="lead" filterCategory="lead" /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><ContactsPage key="cliente" filterCategory="cliente" /></ProtectedRoute>} />
            <Route path="/negocios" element={<ProtectedRoute><BusinessesPage /></ProtectedRoute>} />
            <Route path="/agenda" element={<ProtectedRoute><AgendaPage /></ProtectedRoute>} />
            <Route path="/centros" element={<ProtectedRoute><CentersPage /></ProtectedRoute>} />
            <Route path="/especialidad/:slug" element={<ProtectedRoute><SpecialtyPage /></ProtectedRoute>} />
            {/* Legacy routes */}
            <Route path="/fisioterapia" element={<Navigate to="/especialidad/fisioterapia" replace />} />
            <Route path="/nutricion" element={<Navigate to="/especialidad/nutricion" replace />} />
            <Route path="/psicotecnicos" element={<Navigate to="/especialidad/psicotecnicos" replace />} />
            <Route path="/campanas" element={<ProtectedRoute><CampaignsPage /></ProtectedRoute>} />
            <Route path="/facturacion" element={<ProtectedRoute><InvoicesPage /></ProtectedRoute>} />
            <Route path="/presupuestos" element={<ProtectedRoute><QuotesPage /></ProtectedRoute>} />
            <Route path="/facturas" element={<ProtectedRoute><InvoicesPage invoiceType="factura" /></ProtectedRoute>} />
            <Route path="/facturas-simplificadas" element={<ProtectedRoute><InvoicesPage invoiceType="simplificada" /></ProtectedRoute>} />
            <Route path="/documentos" element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />
            <Route path="/configuracion" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/pipeline" element={<Navigate to="/negocios" replace />} />
            <Route path="/pacientes" element={<Navigate to="/clientes" replace />} />
            <Route path="/pacientes/:id" element={<Navigate to="/contactos/:id" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
