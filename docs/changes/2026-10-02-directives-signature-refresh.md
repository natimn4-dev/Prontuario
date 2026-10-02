# Diretivas antecipadas: prévia desatualizada e recuperação da assinatura

Base: dc58a59 (main, PR #301).

O vídeo mostra uma prévia FINALIZED pronta e o bloqueio das diretivas por ausência da seção nessa prévia. Não há tentativa de autorização no VIDaaS no vídeo. Ele não demonstra se o registro foi persistido no banco dessa consulta.

A auditoria identificou uma falha reproduzível: gerar uma prévia sem diretivas, salvar a conversa e voltar ao relatório mantém o snapshot anterior em memória. Salvar não notificava o workspace para invalidar a prévia. Agora somente o sucesso do salvamento invalida a prévia da consulta atual; falhas não a descartam. Snapshots anteriores e histórico permanecem intactos.

Quando uma prévia final não contém diretivas, o painel oferece Atualizar prévia final das diretivas e Conferir registro de diretivas. A atualização gera outro snapshot a partir dos dados persistidos, exige nova revisão e usa seu ID para a assinatura. Se não houver conversa salva elegível, os botões continuam bloqueados. Não cria informação clínica, não altera consulta finalizada, não assina automaticamente e não muda API, credenciais, fórmula clínica, SOAP, medicações ou PDF.

O E2E autenticado agora começa sem diretivas, gera a prévia, salva uma conversa pela interface/API real, verifica a invalidação, gera nova prévia e testa finalização, persistência entre etapas, revisão e envio do snapshot correto aos dois provedores em MySQL efêmero.

Validação local: 912 testes golden; typecheck completo e de domínio; segurança de repositório; componentes reais em navegador com dados sintéticos, incluindo recuperação, ausência de registro, rascunho bloqueado e revisão reiniciada. Build Next.js local usa configuração sintética sem banco; o build canônico com migrations e prestart e o E2E com persistência ficam a cargo do CI isolado. Não executa migrations nem modifica dados reais nesta rodada. A autorização pessoal e conclusão criptográfica do certificado não são automatizadas nos testes.
