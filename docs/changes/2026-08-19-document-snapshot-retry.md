# Robustez do versionamento de documentos — 2026-08-19

Prioridade: P0/Persistência.

O versionamento de `DocumentSnapshot` já executava em transação `Serializable` e repetia colisões de unicidade `P2002`. Esta alteração amplia a política de repetição para incluir também `P2034`, usado pelo Prisma para conflito de escrita ou deadlock transacional.

A repetição continua limitada a três tentativas e sempre reexecuta a transação completa. Erros não reconhecidos continuam sendo propagados imediatamente.

A classificação foi isolada em `src/domain/document-snapshot-versioning.ts` e coberta por `tests/golden-master/document-snapshot-versioning.test.ts`, com casos para `P2002`, `P2034`, outro erro Prisma e erro genérico.

Nenhuma regra clínica, escore, interpretação ou intervenção foi alterada.