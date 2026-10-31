# PRUMO — Frontend v0.3

Protótipo de UX/UI da plataforma **Prumo — Gestão Visual de Obras**, inspirado na identidade azul-marinho e verde discutida para o produto.

## Stack

- **TypeScript** + **Vite** sem Vue ou React
- HTML/CSS próprio, responsivo, com variáveis de design
- Navegação por **hash routes**, compatível com GitHub Pages
- Gráficos SVG leves, sem dependências de runtime (ECharts pode ser adicionado na evolução)
- Dados simulados, sem conexão com Google nem backend

## Executar localmente

Requisitos: Node.js 20.19+ ou 22.12+ e npm.

```bash
npm install
npm run dev
```

Abra o endereço exibido pelo Vite (normalmente http://localhost:5173).

## Build

```bash
npm run typecheck
npm run build
npm run preview
```

O conteúdo de `dist/` é inteiramente estático. O `base: './'` do Vite e as rotas `#` permitem publicar o conteúdo em um subdiretório no GitHub Pages.

## Publicação no GitHub Pages

1. Crie um repositório, por exemplo, `Prumo`.
2. Publique os arquivos-fonte; configure um workflow do GitHub Actions para instalar dependências, executar `npm run build` e publicar `dist/` como artifact de Pages.
3. Em *Settings → Pages*, selecione *GitHub Actions* como origem.
4. Acesse `https://<usuario>.github.io/Prumo/#mapa`.

Use somente **dados mockados** nessa demonstração. Para o piloto operacional com dados reais, avaliar Firebase Hosting em conta da construtora, OAuth, Google Sheets/Drive e Apps Script de conciliação.

## O que funciona no protótipo

- Login Google **simulado**: escolha uma das 6 identidades fictícias.
- Perfis: master, 4 editores e visualizador; a UI reflete os perfis.
- Mapa de 6 blocos e 72 apartamentos, com filtros de serviço, status e equipe.
- Drawer de apartamento com detalhes e fluxo de edição **em memória**.
- `Prumo Sync` com fila de eventos simulados, aprovações e conflitos; sem escrita externa.
- Dashboard, produção, equipes, materiais, evolução com slider de snapshots e telas de configuração.
- Simulação de sessão armazenada apenas em `sessionStorage` (não representa autenticação nem segurança).

## Limitações propositais

- Nenhum login Google real, token, API, banco de dados, permissões ou persistência operacional.
- Nenhum dado da construtora deve ser tratado como protegido pelo frontend demonstrativo.
- O motor de conciliação usado na interface não implementa transações ou validação confiável; é um exemplo visual do processo.
- O relatório de produção e a série temporal são demonstrações, não medições reais.
- Botões sem operação final exibem uma mensagem informando a simulação.
- O domínio da SPA é de demonstração: dados reais jamais devem ser publicados no GitHub Pages.

## Próximos passos

- Fechar design system e validar UX com engenheiro e cinco perfis.
- Separar os componentes de página conforme necessidade, mantendo API limpa.
- Adicionar testes unitários para regras de serviço e reconciliação.
- Criar `DataProvider` abstrato e depois implementação autenticada para Google Sheets.
- Implementar Prumo Sync em Apps Script, com permissão real de arquivos e Master privada.
- Criar snapshots duráveis e backup de recuperação na conta do cliente.

**Autoria:** Rômulo Moraes. Protótipo técnico; licenciamento público ainda a definir formalmente.

O workflow `.github/workflows/pages.yml` já publica automaticamente a demonstração no GitHub Pages ao fazer push para `main`, depois de ativar *GitHub Actions* em *Settings → Pages*.

**Licença:** este pacote não concede, por si só, uma licença de código aberto. A licença de uso gratuito da futura distribuição deve ser formalizada antes da publicação comercial.

## Atualização v0.2 — importação de XLSX locais

O protótipo passou a oferecer a página **Importar XLSX**. Escolha `PRUMO_ENTRADA_PADRAO.xlsx` ou um dos dois mapas previamente normalizados do pacote, confira os registros detectados e clique em **Aplicar no mapa**. A importação ocorre inteiramente no navegador, sem upload nem Google Sheets.

O único perfil habilitado é `LIGHT-01`, com as abas `UNIDADES` e `SERVICOS`. São validados campos obrigatórios, duplicação de unidades, status, serviço duplicado por unidade, correspondência de pavimento e existência dos códigos. Importações com erro são bloqueadas. O painel e o mapa usam o estado importado; histórico e snapshots não são inventados. Ao atualizar a página, os dados importados se perdem (apenas memória).

`PRUMO_REFERENCIA_MAPA_VISUAL_NORMALIZADO.xlsx` e `PRUMO_REFERENCIA_4_MAPA_VISUAL_NORMALIZADO.xlsx` foram preparados a partir da geometria de duas abas representativas dos arquivos visuais antigos. **Todos os serviços foram marcados como `pendente`** exclusivamente como estado neutro provisório; não interpretamos cores como progresso ou responsáveis. Nenhum dado real de funcionários foi extraído.

Os demais arquivos modelo (`ENG-01`, `EQP-01`, `PESSOAS_RESTRITO`, `MAT-01`, `FIN-01`, `CRON-01`) existem como proposta de padronização para discussão, mas **a SPA não os importa nesta versão**. A leitura de XLSX usa ZIP/Office Open XML no navegador (sem bibliotecas de framework); não aceita XLS, macros, fórmulas em campos de dados nem layouts visuais legados diretamente. O navegador precisa suportar `DecompressionStream('deflate-raw')`.


## Atualização v0.3 — Fluxo PRUMO e catálogos

**Nova página `#fluxo`:** fluxograma explorável do caminho XLSX local → validação e catálogo → futura base Google Sheets → Prumo Sync → mapa, evolução e indicadores. O usuário seleciona arquivos para ver dados, abas, responsáveis, local de armazenamento futuro, acesso e obrigatoriedade. Guias independentes: Visão do fluxo, Arquivos, Catálogos, Contratos e Checklist. O checklist é **manual e em memória**, sem afirmar homologação real.

**Equipes:** abas Equipes, Colaboradores e Alocações. A lista individual de funcionários é **fictícia**, exibida apenas no perfil Master simulado enquanto a demo está ativa. Ao importar um XLSX LIGHT-01, o Prumo indica que **não há informações de colaboradores importadas**, e não inventa dados. Na integração real, pessoas deverão residir em arquivo separado com permissões próprias; nenhuma ocultação de tela substitui segurança de acesso.

**Dados controlados:** `src/catalog.ts` contém catálogo demonstrativo, aliases e códigos canônicos (`SRV-CER`, `SRV-ELE`, ...). O importador aceita a aba opcional `LISTAS` com colunas `tipo`, `codigo`, `nome`, `aliases` e `unidade_medida`. Quando presente, serviços não reconhecidos geram **erro bloqueante**, inclusive variantes duplicadas na mesma unidade. Quando ausente, arquivos LIGHT-01 v0.1/v0.2 permanecem aceitos; nomes desconhecidos são importados como legados com **aviso** para homologação posterior. `Hidráulica` não é automaticamente igual a `Água fria`.

**Arquivo para baixar na SPA:** `public/modelos/PRUMO_ENTRADA_PADRAO_v0.3.xlsx` contém `UNIDADES` e `SERVICOS` com o mesmo formato LIGHT-01, mais aba `LISTAS` e validações de seleção para serviços, status, equipes e unidades de medida. A SPA pode carregar esse XLSX via navegador e exibir os dados da obra. Outras planilhas por domínio existem no pacote separado de modelos, como propostas ainda não homologadas.

**Como experimentar:** `npm install && npm run dev` → perfil Master → **Fluxo PRUMO** → selecione arquivos e experimente Catálogos/Checklist → **Importar XLSX** → baixe e reimporte a planilha. A navegação usa hash e funciona com base relativa no GitHub Pages.

**Importantíssimo:** o fluxo Google Sheets / Apps Script / conciliação é apenas **planejado e ilustrado**. Não há conexão Google real nem persistência de dados; checklist, login, alocações e cadastros pessoais são simulados. Não publique planilhas reais de empregados, custos ou dados internos em páginas públicas.

**Verificação:** checagem de tipos `tsc --noEmit` aprovada. Foram testadas as regras de importação com quatro conjuntos de dados XLSX (v0.3, LIGHT-01 anterior e dois mapas normalizados: 72, 72, 268 e 144 unidades), além de duplicação por grafias equivalentes. Um teste visual automatizado em navegador não pôde ser executado no ambiente de criação; revise a interface no navegador antes da publicação.
