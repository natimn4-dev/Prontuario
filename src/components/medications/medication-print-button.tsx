"use client";

export function MedicationPrintButton({ disabled = false }: { disabled?: boolean }) {
  return (
    <button type="button" onClick={() => window.print()} disabled={disabled}>
      Imprimir plano de medicamentos
    </button>
  );
}
