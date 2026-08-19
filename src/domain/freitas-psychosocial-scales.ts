import type { ValidatedScaleQuestion, ValidatedScaleResult } from "./freitas-validated-scales.ts";

export type PsychosocialFreitasScaleCode = "cesd_br_elderly" | "mos_sss_br_19" | "family_apgar_br_elderly" | "zarit_br_22";
type PsychosocialDimension = "humor" | "suporte_social" | "familia" | "sobrecarga_cuidador";
type PsychosocialScaleDefinition = { code: PsychosocialFreitasScaleCode; version: string; name: string; dimension: PsychosocialDimension; instruction: string; sourceNote: string; questions: readonly ValidatedScaleQuestion[] };
const c = (value: number, label: string) => ({ value, label });

const cesdFrequency = [c(0,"Raramente ou nenhuma vez (<1 dia)"),c(1,"Algumas ou poucas vezes (1–2 dias)"),c(2,"Ocasionalmente ou moderadamente (3–4 dias)"),c(3,"A maior parte ou todo o tempo (5–7 dias)")] as const;
const cesdPositiveFrequency = [c(3,"Raramente ou nenhuma vez (<1 dia)"),c(2,"Algumas ou poucas vezes (1–2 dias)"),c(1,"Ocasionalmente ou moderadamente (3–4 dias)"),c(0,"A maior parte ou todo o tempo (5–7 dias)")] as const;
const cesdItems = [
  "Sentiu-se incomodado(a) com coisas que habitualmente não incomodam?","Teve pouco apetite ou não teve vontade de comer?","Sentiu que não conseguia melhorar o estado de ânimo mesmo com ajuda de familiares e amigos?","Sentiu que tinha tanto valor quanto a maioria das pessoas?","Teve dificuldade para se concentrar no que fazia?","Sentiu-se deprimido(a)?","Sentiu que precisava fazer esforço para realizar tarefas habituais?","Sentiu-se otimista sobre o futuro?","Considerou que sua vida tinha sido um fracasso?","Sentiu-se amedrontado(a)?","Seu sono não foi repousante?","Esteve feliz?","Falou menos que o habitual?","Sentiu-se sozinho(a)?","Sentiu que as pessoas não foram amistosas?","Aproveitou a vida?","Teve crises de choro?","Sentiu-se triste?","Sentiu que as pessoas não gostavam de você?","Não conseguiu levar adiante suas coisas?",
] as const;
const cesdPositive = new Set([4,8,12,16]);
export const CESD_BR_ELDERLY: PsychosocialScaleDefinition = {
  code:"cesd_br_elderly",version:"freitas-py-cesd20-br-elderly-2026-08-v1",name:"CES-D — 20 itens",dimension:"humor",
  instruction:"Considere a frequência dos sintomas na última semana. Os itens positivos 4, 8, 12 e 16 são pontuados de forma reversa. Total 0–60.",
  sourceNote:"Freitas/Py Tabela A.13 para os 20 itens; Radloff para pontuação 0–3/reversão; Batistoni, Neri e Cupertino 2007 para validação em idosos brasileiros e corte >11 (≥12).",
  questions:cesdItems.map((label,index)=>({id:`i${index+1}`,label,choices:cesdPositive.has(index+1)?cesdPositiveFrequency:cesdFrequency})),
};

const mosChoices = [c(0,"Nunca"),c(1,"Raramente"),c(2,"Às vezes"),c(3,"Quase sempre"),c(4,"Sempre")] as const;
const mosGroups = [
  ["material",["Ajude se você ficar de cama","Leve você ao médico","Ajude nas tarefas diárias se você ficar doente","Prepare suas refeições se você não puder"]],
  ["afetivo",["Demonstre amor e afeto","Dê um abraço","Seja alguém que você ame e faça você se sentir querido(a)"]],
  ["emocional_informacional",["Ouça quando você precisar falar","Seja alguém em quem confiar para falar de você ou de seus problemas","Compartilhe suas preocupações e medos mais íntimos","Compreenda seus problemas","Dê bons conselhos em situações de crise","Dê informações para compreender uma situação","Seja alguém de quem você realmente queira conselhos","Dê sugestões de como lidar com um problema pessoal"]],
  ["interacao_positiva",["Faça coisas agradáveis com você","Ajude a distrair a cabeça","Relaxe com você","Divirta-se com você"]],
] as const;
const mosQuestions: ValidatedScaleQuestion[] = [];
let mosIndex=1;
for(const [,labels] of mosGroups){for(const label of labels){mosQuestions.push({id:`i${mosIndex++}`,label:`Com que frequência conta com alguém que ${label.toLowerCase()}?`,choices:mosChoices});}}
export const MOS_SSS_BR_19: PsychosocialScaleDefinition = {
  code:"mos_sss_br_19",version:"freitas-py-mos-sss-br19-2026-08-v1",name:"MOS-SSS — apoio social",dimension:"suporte_social",
  instruction:"Responda aos 19 itens de disponibilidade percebida de apoio. Cada item varia de 0 (nunca) a 4 (sempre). O servidor apresenta escore total e domínios em 0–100; maior escore indica maior apoio percebido.",
  sourceNote:"Freitas/Py Tabela A.15 para os 19 itens/domínios; adaptação brasileira de Griep e normatização posterior para respostas 0–4 sem inversão. Não há ponto de corte universal brasileiro.",questions:mosQuestions,
};

const apgarChoices=[c(0,"Nunca"),c(1,"Algumas vezes"),c(2,"Sempre")] as const;
export const FAMILY_APGAR_BR_ELDERLY: PsychosocialScaleDefinition = {
  code:"family_apgar_br_elderly",version:"freitas-py-family-apgar-br-elderly-2026-08-v1",name:"APGAR familiar",dimension:"familia",
  instruction:"Avalia satisfação percebida com cinco dimensões do funcionamento familiar. Cada item recebe 0, 1 ou 2; total 0–10.",
  sourceNote:"Freitas/Py Tabela A.16 para os cinco itens; validação em idosos do Nordeste brasileiro para respostas nunca=0, algumas vezes=1, sempre=2 e faixas 0–4, 5–6 e 7–10.",
  questions:[
    {id:"adaptation",label:"Estou satisfeito(a) pois posso recorrer à minha família em busca de ajuda quando algo me incomoda ou preocupa",choices:apgarChoices},
    {id:"partnership",label:"Estou satisfeito(a) com a maneira pela qual minha família e eu conversamos e compartilhamos problemas",choices:apgarChoices},
    {id:"growth",label:"Estou satisfeito(a) com a maneira como minha família aceita e apoia meus desejos de iniciar novas atividades ou caminhos",choices:apgarChoices},
    {id:"affection",label:"Estou satisfeito(a) com a maneira pela qual minha família demonstra afeição e reage às minhas emoções",choices:apgarChoices},
    {id:"resolve",label:"Estou satisfeito(a) com a maneira pela qual minha família e eu compartilhamos o tempo juntos",choices:apgarChoices},
  ],
};

const zaritFrequency=[c(0,"Nunca"),c(1,"Raramente"),c(2,"Algumas vezes"),c(3,"Frequentemente"),c(4,"Sempre ou quase sempre")] as const;
const zaritGlobal=[c(0,"Nem um pouco"),c(1,"Um pouco"),c(2,"Moderadamente"),c(3,"Muito"),c(4,"Extremamente")] as const;
const zaritItems=[
  "A pessoa cuidada pede mais ajuda do que necessita?","Por causa do tempo gasto com o cuidado, você não tem tempo suficiente para si?","Você se sente estressado(a) entre cuidar e cumprir outras responsabilidades familiares ou de trabalho?","Você se sente envergonhado(a) com o comportamento da pessoa cuidada?","Você se sente irritado(a) quando a pessoa cuidada está por perto?","O cuidado afeta negativamente seus relacionamentos com familiares ou amigos?","Você sente receio pelo futuro da pessoa cuidada?","Você sente que a pessoa cuidada depende de você?","Você se sente tenso(a) quando a pessoa cuidada está por perto?","Você sente que sua saúde foi afetada pelo envolvimento com o cuidado?","Você sente que perdeu privacidade por causa do cuidado?","Você sente que sua vida social foi prejudicada porque está cuidando?","Você não se sente à vontade para receber visitas em casa por causa da pessoa cuidada?","Você sente que a pessoa cuidada espera que você seja a única pessoa de quem ela pode depender?","Você sente que não tem dinheiro suficiente para cuidar da pessoa e manter suas outras despesas?","Você se sente incapaz de cuidar da pessoa por muito mais tempo?","Você sente que perdeu o controle de sua vida desde a doença da pessoa cuidada?","Você gostaria de deixar que outra pessoa cuidasse?","Você se sente em dúvida sobre o que fazer pela pessoa cuidada?","Você sente que poderia estar fazendo mais?","Você sente que poderia cuidar melhor?","De maneira geral, quanto você se sente sobrecarregado(a) por cuidar?",
] as const;
export const ZARIT_BR_22: PsychosocialScaleDefinition = {
  code:"zarit_br_22",version:"freitas-py-zarit-br22-scazufca-2026-08-v1",name:"Zarit Burden Interview — 22 itens",dimension:"sobrecarga_cuidador",
  instruction:"Aplicar ao cuidador principal. Itens 1–21 usam frequência de 0 a 4; o item 22 usa intensidade de sobrecarga de 0 a 4. Total 0–88. Maior total indica maior sobrecarga percebida.",
  sourceNote:"Freitas/Py Tabela A.17 para os 22 itens; Scazufca 2002 resolve a redação validada do item 16 (incapaz de cuidar por muito mais tempo) e a escala específica do item 22. A validação brasileira não é usada aqui para inventar faixas categóricas de gravidade.",
  questions:zaritItems.map((label,index)=>({id:`i${index+1}`,label,choices:index===21?zaritGlobal:zaritFrequency})),
};

export const PSYCHOSOCIAL_FREITAS_SCALES=[CESD_BR_ELDERLY,MOS_SSS_BR_19,FAMILY_APGAR_BR_ELDERLY,ZARIT_BR_22] as const;

function strict(definition:PsychosocialScaleDefinition,raw:Record<string,unknown>):Record<string,number>{
  const allowed=new Set(definition.questions.map(q=>q.id)); if(Object.keys(raw).some(key=>!allowed.has(key))) throw new Error(`Resposta não permitida para ${definition.code}.`);
  const out:Record<string,number>={}; for(const q of definition.questions){const v=raw[q.id];if(typeof v!=="number"||!Number.isFinite(v)||!q.choices?.some(option=>option.value===v)) throw new Error(`Resposta obrigatória inválida: ${q.id}.`);out[q.id]=v;} return out;
}
const sum=(a:Record<string,number>,ids?:string[])=>(ids??Object.keys(a)).reduce((s,id)=>s+a[id],0);
const pct=(value:number,max:number)=>Math.round((value/max)*1000)/10;

export function scorePsychosocialFreitasScale(code:PsychosocialFreitasScaleCode,raw:Record<string,unknown>):{answers:Record<string,number>;result:ValidatedScaleResult;version:string}{
  const definition=PSYCHOSOCIAL_FREITAS_SCALES.find(item=>item.code===code); if(!definition) throw new Error("Escala psicossocial validada não disponível."); const answers=strict(definition,raw);
  if(code==="cesd_br_elderly"){const score=sum(answers);const positive=score>=12;return{answers,version:definition.version,result:{score,scoreText:`${score}/60`,classification:positive?"Rastreio positivo para sintomas depressivos":"Rastreio não positivo pelo corte brasileiro adotado",interpretation:positive?"CES-D ≥12 na validação com idosos brasileiros indica necessidade de avaliação clínica de sintomas depressivos. O resultado não estabelece diagnóstico de depressão.":"Resultado abaixo do corte de rastreio adotado; sintomas clinicamente relevantes ainda devem ser avaliados quando presentes."}};}
  if(code==="mos_sss_br_19"){const material=sum(answers,["i1","i2","i3","i4"]),afetivo=sum(answers,["i5","i6","i7"]),emocional=sum(answers,["i8","i9","i10","i11","i12","i13","i14","i15"]),interacao=sum(answers,["i16","i17","i18","i19"]),rawTotal=sum(answers),score=pct(rawTotal,76);return{answers,version:definition.version,result:{score,scoreText:`${score.toFixed(1)}/100`,classification:"Apoio social percebido registrado",interpretation:`Material ${pct(material,16).toFixed(1)}/100; afetivo ${pct(afetivo,12).toFixed(1)}/100; emocional/informacional ${pct(emocional,32).toFixed(1)}/100; interação social positiva ${pct(interacao,16).toFixed(1)}/100. Maior escore indica maior apoio percebido; não há cutoff universal brasileiro adotado.`}};}
  if(code==="family_apgar_br_elderly"){const score=sum(answers);const classification=score>=7?"Boa funcionalidade familiar percebida":score>=5?"Moderada disfunção familiar percebida":"Elevada disfunção familiar percebida";return{answers,version:definition.version,result:{score,scoreText:`${score}/10`,classification,interpretation:"Classificação baseada na validação brasileira em idosos (0–4 elevada disfunção; 5–6 moderada; 7–10 boa funcionalidade). O APGAR é rastreio de satisfação/funcionamento percebido e deve ser integrado à avaliação familiar."}};}
  const score=sum(answers);return{answers,version:definition.version,result:{score,scoreText:`${score}/88`,classification:"Escore de sobrecarga do cuidador registrado",interpretation:"Maior escore indica maior sobrecarga percebida pelo cuidador. A versão brasileira de 22 itens é mantida sem faixas automáticas de gravidade neste protocolo; interpretar contexto, rede de apoio e impacto sobre saúde/vida do cuidador."}};
}
