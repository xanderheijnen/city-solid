import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, ProtectedRoute } from '@/hooks/useAuth';
import { AppLayout } from '@/layouts/AppLayout';

// Pages
import Auth from '@/pages/Auth';
import Dashboard from '@/pages/Dashboard';
import NotFound from '@/pages/NotFound';
import Aanmeldingen from '@/pages/kandidaten/Aanmeldingen';
import NieuweAanmelding from '@/pages/kandidaten/NieuweAanmelding';
import KandidaatDetail from '@/pages/kandidaten/KandidaatDetail';
import KandidatenOverzicht from '@/pages/kandidaten/Overzicht';
import IntakeUitvoeren from '@/pages/kandidaten/IntakeUitvoeren';
import Intakegesprekken from '@/pages/kandidaten/Intakegesprekken';
import Nazorg from '@/pages/kandidaten/Nazorg';
import Trainingen from '@/pages/trainingen/Trainingen';
import Groepen from '@/pages/trainingen/Groepen';
import GroepDetail from '@/pages/trainingen/GroepDetail';
import VoortgangOverzicht from '@/pages/voortgang/VoortgangOverzicht';
import Beheer from '@/pages/beheer/Beheer';
import Gebruikers from '@/pages/beheer/Gebruikers';
import Opties from '@/pages/beheer/Opties';
import AuditLog from '@/pages/beheer/AuditLog';
import HelpCenter from '@/pages/help/HelpCenter';

// Rapportage pages
import RapportageDashboard from '@/pages/rapportage/RapportageDashboard';
import RapportageDeelnemers from '@/pages/rapportage/RapportageDeelnemers';
import RapportageVisueel from '@/pages/rapportage/RapportageVisueel';
import RapportageEind from '@/pages/rapportage/RapportageEind';
import RapportageAI from '@/pages/rapportage/RapportageAI';
import RapportageGebiedskaart from '@/pages/rapportage/RapportageGebiedskaart';
import RapportageImportLog from '@/pages/rapportage/RapportageImportLog';
import RapportageRubrieken from '@/pages/rapportage/RapportageRubrieken';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Auth />} />

            {/* Protected */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              {/* Dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Kandidaten */}
              <Route path="/kandidaten/aanmeldingen" element={<Aanmeldingen />} />
              <Route path="/kandidaten/aanmeldingen/nieuw" element={<NieuweAanmelding />} />
              <Route path="/kandidaten/intakegesprekken" element={<Intakegesprekken />} />
              <Route path="/kandidaten/uitstroom" element={<Nazorg />} />
              <Route path="/kandidaten/overzicht" element={<KandidatenOverzicht />} />
              <Route path="/kandidaten/:id" element={<KandidaatDetail />} />
              <Route path="/kandidaten/:id/intake" element={<IntakeUitvoeren />} />

              {/* Trainingen */}
              <Route path="/trainingen/programmas" element={<Trainingen />} />
              <Route path="/trainingen/groepen" element={<Groepen />} />
              <Route path="/trainingen/groepen/:id" element={<GroepDetail />} />

              {/* Voortgang */}
              <Route path="/voortgang" element={<VoortgangOverzicht />} />

              {/* Beheer */}
              <Route path="/beheer" element={<Beheer />} />
              <Route path="/beheer/gebruikers" element={<Gebruikers />} />
              <Route path="/beheer/opties" element={<Opties />} />
              <Route path="/beheer/audit" element={<AuditLog />} />

              {/* Rapportage */}
              <Route path="/rapportage/dashboard" element={<RapportageDashboard />} />
              <Route path="/rapportage/deelnemers" element={<RapportageDeelnemers />} />
              <Route path="/rapportage/rapport" element={<RapportageVisueel />} />
              <Route path="/rapportage/eindrapport" element={<RapportageEind />} />
              <Route path="/rapportage/ai-rapport" element={<RapportageAI />} />
              <Route path="/rapportage/gebiedskaart" element={<RapportageGebiedskaart />} />
              <Route path="/rapportage/import-log" element={<RapportageImportLog />} />
              <Route path="/rapportage/rubrieken" element={<RapportageRubrieken />} />
              <Route path="/rapportage/instructies" element={<Navigate to="/help" replace />} />

              {/* Help */}
              <Route path="/help" element={<HelpCenter />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
