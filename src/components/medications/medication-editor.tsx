"use client";

import { useId } from "react";

import {
  MEDICATION_MOMENTS,
  MEDICATION_MOMENT_LABELS,
  assertMedicationTextContainsNoSchedule,
  type MedicationMoment,
} from "@/domain/medication-plan";

export interface MedicationEditorValue {
  medicationText: string;
  doseInstruction: string;
  route: string;
  moments: MedicationMoment[];
  continuous: boolean;
  instructions: string;
}

export function MedicationEditor(props: {
  value: MedicationEditorValue;
  onChange: (value: MedicationEditorValue) => void;
}) {
  const medicationTextId = useId();
  const medicationTextHelpId = `${medicationTextId}-help`;
  const medicationTextErrorId = `${medicationTextId}-error`;

  let textError = "";
  try {
    if (props.value.medicationText) assertMedicationTextContainsNoSchedule(props.value.medicationText);
  } catch (error) {
    textError = error instanceof Error ? error.message : "Texto inválido.";
  }

  function toggleMoment(moment: MedicationMoment) {
    const moments = props.value.moments.includes(moment)
      ? props.value.moments.filter((value) => value !== moment)
      : [...props.value.moments, moment];
    props.onChange({ ...props.value, moments });
  }

  const medicationTextDescription = textError
    ? `${medicationTextHelpId} ${medicationTextErrorId}`
    : medicationTextHelpId;

  return (
    <fieldset className="medication-editor">
      <legend>Medicamento</legend>
      <label htmlFor={medicationTextId}>Nome + dose/apresentação</label>
      <p id={medicationTextHelpId} className="muted">
        Registre aqui apenas o medicamento e a dose/apresentação, por exemplo “Losartana 50 mg”.
        Selecione os horários separadamente abaixo.
      </p>
      <input
        id={medicationTextId}
        value={props.value.medicationText}
        placeholder="Losartana 50 mg"
        onChange={(event) => props.onChange({ ...props.value, medicationText: event.target.value })}
        aria-invalid={Boolean(textError)}
        aria-describedby={medicationTextDescription}
      />
      {textError ? (
        <p id={medicationTextErrorId} className="field-error" role="alert">
          {textError}
        </p>
      ) : null}
      <div className="compact-fields">
        <label>Dose em uso<input value={props.value.doseInstruction} onChange={(event) => props.onChange({ ...props.value, doseInstruction: event.target.value })} /></label>
        <label>Via<input value={props.value.route} onChange={(event) => props.onChange({ ...props.value, route: event.target.value })} /></label>
      </div>
      <div className="schedule-checkboxes">
        {MEDICATION_MOMENTS.map((moment) => (
          <label key={moment}>
            <input type="checkbox" checked={props.value.moments.includes(moment)} onChange={() => toggleMoment(moment)} />
            {MEDICATION_MOMENT_LABELS[moment]}
          </label>
        ))}
      </div>
      <label className="inline-check"><input type="checkbox" checked={props.value.continuous} onChange={(event) => props.onChange({ ...props.value, continuous: event.target.checked })} /> Uso contínuo</label>
      <label>Observações<textarea value={props.value.instructions} onChange={(event) => props.onChange({ ...props.value, instructions: event.target.value })} /></label>
    </fieldset>
  );
}
