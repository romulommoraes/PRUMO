# PRUMO — Changelog

## v0.4 — 31/10/2026

- Sidebar com rolagem vertical independente, barra visível, suporte a teclado e altura responsiva; cabeçalho/rodapé fixos. O scroll da navegação é preservado entre re-renderizações.
- Página **Indicadores & evolução** reformulada: indicadores atuais por serviço, bloco e equipe; distribuição de estados e seleção interativa de período e serviço.
- Série histórica *simulada* consistente com os registros atuais: ponto final corresponde exatamente ao percentual de ocorrências concluídas na sessão. Não é medição ponderada, nem dado real.
- Quando o usuário importa XLSX LIGHT-01, curva histórica é suprimida (sem snapshots); demais métricas partem da importação.
- Nova página **Cadastros**: serviços, materiais, equipes e colaboradores; criação apenas em memória pelo Master de demonstração, com prevenção básica de nomes duplicados. Colaboradores restritos.
- Página Materiais usa catálogo mock compartilhado com Cadastros.
- Preservados importador XLSX, Fluxo PRUMO, Equipes, Mapas e conciliação fictícia da v0.3.

### Fora do escopo
- Autenticação real, persistência, edição bidirecional de XLSX, sincronização Google, histórico real, custos, cronograma, estoque ou produtividade individual.
