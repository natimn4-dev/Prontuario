# Controles explícitos de status dos medicamentos

## Objetivo
Conectar a fronteira HTTP já protegida ao fluxo clínico da consulta sem introduzir qualquer mudança automática de status.

## Alterações
- a consulta passa a carregar os medicamentos exclusivamente pela relação persistida do paciente vinculado à consulta;
- cada medicamento exibe nome/apresentação e status atual derivado do servidor;
- a interface oferece somente estados diferentes do atual;
- toda mudança exige seleção explícita, confirmação clínica por checkbox e ação final em “Registrar alteração”;
- consulta finalizada apresenta os controles bloqueados;
- resposta de erro do endpoint é exibida em estado acessível, sem aplicar mudança otimista;
- nenhum `patientId`, status anterior ou contexto de identidade é enviado pelo navegador.

## Segurança
A UI envia apenas `medicationId` e `newStatus` para `POST /api/consultations/[id]/medications/status`. As salvaguardas do serviço continuam sendo a fonte de verdade para paciente, consulta, coerência histórica, concorrência e autorização.

Não há inferência clínica, recomendação terapêutica, suspensão automática ou backfill histórico neste incremento.

## Testes
Foi adicionado golden master do view model de apresentação para rótulos, mudanças disponíveis, identificação inválida e IDs duplicados.
