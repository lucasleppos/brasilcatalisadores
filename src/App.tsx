import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import CalculatorPage from "@/pages/CalculatorPage";
import SettingsPage from "@/pages/SettingsPage";
import PurchasesPage from "@/pages/PurchasesPage";
import SuppliersPage from "@/pages/SuppliersPage";
import ProcessesPage from "@/pages/ProcessesPage";
import BagsPage from "@/pages/BagsPage";
import PlaceholderPage from "@/pages/PlaceholderPage";
import ReportsPage from "@/pages/ReportsPage";
import LoginPage from "@/pages/LoginPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import UsersPage from "@/pages/UsersPage";
import ProfilePage from "@/pages/ProfilePage";
import PermissionsPage from "@/pages/PermissionsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected routes */}
            <Route path="/" element={<ProtectedRoute><AppLayout><PlaceholderPage title="Dashboard" /></AppLayout></ProtectedRoute>} />
            <Route path="/compras" element={<ProtectedRoute module="compras"><AppLayout><PurchasesPage /></AppLayout></ProtectedRoute>} />
            <Route path="/fornecedores" element={<ProtectedRoute module="fornecedores"><AppLayout><SuppliersPage /></AppLayout></ProtectedRoute>} />
            <Route path="/processos" element={<ProtectedRoute module="processos"><AppLayout><ProcessesPage /></AppLayout></ProtectedRoute>} />
            <Route path="/bags" element={<ProtectedRoute module="bags"><AppLayout><BagsPage /></AppLayout></ProtectedRoute>} />
            <Route path="/relatorios" element={<ProtectedRoute module="relatorios"><AppLayout><ReportsPage /></AppLayout></ProtectedRoute>} />
            <Route path="/calculadora" element={<ProtectedRoute module="calculadora"><AppLayout><CalculatorPage /></AppLayout></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute module="configuracoes"><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute module="usuarios"><AppLayout><UsersPage /></AppLayout></ProtectedRoute>} />
            <Route path="/permissoes" element={<ProtectedRoute module="permissoes"><AppLayout><PermissionsPage /></AppLayout></ProtectedRoute>} />
            <Route path="/perfil" element={<ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
