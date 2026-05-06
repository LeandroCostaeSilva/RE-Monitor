import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  vigente: {
    label: "Vigente",
    className: "bg-red-100 text-red-700 border border-red-200 font-semibold",
  },
  revogada: {
    label: "Revogada",
    className: "bg-gray-100 text-gray-600 border border-gray-200",
  },
  encerrada: {
    label: "Encerrada",
    className: "bg-blue-100 text-blue-700 border border-blue-200",
  },
  em_analise: {
    label: "Em Analise",
    className: "bg-orange-100 text-orange-700 border border-orange-200 font-semibold",
  },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    className: "bg-gray-100 text-gray-600 border border-gray-200",
  };

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded text-xs uppercase tracking-wide", config.className)}>
      {config.label}
    </span>
  );
}

export function getStatusLabel(status: string): string {
  return STATUS_CONFIG[status]?.label || status;
}
