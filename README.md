# PRUMO — Frontend Vite v0.4

Demonstração SPA com TypeScript, Vite, HTML e CSS. **Não utiliza Vue ou React**, não acessa Google e não grava dados de produção.

## Executar

```bash
npm install
npm run dev
```

Para build estático: `npm run build`, conteúdo em `dist/`. Para conferir os tipos: `npm run typecheck`.

## Verificar a v0.4

1. Simular login Google e selecionar **Master**.
2. Reduzir a altura do navegador; verificar rolagem independente **dentro do menu lateral**, com marca e rodapé visíveis. Testar teclado e celular.
3. Abrir **Indicadores & evolução** e trocar serviço, período e visões por serviço, bloco e equipe. Números são a contagem simples de ocorrências concluídas/registradas; não representam avanço físico ponderado.
4. Ir a **Cadastros**, adicionar material, serviço, equipe ou colaborador fictício. Não há gravação em arquivo. Editores e visualizadores são apenas consulta; colaboradores visíveis apenas ao master simulado.
5. Abrir **Importar XLSX** e carregar o modelo local `LIGHT-01` com `UNIDADES` e `SERVICOS`. Conferir mapa/indicadores. O histórico fica **indisponível** porque a importação não inclui snapshots.

## Segurança e dados

- Dados fictícios; importação XLSX é local ao navegador, e não persistente.
- O controle de perfil é somente visual. **Não carregar informações pessoais reais de funcionários ou dados confidenciais na demonstração pública**.
- As dez entidades operacionais propostas para versões futuras não equivalem a banco SQL ou permissões reais. Colaboradores e finanças serão separados em arquivos com ACL adequada no Google Drive.
- O indicador geral é por ocorrência (unidade x serviço), **não** é avanço físico ponderado, custo, prazo ou produtividade individual. Série semanal calculada artificialmente para ilustrar a UX e sempre marcada como simulação.

## Arquivos de dados

O frontend preserva a leitura do formato `LIGHT-01`. O diretório `public/modelos/` contém o arquivo de entrada v0.3. Modelos completos por domínio estão no pacote XLSX separado da versão anterior.
