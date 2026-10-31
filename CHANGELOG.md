# Changelog PRUMO

## 0.3.0 — Fluxo PRUMO e catálogos controlados

- Página `Fluxo PRUMO` no menu, com diagrama clicável, arquivos, catálogos, contratos e checklist.
- Diagrama explicativo da origem XLSX, armazenamento Google Sheets futuro, Master, editores e Prumo Sync.
- Detalhe do responsável por arquivo, acesso, localização futura e obrigatoriedade.
- Catálogo de serviços com IDs estáveis e aliases seguros; validação do XLSX com `LISTAS` opcional.
- Compatibilidade dos modelos LIGHT-01 antigos; entradas legadas fora do catálogo geram alerta.
- Abas Equipes, Colaboradores (restrita à simulação de Master) e Alocações.
- Novo modelo XLSX v0.3 com listas suspensas; download direto na página Importar.
- Interfaces e dados pessoais fictícios; nenhuma integração remota ativada.

# PRUMO frontend changelog

## v0.2 — 31/10/2026
- Nova tela **Importar XLSX**, com leitura local no navegador e prévia validada.
- Contrato **LIGHT-01** com `UNIDADES` e `SERVICOS`, incluindo status e serviços dinâmicos.
- Mapa renderizado com quantidade variável de blocos, pavimentos e unidades.
- Indicadores atuais de mapa/produção derivados da planilha importada.
- Histórico e materiais não são simulados sobre uma base local importada.
- Arquivos legados originais exigem normalização; incluídos exemplos preparados de ambos.
- Nenhum Google OAuth, Sheets, Apps Script, gravação ou sincronização nesta versão.
- Protótipo em memória, seguro para demonstração com dados não sensíveis.
- Sem Vue, React nem dependência extra para leitura de XLSX (usa APIs nativas modernas do navegador).

## v0.1
- Layout, login fictício, mapa, indicadores, equipes e conciliação simulada.
