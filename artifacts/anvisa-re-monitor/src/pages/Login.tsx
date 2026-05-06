import { useState } from "react";
import { useLocation } from "wouter";
import { Shield, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginMutation = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    loginMutation.mutate(
      { data: { email, senha } },
      {
        onSuccess: (data) => {
          login(data.token, data.usuario as any);
          setLocation("/dashboard");
        },
        onError: () => {
          setError("Email ou senha incorretos. Verifique suas credenciais.");
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">ANVISA-RE Monitor</h1>
            <p className="text-blue-300 text-sm">Sistema de Gestao de Resolucoes Sanitarias</p>
          </div>
        </div>

        <Card className="border-slate-700/50 bg-slate-800/60 backdrop-blur-sm shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg">Acesso ao Sistema</CardTitle>
            <CardDescription className="text-slate-400">
              Restrito a fiscais, administradores e profissionais autorizados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300 text-sm">
                  Email institucional
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@anvisa.gov.br"
                  required
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha" className="text-slate-300 text-sm">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={showPassword ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium mt-2"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Autenticando..." : "Entrar"}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-700">
              <p className="text-center text-xs text-slate-500">
                Acesso para consulta publica disponivel no{" "}
                <a href="/" className="text-blue-400 hover:underline">Portal</a>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 text-center">
          <p className="text-xs text-slate-600">
            Credenciais de demonstracao: admin@anvisa.gov.br / anvisa2026
          </p>
        </div>
      </div>
    </div>
  );
}
