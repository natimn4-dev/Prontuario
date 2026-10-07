import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

test("signed-report PDF preserves gaps, original scores, measurement dates and long histories", () => {
  // Execute the real renderer, including its TypeScript parameter properties.
  const output = execFileSync(process.execPath, ["--experimental-transform-types", "--input-type=module"], {
    encoding: "utf8",
    input: `
      import { buildAgaReportPdf } from './src/server/signatures/report-pdf.ts';
      import { buildAgaReportModel } from './src/domain/aga-report.ts';
      import { buildCapacityDimensionHistory } from './src/domain/capacity-dimension-history.ts';
      const consultations = Array.from({ length: 12 }, (_, index) => ({ id: 'c' + index, patientId: 'synthetic', occurredAt: index < 2 ? '2026-01-01' : '2026-' + String(index).padStart(2, '0') + '-01' }));
      function render(version) {
        const assessments = [0, 2].map((index) => ({ patientId: 'synthetic', consultationId: 'c' + index, scaleCode: 'moca', scaleVersion: index ? version : '1', scoreNumeric: index ? 18 : 25, clinicalColor: 'amarelo', appliedAt: consultations[index].occurredAt }));
        const capacityHistory = buildCapacityDimensionHistory({ patientId: 'synthetic', consultations, assessments, targetConsultationId: 'c11' });
        const report = { ...buildAgaReportModel({ patientId: 'synthetic', consultationId: 'c11', consultationStatus: 'FINALIZED', patientName: 'Paciente Sintético', longitudinalProblems: [], longitudinalAssessments: [] }), capacityHistory, overview: { functionality: [] } };
        return buildAgaReportPdf({ report, professionalIdentity: { displayName: 'Médica Sintética', roleLabel: 'Geriatria', personalizedBrand: false }, verificationUrl: 'https://example.com/verify/synthetic', snapshotVersion: 1 }).toString('ascii');
      }
      const pdf = render('1');
      console.log(JSON.stringify({
        dashed: pdf.includes('[4 3] 0 d'), incompatibleDashed: render('2').includes('[4 3] 0 d'),
        score25: pdf.includes(': 25'), score18: pdf.includes(': 18'),
        lastDate: pdf.includes('01/02/26'), firstDate: pdf.includes('01/01/26'),
        lastVisit: pdf.includes('Consulta 12'), lastBlock: pdf.includes('Consultas 10 a 12'),
        pages: pdf.split('/Type /Page ').length - 1, readable: pdf.includes('/F1 11.00 Tf')
      }));
    `,
  });
  const result = JSON.parse(output.trim());
  assert.equal(result.dashed, true);
  assert.equal(result.incompatibleDashed, false);
  assert.equal(result.score25, true);
  assert.equal(result.score18, true);
  assert.equal(result.lastDate, true);
  assert.equal(result.firstDate, true);
  assert.equal(result.lastVisit, true);
  assert.equal(result.lastBlock, true);
  assert.ok(result.pages > 1);
  assert.equal(result.readable, true);
});
