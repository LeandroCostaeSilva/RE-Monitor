import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { setAuthTokenGetter } from "@workspace/api-client-react";

import Portal from "@/pages/Portal";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Resolucoes from "@/pages/Resolucoes";
import ResolucaoDetalhe from "@/pages/ResolucaoDetalhe";
import ResolucaoForm from "@/pages/ResolucaoForm";
import Usuarios from "@/pages/Usuarios";
import Relatorios from "@/pages/Relatorios";
import NotFound from "@/pages/not-found";

// Wire JWT token to API client
setAuthTokenGetter(() => localStorage.getItem("anvisa_token"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

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
      {/* Public routes */}
      <Route path="/" component={Portal} />
      <Route path="/login" component={Login} />

      {/* Resolucoes - nested to handle all sub-paths */}
      <Route path="/resolucoes" nest>
        {() => (
          <Switch>
            {/* Admin-only: list, create, edit */}
            <Route path="/">
              <AdminLayout><Resolucoes /></AdminLayout>
            </Route>
            <Route path="/nova">
              <AdminLayout>
                <ResolucaoForm params={{}} mode="create" />
              </AdminLayout>
            </Route>
            <Route path="/:id/editar" nest>
              {({ params }) => (
                <AdminLayout>
                  <ResolucaoForm params={params as any} mode="edit" />
                </AdminLayout>
              )}
            </Route>
            {/* Public: detail view (any user can access) */}
            <Route path="/:id" component={ResolucaoDetalhe} />
          </Switch>
        )}
      </Route>

      {/* Admin-only routes */}
      <Route path="/dashboard">
        <AdminLayout><Dashboard /></AdminLayout>
      </Route>
      <Route path="/usuarios">
        <AdminLayout><Usuarios /></AdminLayout>
      </Route>
      <Route path="/relatorios">
        <AdminLayout><Relatorios /></AdminLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
