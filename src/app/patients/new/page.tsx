import { PatientForm } from "@/components/patients/patient-form";

export const dynamic = "force-dynamic";

export default function NewPatientPage() {
  return (
    <main className="shell narrow-shell">
      <header className="hero compact-hero">
        <p className="eyebrow">Identificação segura</p>
        <h1>Novo paciente</h1>
        <p>O sistema verifica possíveis duplicidades antes de criar um cadastro.</p>
      </header>
      <section className="panel form-panel"><PatientForm /></section>
    </main>
  );
}
