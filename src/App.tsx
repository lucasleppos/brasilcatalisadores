import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import CalculatorPage from "@/pages/CalculatorPage";
import SettingsPage from "@/pages/SettingsPage";
import PlaceholderPage from "@/pages/PlaceholderPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<PlaceholderPage title="Dashboard" />} />
            <Route path="/lotes" element={<PlaceholderPage title="Lotes" />} />
            <Route path="/bags" element={<PlaceholderPage title="Bags" />} />
            <Route path="/relatorios" element={<PlaceholderPage title="Relatórios" />} />
            <Route path="/calculadora" element={<CalculatorPage />} />
            <Route path="/configuracoes" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
