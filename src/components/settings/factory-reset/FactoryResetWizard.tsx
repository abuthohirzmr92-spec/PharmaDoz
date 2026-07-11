"use client";

import { useFactoryResetWizard } from "@/hooks/useFactoryResetWizard";
import { FactoryResetWarning } from "./FactoryResetWarning";
import { FactoryResetPreview } from "./FactoryResetPreview";
import { FactoryResetValidation } from "./FactoryResetValidation";
import { FactoryResetConfirmation } from "./FactoryResetConfirmation";
import { FactoryResetProgress } from "./FactoryResetProgress";
import { FactoryResetCompleted } from "./FactoryResetCompleted";

interface Props { tenantId: string; userId: string; onClose: () => void; }

export function FactoryResetWizard({ tenantId, userId, onClose }: Props) {
  const wiz = useFactoryResetWizard(tenantId, userId);
  const { stage } = wiz.state;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-neutral-900" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-700 dark:bg-neutral-900">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Factory Reset Tenant</h2>
        </div>

        <div className="px-6 py-5">
          {stage === "WARNING"        && <FactoryResetWarning onContinue={() => { wiz.goNext(); wiz.loadPreview(); }} onCancel={onClose} />}
          {stage === "PREVIEW"        && <FactoryResetPreview preview={wiz.state.preview} isLoading={wiz.state.isLoading} onContinue={() => { wiz.goNext(); wiz.runValidation(); }} onBack={() => wiz.goTo("WARNING")} />}
          {stage === "VALIDATION"     && <FactoryResetValidation validation={wiz.state.validation} isLoading={wiz.state.isLoading} onContinue={wiz.goNext} onBack={() => wiz.goTo("PREVIEW")} />}
          {stage === "CONFIRM"        && <FactoryResetConfirmation text={wiz.state.confirmationText} onChange={wiz.setConfirmationText} onExecute={wiz.execute} onBack={() => wiz.goTo("VALIDATION")} />}
          {stage === "EXECUTING"      && <FactoryResetProgress progress={wiz.state.progress} onCancel={wiz.cancel} />}
          {stage === "COMPLETED"      && <FactoryResetCompleted result={wiz.state.result} onClose={onClose} />}
          {stage === "FAILED"         && <div className="text-center py-8"><p className="text-red-600 font-medium">{wiz.state.error ?? "Reset failed"}</p><button onClick={wiz.retry} className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-lg">Retry</button></div>}
          {stage === "CANCELLED"      && <div className="text-center py-8"><p className="text-neutral-600">Factory Reset cancelled.</p><button onClick={wiz.restart} className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-lg">Restart Wizard</button></div>}
          {stage === "SESSION_EXPIRED"&& <div className="text-center py-8"><p className="text-amber-600">Session expired.</p><button onClick={wiz.restart} className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-lg">Restart</button></div>}
        </div>
      </div>
    </div>
  );
}
