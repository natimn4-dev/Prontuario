# Persistência SOAP após salvamento

O PUT devolvia campos anteriores à normalização usada na gravação. Isso podia gerar um hash diferente do GET e rejeitar o salvamento seguinte como conflito. A resposta agora usa o contrato normalizado gravado.

Atualizações preservam campos omitidos e entradas de plano não enviadas. Texto vazio e listas vazias continuam permitindo limpeza explícita. O servidor conserva as condutas históricas de problemas resolvidos, mesmo quando eles já não aparecem na lista editável.

Edições posteriores ao início da gravação permanecem no rascunho e exigem novo salvamento. Não é emitido o evento de nota limpa nesse cenário, preservando o bloqueio da finalização. Respostas de carregamento antigas são ignoradas; fechamento/recarregamento avisa sobre alterações pendentes. O editor recebe uma chave de consulta para isolar seu estado.

Validação: testes de contrato/versão, suíte golden master, typecheck completo/domínio e build Next.js. O smoke autenticado de CI acrescenta gravação/releitura em MySQL, segundo salvamento, conflito real, isolamento de paciente, conservação de exames/vacinas/rastreios/conduta histórica e digitação durante resposta atrasada seguida de novo salvamento e recarga em Chromium.

Nenhuma migração, regra clínica, ponto de corte ou restauração de dados foi introduzida. A correção não recupera automaticamente conteúdo perdido antes desta versão. Build operacional completo, MySQL e navegador são gates adicionais da CI; o SHA em produção deve ser confirmado pelo smoke após merge.
