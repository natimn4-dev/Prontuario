export type SourceValidationStatus =
  | "confirmed-primary"
  | "mixed-primary-and-local"
  | "confirmed-institutional"
  | "needs-review";

export interface ClinicalSourceProvenance {
  scaleId: string;
  status: SourceValidationStatus;
  legacyVersion: string;
  primaryReference?: string;
  note: string;
}

/**
 * Catálogo de procedência clínica para impedir que uma regra local do legado
 * seja apresentada como se fosse um ponto de corte validado pela publicação
 * primária. A reprodução do golden master e a validação bibliográfica são
 * eixos independentes.
 */
export const SOURCE_PROVENANCE: Record<string, ClinicalSourceProvenance> = {

  isi: {
    scaleId: "isi",
    status: "mixed-primary-and-local",
    legacyVersion: "ISI-7-scoring-2001-BR-validation-2011-v1",
    primaryReference:
      "Bastien CH, Vallières A, Morin CM. Sleep Med. 2001;2(4):297-307. PMID 11438246; Castro LS. Adaptação e validação do Índice de Gravidade de Insônia (IGI). UNIFESP, 2011.",
    note:
      "A publicação original sustenta a ISI como instrumento breve de rastreio/quantificação, e a validação brasileira de 2011 avaliou a versão em português em amostra adulta da cidade de São Paulo. As quatro faixas 0-7, 8-14, 15-21 e 22-28 são preservadas como referência operacional; o software não deve convertê-las em diagnóstico. A redação literal dos sete itens e alternativas permanece fora do código até confirmação documental da versão brasileira autorizada e da licença eletrônica aplicável via Mapi Research Trust.",
  },
  ecog: {
    scaleId: "ecog",
    status: "confirmed-primary",
    legacyVersion: "Incluída na oncogeriatria em 2026-08-13",
    primaryReference:
      "Oken MM et al. Toxicity and response criteria of the Eastern Cooperative Oncology Group. Am J Clin Oncol. 1982;5(6):649-655. PMID: 7165009; ECOG-ACRIN Performance Status Scale.",
    note:
      "Graus 0 a 5 conforme a definição pública da ECOG-ACRIN. As cores da interface são auxiliares locais e não fazem parte do instrumento original.",
  },
  crash_mna_sf: {
    scaleId: "crash_mna_sf",
    status: "needs-review",
    legacyVersion: "CRASH-MNA-SF-local-1.0, autorizada em 2026-08-13",
    primaryReference:
      "Extermann M et al. Cancer. 2012;118(13):3377-3386. PMID: 22072065. Adaptação local substitui o MNA completo pelo MNA-SF.",
    note:
      "Adaptação institucional não validada externamente. Mantém os demais componentes da CRASH, mas atribui 0 ponto ao MNA-SF 12-14 e 2 pontos ao MNA-SF 0-11. Não deve ser apresentada como equivalente à CRASH original nem usada isoladamente para decidir tratamento.",
  },

  zarit_paliativo_7_ms2013: {
    scaleId: "zarit_paliativo_7_ms2013",
    status: "confirmed-institutional",
    legacyVersion: "Fonte institucional adicionada em 2026-08-12",
    primaryReference:
      "Brasil. Ministério da Saúde. Caderno de Atenção Domiciliar, 2013; material institucional 'Atenção Domiciliar: Cuidados Paliativos' anexado ao projeto.",
    note:
      "Versão institucional de 7 itens, cada item pontuado de 1 a 5. O material classifica até 14 como leve, 15-21 como moderada e acima de 22 como grave; o valor 22 não recebe classificação explícita e deve permanecer como lacuna de fonte até revisão clínica/documental.",
  },
  fast: {
    scaleId: "fast",
    status: "mixed-primary-and-local",
    legacyVersion: "AGA 1.html / ESCALAS 1.0",
    primaryReference:
      "Reisberg B et al. Functional Assessment Staging (FAST), conforme referência registrada no legado.",
    note:
      "A ordinalidade e os estágios são preservados do FAST legado. As cores, textos de comunicação e a recomendação de transição paliativa a partir de 7c são regras clínicas do aplicativo e devem permanecer identificadas como locais.",
  },
  pps: {
    scaleId: "pps",
    status: "mixed-primary-and-local",
    legacyVersion: "AGA 1.html / ESCALAS 1.0",
    primaryReference:
      "Anderson F et al., 1996 (Victoria Hospice Society), conforme referência registrada no legado.",
    note:
      "Os níveis de 10% a 100% são preservados do legado. As faixas verde/amarelo/vermelho (70-100 / 40-60 / 10-30) são uma camada local de apresentação e não devem ser comunicadas como estimativa individual de tempo de vida.",
  },
  esas: {
    scaleId: "esas",
    status: "mixed-primary-and-local",
    legacyVersion: "AGA 1.html / ESCALAS 1.0",
    primaryReference:
      "Bruera E et al., J Palliat Care 1991; versão brasileira/ANCP conforme referência registrada no legado.",
    note:
      "O legado usa nove sintomas de 0 a 10, total 0-90, faixas globais 0-9 / 10-29 / 30-90 e regra local de ação para qualquer sintoma >=7. A intensidade individual deve ser exibida separadamente da soma total.",
  },
  apgar_familiar: {
    scaleId: "apgar_familiar",
    status: "mixed-primary-and-local",
    legacyVersion: "AGA 1.html / ESCALAS 1.0",
    primaryReference:
      "Smilkstein G. J Fam Pract. 1978;6(6):1231-1239. PMID 660126; validação de confiabilidade: Smilkstein et al. J Fam Pract. 1982;15(2):303-311. PMID 7097168.",
    note:
      "O instrumento de cinco itens é sustentado pela literatura primária, mas as faixas 0-3 / 4-6 / 7-10 são reproduzidas do legado. Há discrepância documental com o formulário SBGG disponível no projeto, que apresenta <3 / 4-6 / >6. Requer decisão clínica antes de declarar um único corte como padrão institucional.",
  },
  zarit_reduzida: {
    scaleId: "zarit_reduzida",
    status: "needs-review",
    legacyVersion: "AGA 1.html / ESCALAS 1.0",
    primaryReference:
      "Bédard M et al. Gerontologist. 2001;41(5):652-657. PMID 11574710.",
    note:
      "O legado atribui a Bédard 2001 uma versão de 7 itens. O artigo primário descreve versões de 12 itens e 4 itens. Manter a regra de 7 itens apenas para equivalência do golden master até identificar e revisar a fonte correta da versão usada no projeto.",
  },
  charlson: {
    scaleId: "charlson",
    status: "mixed-primary-and-local",
    legacyVersion: "AGA 1.html / ESCALAS 1.0",
    primaryReference:
      "Charlson M et al. J Clin Epidemiol. 1994;47(11):1245-1251. PMID 7722560.",
    note:
      "Pesos e ajuste etário são preservados do índice combinado do legado. As classes visuais 0-2 / 3-4 / >=5 são regras de comunicação/triagem do aplicativo e não devem ser rotuladas como categorias prognósticas validadas do artigo primário.",
  },
  ves13: {
    scaleId: "ves13",
    status: "confirmed-primary",
    legacyVersion: "AGA 1.html / ESCALAS 1.0",
    primaryReference:
      "Saliba D et al. J Am Geriatr Soc. 2001;49(12):1691-1699. PMID 11844005.",
    note:
      "Estrutura baseada em idade, autopercepção de saúde, limitação física e incapacidade funcional; corte >=3 reproduz o instrumento original para identificar vulnerabilidade.",
  },
  mna_sf: {
    scaleId: "mna_sf",
    status: "confirmed-primary",
    legacyVersion: "AGA 1.html / ESCALAS 1.0",
    primaryReference:
      "Kaiser MJ et al. J Nutr Health Aging. 2009;13(9):782-788. PMID 19812868.",
    note:
      "A forma revisada possui seis itens e permite circunferência da panturrilha como substituta do IMC quando o IMC não pode ser calculado. A engine implementa explicitamente essa exclusividade.",
  },
};
