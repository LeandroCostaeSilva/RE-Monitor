import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/Sidebar";

import Portal from "@/pages/Portal";
import Dashboard from "@/pages/Dashboard";
import Resolucoes from "@/pages/Resolucoes";
import ResolucaoDetalhe from "@/pages/ResolucaoDetalhe";
import ResolucaoForm from "@/pages/ResolucaoForm";
import Relatorios from "@/pages/Relatorios";
import SincronizacaoDou from "@/pages/SincronizacaoDou";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="shrink-0">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public portal — no sidebar */}
      <Route path="/" component={Portal} />

      {/* Resolucoes nested */}
      <Route path="/resolucoes" nest>
        {() => (
          <Switch>
            <Route path="/">
              <AppLayout><Resolucoes /></AppLayout>
            </Route>
            <Route path="/nova">
              <AppLayout>
                <ResolucaoForm params={{}} mode="create" />
              </AppLayout>
            </Route>
            <Route path="/:id/editar" nest>
              {({ params }) => (
                <AppLayout>
                  <ResolucaoForm params={params as Record<string, string>} mode="edit" />
                </AppLayout>
              )}
            </Route>
            <Route path="/:id" component={ResolucaoDetalhe} />
          </Switch>
        )}
      </Route>

      <Route path="/dashboard">
        <AppLayout><Dashboard /></AppLayout>
      </Route>
      <Route path="/relatorios">
        <AppLayout><Relatorios /></AppLayout>
      </Route>
      <Route path="/sincronizacao">
        <AppLayout><SincronizacaoDou /></AppLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
