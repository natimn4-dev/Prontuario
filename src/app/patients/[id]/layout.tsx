import { PatientContextActions } from "@/components/navigation/patient-context-actions";

export default function PatientLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <PatientContextActions />
      {children}
    </>
  );
}
