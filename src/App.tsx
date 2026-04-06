import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardPage from "./pages/DashboardPage";
import PipelinePage from "./pages/PipelinePage";
import LeadsPage from "./pages/LeadsPage";
import PatientsPage from "./pages/PatientsPage";
import PatientDetailPage from "./pages/PatientDetailPage";
import AgendaPage from "./pages/AgendaPage";
import CentersPage from "./pages/CentersPage";
import PhysioPage from "./pages/PhysioPage";
import NutritionPage from "./pages/NutritionPage";
import PsychotechPage from "./pages/PsychotechPage";
import CampaignsPage from "./pages/CampaignsPage";
import BillingPage from "./pages/BillingPage";
import DocumentsPage from "./pages/DocumentsPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/pacientes" element={<PatientsPage />} />
          <Route path="/pacientes/:id" element={<PatientDetailPage />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/centros" element={<CentersPage />} />
          <Route path="/fisioterapia" element={<PhysioPage />} />
          <Route path="/nutricion" element={<NutritionPage />} />
          <Route path="/psicotecnicos" element={<PsychotechPage />} />
          <Route path="/campanas" element={<CampaignsPage />} />
          <Route path="/facturacion" element={<BillingPage />} />
          <Route path="/documentos" element={<DocumentsPage />} />
          <Route path="/configuracion" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
