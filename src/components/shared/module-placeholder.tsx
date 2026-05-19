import type { ReactNode } from "react";
import { Container } from "./container";
import { EmptyState } from "./empty-state";

interface ModulePlaceholderProps {
  title: string;
  description: string;
  icon: ReactNode;
  moduleName: string;
}

export function ModulePlaceholder({
  title,
  description,
  icon,
  moduleName,
}: ModulePlaceholderProps) {
  return (
    <Container>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          {title}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">{description}</p>
      </div>

      <EmptyState
        icon={icon}
        title={`Modul ${moduleName}`}
        description={`Halaman ${moduleName.toLowerCase()} akan dikembangkan di phase berikutnya. Modul ini sudah siap untuk implementasi business logic.`}
        badge="Segera Hadir"
      />
    </Container>
  );
}
