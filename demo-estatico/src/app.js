import { createJournal, createUnits, countStatuses, displayBlock, nameFromId, personas, percent, project, serviceCompletion, serviceList, snapshotWeekLabels, statusLabels, teams } from './data.js';
import { icon, prumoMark } from './icons.js';
import { readXlsxLocal } from './xlsx-local.js';
import { parseLight01 } from './light01-import.js';
import { lineChart, ringChart, stackedBar, emptyFeature } from './charts.js';
import { renderFlowPage, catalogResult } from './flow.js';
import { normalized, catalogFunctions, catalogUnits } from './catalog.js';
import { aggregate, weeklyProgress, groupByService, groupByBlock, groupByTeam } from './indicators.js';
const app = document.querySelector('#app');
if (!app)
    throw new Error('Elemento #app não encontrado');
const units = createUnits();
const state = { user: null, page: 'mapa', service: 'ceramica', statusFilter: 'all', teamFilter: 'all', selectedUnit: null, editing: false, sidebarOpen: false, chartPeriod: '30d', historicalWeek: 6, journal: createJournal(units), units, toast: null, importedFile: null };
const originalProject = { ...project };
const originalServices = serviceList.map(s => ({ ...s }));
const originalTeams = teams.map(t => ({ ...t }));
let importPreview = null;
let importBusy = false;
let importError = '';
let loginChooser = false;
let flowTab = 'visao';
let flowSelected = 'light';
const flowChecklist = new Set();
let teamTab = 'equipes';
let catalogTab = 'materiais';
let showCatalogForm = false;
let indicatorScope = 'all';
let indicatorBreakdown = 'servicos';
const mockMaterials = [
    { code: 'MAT-0001', name: 'Argamassa AC-II', category: 'Argamassas', unit: 'sacos', used: 186, planned: 240, team: 'Equipe 01' },
    { code: 'MAT-0002', name: 'Cabo de cobre 2,5 mm', category: 'Elétrica', unit: 'm', used: 920, planned: 1200, team: 'Equipe 02' },
    { code: 'MAT-0003', name: 'Tubo PVC 25 mm', category: 'Hidráulica', unit: 'm', used: 312, planned: 420, team: 'Equipe 03' },
    { code: 'MAT-0004', name: 'Tinta acrílica', category: 'Pintura', unit: 'litros', used: 148, planned: 300, team: 'Equipe 04' }
];
const defaultMaterials = mockMaterials.map(m => ({ ...m }));
let currentToastTimeout = null;
const navItems = [
    { page: 'visao', label: 'Visão geral', ico: 'grid', group: 'main' },
    { page: 'mapa', label: 'Mapa da obra', ico: 'map', group: 'main' },
    { page: 'equipes', label: 'Equipes', ico: 'users', group: 'main' },
    { page: 'materiais', label: 'Materiais', ico: 'box', group: 'main' },
    { page: 'cadastros', label: 'Cadastros', ico: 'clipboard', group: 'main' },
    { page: 'producao', label: 'Produção', ico: 'chart', group: 'main' },
    { page: 'evolucao', label: 'Indicadores & evolução', ico: 'chart', group: 'main' },
    { page: 'sync', label: 'Prumo Sync', ico: 'sync', group: 'tools' },
    { page: 'importar', label: 'Importar XLSX', ico: 'download', group: 'tools' },
    { page: 'fluxo', label: 'Fluxo PRUMO', ico: 'layers', group: 'tools' },
    { page: 'configuracoes', label: 'Configurações', ico: 'sliders', group: 'tools' }
];
const labels = { visao: 'Visão geral', mapa: 'Mapa da obra', equipes: 'Equipes', materiais: 'Materiais', cadastros: 'Cadastros', producao: 'Produção', evolucao: 'Indicadores & evolução', sync: 'Prumo Sync', importar: 'Importar XLSX', fluxo: 'Fluxo PRUMO', configuracoes: 'Configurações' };
const sOpt = () => serviceList.map(s => `<option value="${s.id}" ${state.service === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
function esc(s) { return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c)); }
const userRole = (u) => ({ master: 'Administrador', editor: 'Editor', viewer: 'Visualizador' }[u.role]);
const canEdit = () => state.user?.role === 'master' || state.user?.role === 'editor';
const isMaster = () => state.user?.role === 'master';
const initial = (name) => name.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase();
function getUnit(id) { return state.units.find(u => u.id === id); }
function getPending(unitId, service) { return state.journal.filter(e => e.unitId === unitId && e.service === service && e.status === 'pending'); }
function notify(message, kind = 'info') {
    state.toast = { message, kind };
    render();
    if (currentToastTimeout)
        clearTimeout(currentToastTimeout);
    currentToastTimeout = setTimeout(() => { state.toast = null; const t = document.querySelector('.toast'); if (t)
        t.remove(); }, 3800);
}
function renderLogin() {
    return `<main class="login-shell">
  <div class="login-art">
    <div class="login-architect-lines"></div>
    <div class="login-brand">${prumoMark(48)}<div><strong>PRUMO</strong><span>GESTÃO DE OBRAS</span></div></div>
    <div class="login-symbol"><svg viewBox="0 0 480 420" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1"><path d="M15 314 248 214l212 103M25 355l220-96 207 99M85 294V136L246 52l157 83v159M112 271V152l134-72 131 72v122M246 80v179M112 152l134 73 131-73M152 136l94 50 93-50M150 239v-46l63 30v46M276 222v-42l58-30v48M93 342v-46m306 46v-46M24 354l223 22 208-20M246 52V22"/><path d="M85 136 246 52l157 83" stroke-width="2"/><path d="M125 322 245 271l116 52" stroke-dasharray="6 6"/><circle cx="246" cy="52" r="7"/></g></svg></div>
    <div class="login-leftcopy"><span class="eyebrow eyebrow-light">GESTÃO VISUAL · SEM COMPLICAÇÃO</span><h1>Uma obra mais clara.<br/><em>Do começo ao fim.</em></h1><p>Acompanhe cada unidade, cada equipe e cada avanço. Tudo no seu lugar, com a simplicidade que o trabalho merece.</p></div>
    <div class="login-foot">PRUMO <span>·</span> VISUALIZE. ORGANIZE. EVOLUA.</div>
  </div>
  <div class="login-content">
    <div class="login-topnote"><span class="demo-dot"></span> AMBIENTE DE DEMONSTRAÇÃO <span class="version">V 0.4</span></div>
    <div class="login-formbox">
      <span class="eyebrow">BEM-VINDO AO PRUMO</span>
      <h2>A obra no seu<br/><span>melhor ângulo.</span></h2>
      <p>Entre no seu espaço de trabalho para acompanhar o empreendimento em tempo real.</p>
      ${!loginChooser ? `<button class="google-button" data-action="choose-user"><span class="google-g"><svg viewBox="0 0 24 24" width="22" height="22"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.22-.2-1.76H12v3.33h5.52a4.72 4.72 0 0 1-2.05 3.1v2.58h3.3c1.94-1.79 2.83-4.42 2.83-7.25Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.45l-3.3-2.57c-.9.61-2.04.98-3.31.98-2.54 0-4.69-1.72-5.46-4.03H3.15v2.65A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.54 13.93a6.04 6.04 0 0 1 0-3.86V7.42H3.15a10 10 0 0 0 0 9.16l3.39-2.65Z"/><path fill="#EA4335" d="M12 6.04c1.47 0 2.78.51 3.81 1.49l2.94-2.94A9.54 9.54 0 0 0 12 2a10 10 0 0 0-8.85 5.42l3.39 2.65C7.31 7.76 9.46 6.04 12 6.04Z"/></svg></span>Continuar com Google ${icon('arrow', 19)}</button>
      <div class="login-separator"><span></span>ou<span></span></div><button class="login-help" data-action="choose-user">Explorar demonstração ${icon('arrow', 15)}</button>` :
        `<div class="profile-picker"><div class="picker-title">${icon('users', 18)} Escolha uma conta de demonstração</div><p>Sem autenticação real. Escolha uma identidade para testar as permissões.</p><div class="profiles">${personas.map(u => `<button data-action="sign-in" data-id="${u.id}" class="profile-option"><span class="small-avatar ${u.role}">${u.initials}</span><span class="profile-copy"><strong>${u.name}</strong><small>${userRole(u)}${u.role === 'editor' ? ' · ' + u.team : ''}</small></span>${icon('chevron', 17)}</button>`).join('')}</div><button class="text-button" data-action="cancel-choose">Voltar</button></div>`}
      <div class="login-assurance">${icon('shield', 18)} <span>Protótipo offline. Nenhuma conta ou dado Google será acessado.</span></div>
    </div>
    <div class="login-bottom">Prumo Free · Interface demonstrativa · Dados fictícios</div>
  </div></main>`;
}
function navLink(item) {
    const pending = item.page === 'sync' ? state.journal.filter(e => e.status === 'pending').length : 0;
    return `<a class="nav-link ${state.page === item.page ? 'active' : ''}" href="#${item.page}" data-nav="${item.page}">${icon(item.ico, 19)}<span>${item.label}</span>${pending && item.page === 'sync' ? `<span class="nav-count">${pending}</span>` : ''}</a>`;
}
function sidebar() {
    return `<aside class="sidebar ${state.sidebarOpen ? 'is-open' : ''}">
    <div class="sidebar-brand">${prumoMark(42)}<div class="brand-copy"><strong>PRUMO</strong><span>GESTÃO DE OBRAS</span></div><button class="mobile-close" data-action="toggle-sidebar" aria-label="Fechar menu">${icon('x', 18)}</button></div>
    <div class="sidebar-scroll" tabindex="0" aria-label="Menu lateral rolável">
      <div class="workspace"><span class="sidebar-caption">ESPAÇO DE TRABALHO</span><div class="workspace-choice"><span class="workspace-avatar">A</span><div><strong>${esc(project.company)}</strong><small>${esc(project.name)}</small></div>${icon('down', 14)}</div></div>
      <nav aria-label="Navegação principal"><div class="nav-zone"><span class="sidebar-caption nav-caption">NAVEGAÇÃO</span>${navItems.filter(n => n.group === 'main').map(navLink).join('')}</div>
      <div class="nav-zone nav-tools"><span class="sidebar-caption nav-caption">FERRAMENTAS</span>${navItems.filter(n => n.group === 'tools').map(navLink).join('')}</div></nav>
    </div>
    <div class="sidebar-bottom"><div class="sidebar-help">${icon('sparkle', 16)}<span>O essencial, bem feito.</span></div><span class="side-version">PRUMO FREE · V0.4 PREVIEW</span></div>
  </aside>`;
}
function navbar() {
    const u = state.user;
    return `<header class="topbar"><div class="topbar-left"><button class="mobile-menu" aria-label="Abrir menu" data-action="toggle-sidebar">${icon('menu', 23)}</button><span class="topbar-path">Espaço de trabalho</span>${icon('chevron', 14, 'path-chevron')}<span class="topbar-here">${labels[state.page]}</span></div>
    <div class="topbar-right"><span class="topbar-date">${icon('calendar', 15)} 31 OUT 2026</span><div class="topbar-divider"></div><span class="simulation-pill"><span class="demo-dot"></span> Demo</span><button class="topbar-icon" aria-label="Notificações demonstrativas" data-action="notify">${icon('bell', 19)}<i></i></button><div class="user-top"><span class="user-avatar ${u.role}">${u.initials}</span><div class="user-label"><strong>${u.name}</strong><small>${userRole(u)}</small></div><button class="logoff" data-action="logout" title="Sair">${icon('logout', 17)}</button></div></div>
  </header>`;
}
function pageHeader(eyebrow, title, subtitle, actions = '') {
    return `<div class="page-header"><div><div class="eyebrow page-eyebrow">${eyebrow}</div><h1>${title}</h1><p>${subtitle}</p></div>${actions ? `<div class="header-actions">${actions}</div>` : ''}</div>`;
}
function statCard(label, value, foot, ico, variant = 'neutral') {
    return `<div class="metric-card"><div class="metric-head"><span>${label}</span><span class="metric-icon ${variant}">${icon(ico, 18)}</span></div><strong>${value}</strong><div class="metric-foot">${foot}</div></div>`;
}
function overviewPage() {
    const done = state.units.filter(u => u.statuses[state.service] === 'done').length;
    const statuses = countStatuses(state.units, state.service);
    const recent = state.journal.slice(0, 3);
    const metric = serviceCompletion(state.units, state.service);
    const blocks = new Set(state.units.map(u => u.block)).size;
    const floors = new Set(state.units.map(u => u.floor)).size;
    const svcLabel = serviceList.find(s => s.id === state.service)?.name ?? 'Serviço';
    const fullProgress = weeklyProgress(state.units, serviceList, 'all');
    const count = state.chartPeriod === '7d' ? 2 : state.chartPeriod === '30d' ? 5 : 7;
    const chartValues = fullProgress.slice(-count);
    const chartLabels = snapshotWeekLabels.slice(-count);
    return `${pageHeader('VISÃO OPERACIONAL', 'Bom trabalho, ' + esc(state.user.name.split(' ')[0]) + '.', 'Veja o que está acontecendo na obra e acompanhe cada avanço.', `<a href="#mapa" class="button primary">${icon('map', 17)} Explorar mapa ${icon('arrow', 16)}</a>`)}
  <div class="hero-insight"><div class="hero-insight-left"><div class="hero-tag">${icon('sparkle', 15)} PANORAMA DA OBRA</div><h2>O progresso ganha forma<br/><em>todos os dias.</em></h2><p>${esc(project.name)} · ${blocks} blocos · ${state.units.length} unidades</p><a href="#evolucao" class="hero-link">Explorar evolução ${icon('arrow', 17)}</a></div><div class="hero-insight-right"><div class="radial-glow"></div><span class="hero-big">${metric}<small>%</small></span><span>avanço do serviço selecionado</span><div class="hero-dots">${Array.from({ length: 9 }, (_, i) => `<i style="opacity:${.16 + i * .08}"></i>`).join('')}</div></div></div>
  ${state.importedFile ? `<div class="notice-inline">${icon('info', 17)} Base local: ${esc(state.importedFile)}. Mapa e avanço do serviço são reais do arquivo; gráficos de evolução continuam simulados.</div>` : ''}
  <div class="metric-grid">${statCard('Unidades no empreendimento', String(state.units.length), `${blocks} blocos · ${floors} pavimentos`, 'building')}${statCard(`${svcLabel} concluída`, String(done), `${metric}% das unidades`, 'checkcircle', 'green')}${statCard('Em execução', String(statuses.active), `Serviço: ${svcLabel}`, 'hardhat', 'blue')}${statCard('Sincronizações pendentes', String(state.journal.filter(e => e.status === 'pending').length), 'Registros aguardando merge', 'sync', 'gold')}</div>
  <div class="content-grid two-three"><section class="panel chart-panel"><div class="panel-head"><div><h3>Evolução da obra</h3><p>${state.importedFile ? 'Histórico não incluído no XLSX importado' : 'Cenário temporal simulado · serviços concluídos / registrados'}</p></div>${state.importedFile ? '' : `<div class="segmented">${['7d', '30d', '90d'].map(x => `<button data-action="chart-period" data-value="${x}" class="${state.chartPeriod === x ? 'selected' : ''}">${x === '7d' ? '7 dias' : x === '30d' ? '30 dias' : '90 dias'}</button>`).join('')}</div>`}</div>${state.importedFile ? `<div class="history-placeholder">${icon('clock', 27)}<strong>Histórico ainda não disponível</strong><span>O XLSX informa apenas a situação atual. A curva exigirá snapshots datados.</span></div>` : lineChart(chartValues, chartLabels, { id: 'overview' })}<div class="chart-legend"><span><i class="legend-dot green-dot"></i> ${state.importedFile ? 'Estado atual disponível no mapa' : 'Conclusão por ocorrência de serviço'}</span><span class="chart-note">${state.importedFile ? 'Sem histórico' : 'Simulação, sem medição ponderada'}</span></div></section><section class="panel mini-activity"><div class="panel-head"><div><h3>Atividade recente</h3><p>Atualizações dos editores</p></div><a href="#sync" class="subtle-link">Ver tudo ${icon('arrow', 14)}</a></div>${recent.map(e => `<div class="activity-item"><span class="activity-icon">${icon('edit', 16)}</span><div><strong>${nameFromId(e.author)}</strong><p>${e.unitId.replace('-', ' · apt. ')} · ${statusLabels[e.newStatus]}</p><small>${e.date}</small></div></div>`).join('')}<div class="activity-footer"><span class="status-indicator"></span> Nenhuma alteração é enviada ao Google nesta prévia.</div></section></div>
  <div class="section-title"><h3>Continue de onde parou</h3><p>Acesso rápido aos espaços mais usados</p></div><div class="quick-grid"><a class="quick-card" href="#mapa">${icon('map', 22)}<strong>Mapa da obra</strong><small>Visualize por unidade</small>${icon('arrow', 17)}</a><a class="quick-card" href="#evolucao">${icon('clock', 22)}<strong>Linha do tempo</strong><small>Compare o progresso</small>${icon('arrow', 17)}</a><a class="quick-card" href="#sync">${icon('sync', 22)}<strong>Prumo Sync</strong><small>Acompanhe alterações</small>${icon('arrow', 17)}</a></div>`;
}
function blockCard(b) {
    const members = state.units.filter(u => u.block === b);
    const relevant = members.filter(u => (state.statusFilter === 'all' || u.statuses[state.service] === state.statusFilter) && (state.teamFilter === 'all' || u.teams[state.service] === state.teamFilter));
    const done = members.filter(u => u.statuses[state.service] === 'done').length;
    const avg = percent(done, members.length);
    const floors = [...new Set(members.map(u => u.floor))].sort((a, b) => b - a);
    return `<section class="block-card"><div class="block-card-top"><strong>${displayBlock(b)}</strong><span>${members.length} unidades</span></div><div class="block-floors">${floors.map(f => `<div class="floor-row"><span class="floor-label">${f === 0 ? 'TÉR.' : f + 'º'}</span><div class="floor-units">${members.filter(u => u.floor === f).sort((a, b) => a.number.localeCompare(b.number, 'pt-BR', { numeric: true })).map(u => {
        const hidden = !relevant.some(x => x.id === u.id), pending = getPending(u.id, state.service), status = u.statuses[state.service] ?? 'waiting';
        return `<button class="unit-tile ${status} ${hidden ? 'dimmed' : ''} ${pending.length ? 'has-pending' : ''}" title="Apartamento ${esc(u.number)} · ${statusLabels[status]}${pending.length ? ' · alteração pendente' : ''}" data-action="unit" data-id="${esc(u.id)}" ${hidden ? 'tabindex="-1"' : ''}><span>${esc(u.number)}</span>${status === 'done' ? icon('check', 11) : ''}${pending.length ? '<i class="pending-dot"></i>' : ''}</button>`;
    }).join('')}</div></div>`).join('')}</div><div class="block-card-bottom"><span>${done}/${members.length} concluídas</span><div class="progress-track"><div style="width:${avg}%"></div></div><span>${avg}%</span></div></section>`;
}
function mapPage() {
    const blocks = [...new Set(state.units.map(u => u.block))].sort((a, b) => a - b);
    const status = countStatuses(state.units, state.service);
    const pct = serviceCompletion(state.units, state.service);
    return `${pageHeader('IMPLANTAÇÃO · ' + esc(project.name.toUpperCase()), 'Mapa da obra', 'Explore cada bloco, consulte o andamento e registre atualizações por unidade.', `<span class="soft-tag">${icon('map', 15)} ${blocks.length} blocos · ${state.units.length} unidades</span>`)}
  <div class="map-summary"><div class="map-summary-main"><div class="map-summary-icon">${icon('layers', 21)}</div><div><small>ANDAMENTO DO SERVIÇO</small><strong>${esc(serviceList.find(s => s.id === state.service)?.name ?? 'Serviço')}</strong></div></div><div class="map-summary-nums"><div><strong>${pct}%</strong><span>concluído</span></div><span class="map-summary-sep"></span><div><strong>${status.active}</strong><span>em execução</span></div><span class="map-summary-sep"></span><div><strong>${status.blocked}</strong><span>bloqueado</span></div></div></div>
  <div class="map-toolbar"><label class="filter-control"><span>Serviço</span><select id="service-filter" aria-label="Filtrar serviço">${sOpt()}</select></label><label class="filter-control"><span>Status</span><select id="status-filter"><option value="all">Todos os status</option>${['done', 'active', 'waiting', 'blocked'].map(k => `<option value="${k}" ${state.statusFilter === k ? 'selected' : ''}>${statusLabels[k]}</option>`).join('')}</select></label><label class="filter-control"><span>Equipe</span><select id="team-filter"><option value="all">Todas as equipes</option>${teams.map(t => `<option value="${esc(t.id)}" ${state.teamFilter === t.id ? 'selected' : ''}>${esc(t.id)}</option>`).join('')}</select></label><button class="tool-button" data-action="reset-filters" title="Limpar filtros">${icon('filter', 17)} Limpar</button></div>
  <div class="map-legend"><strong>Legenda</strong><span><i class="legend-swatch done"></i> Concluído</span><span><i class="legend-swatch active"></i> Em execução</span><span><i class="legend-swatch waiting"></i> Não iniciado</span><span><i class="legend-swatch blocked"></i> Bloqueado</span><span><i class="legend-swatch pending"></i> Alteração pendente</span><div class="map-north">${icon('arrow', 15)} N</div></div>
  <div class="blocks-grid">${blocks.map(blockCard).join('')}</div>
  <div class="courtyard"><span></span><div>${icon('sparkle', 13)} PRAÇA CENTRAL · ÁREA COMUM ${icon('sparkle', 13)}</div><span></span></div>
  <div class="map-bottom-note">${icon('info', 16)} Selecione uma unidade para consultar seus serviços. ${state.importedFile ? 'Dados estruturais carregados de arquivo local; estados conforme XLSX.' : 'Todas as informações são fictícias.'}</div>`;
}
function unitDrawer() {
    if (!state.selectedUnit)
        return '';
    const unit = getUnit(state.selectedUnit);
    if (!unit)
        return '';
    const status = unit.statuses[state.service];
    const pending = getPending(unit.id, state.service);
    const can = canEdit();
    return `<div class="drawer-overlay" data-action="close-drawer"></div><aside class="unit-drawer" role="dialog" aria-label="Detalhes do apartamento ${unit.number}" aria-modal="true"><div class="drawer-head"><div><div class="eyebrow">${displayBlock(unit.block).toUpperCase()} · ${unit.floor === 0 ? 'TÉRREO' : unit.floor + 'º ANDAR'}</div><h2>Apartamento ${unit.number}</h2></div><button class="drawer-close" data-action="close-drawer" aria-label="Fechar detalhes">${icon('x', 21)}</button></div>
  <div class="drawer-body"><div class="drawer-highlight"><div class="drawer-highlight-icon">${icon('building', 25)}</div><div><span>SERVIÇO SELECIONADO</span><strong>${esc(serviceList.find(s => s.id === state.service)?.name ?? 'Serviço')}</strong></div><span class="status-pill ${status}">${statusLabels[status]}</span></div>
  <div class="drawer-section-title">Detalhes da execução</div>
  <div class="details-list"><div><span>Equipe responsável</span><strong>${esc(unit.teams[state.service] ?? 'Não atribuído')}</strong></div><div><span>Início previsto</span><strong>05/10/2026</strong></div><div><span>Última atualização</span><strong>29/10/2026</strong></div><div><span>Revisão oficial</span><strong>#${unit.revisions[state.service]}</strong></div></div>
  <div class="drawer-section-title">Acompanhamento</div><div class="mini-progress"><div class="mini-progress-info"><span>Progresso deste serviço</span><strong>${status === 'done' ? '100%' : status === 'active' ? '55%' : '0%'}</strong></div><div class="progress-track"><div style="width:${status === 'done' ? 100 : status === 'active' ? 55 : 0}%"></div></div></div>
  ${pending.length ? `<div class="pending-notice">${icon('clock', 18)}<div><strong>${pending.length} alteração(ões) pendente(s)</strong><span>Ainda não consolidada(s) na planilha Master.</span></div></div>` : ''}
  ${can ? `<div class="drawer-section-title">Editar registro <span class="mock-label">SIMULAÇÃO</span></div>${state.editing ? `<div class="edit-form"><label>Atualizar status<select id="edit-status">${['waiting', 'active', 'blocked', 'done'].map(k => `<option value="${k}" ${status === k ? 'selected' : ''}>${statusLabels[k]}</option>`).join('')}</select></label><p>O registro será adicionado à fila demonstrativa do Prumo Sync. Nenhum dado externo será gravado.</p><div class="form-actions"><button class="button secondary" data-action="cancel-edit">Cancelar</button><button class="button primary" data-action="save-edit">${icon('check', 15)} Registrar alteração</button></div></div>` : `<button class="button primary drawer-edit" data-action="open-edit">${icon('edit', 16)} Atualizar serviço</button>`}` : `<div class="viewer-tip">${icon('lock', 17)} Seu perfil permite consulta, sem edição.</div>`}
  </div><div class="drawer-footer">${icon('shield', 15)} Informações simuladas para avaliação da interface.</div></aside>`;
}
const mockPeople = [
    { code: 'COL-001', name: 'Júlio Andrade', function: 'Pedreiro', team: 'Equipe 01', lead: 'Carlos Lima', hours: '44h', status: 'Ativo' },
    { code: 'COL-002', name: 'Helena Duarte', function: 'Azulejista', team: 'Equipe 01', lead: 'Carlos Lima', hours: '40h', status: 'Ativo' },
    { code: 'COL-003', name: 'Bruno Peixoto', function: 'Eletricista', team: 'Equipe 02', lead: 'Ana Torres', hours: '44h', status: 'Ativo' },
    { code: 'COL-004', name: 'Sofia Nascimento', function: 'Eletricista', team: 'Equipe 02', lead: 'Ana Torres', hours: '40h', status: 'Ativo' },
    { code: 'COL-005', name: 'Igor Vieira', function: 'Encanador', team: 'Equipe 03', lead: 'Rafael Costa', hours: '44h', status: 'Ativo' },
    { code: 'COL-006', name: 'Camila Barros', function: 'Pintora', team: 'Equipe 04', lead: 'Bianca Dias', hours: '40h', status: 'Ativo' },
    { code: 'COL-007', name: 'André Farias', function: 'Servente', team: 'Equipe 01', lead: 'Carlos Lima', hours: '40h', status: 'Inativo' }
];
const originalPeople = mockPeople.map(p => ({ ...p }));
function teamsPage() {
    const tabbar = `<div class="flow-tabs team-tabs" role="tablist" aria-label="Áreas de equipes">${[['equipes', 'Equipes'], ['colaboradores', 'Colaboradores'], ['alocacoes', 'Alocações']].map(([id, label]) => `<button data-action="team-tab" data-tab="${id}" role="tab" aria-selected="${teamTab === id}" class="${teamTab === id ? 'active' : ''}">${label}</button>`).join('')}</div>`;
    const notice = state.importedFile ? `<div class="notice-inline">${icon('info', 17)} A importação LIGHT-01 contém apenas unidades e serviços. Dados pessoais não são importados.</div>` : '';
    let body = '';
    if (teamTab === 'equipes') {
        body = `<div class="metric-grid three">${statCard('Equipes em campo', String(teams.length), 'Cadastradas no contexto da obra', 'users')}${statCard('Frentes de trabalho', String(new Set(state.units.map(u => u.block)).size), 'Blocos cadastrados', 'building', 'blue')}${statCard('Profissionais individuais', state.importedFile ? '—' : '7', 'Apenas amostra fictícia / não cadastrado', 'hardhat', 'green')}</div>${notice}<div class="team-grid">${teams.map(t => { const assigned = state.units.filter(u => u.teams[state.service] === t.id).length; return `<section class="team-card"><div class="team-card-head"><span class="team-symbol" style="--team-color:${t.color}">${icon('users', 22)}</span><span class="tag-quiet">EQUIPE</span></div><h3>${esc(t.name)}</h3><p>${esc(t.speciality)}</p><div class="team-separator"></div><div class="team-person"><span class="small-avatar">${initial(t.person || '?')}</span><div><strong>${esc(t.person)}</strong><small>Encarregado de referência (mock)</small></div></div><div class="team-stats"><div><strong>${state.importedFile ? '—' : mockPeople.filter(p => p.team === t.id).length}</strong><span>pessoas no exemplo</span></div><div><strong>${assigned}</strong><span>unidades vinculadas</span></div></div><button class="team-action" data-action="team-map" data-team="${esc(t.id)}">Ver no mapa ${icon('arrow', 16)}</button></section>`; }).join('')}</div>`;
    }
    else if (teamTab === 'colaboradores') {
        body = !isMaster() ? `<section class="panel team-restricted">${icon('lock', 28)}<h3>Cadastro individual restrito</h3><p>A lista de pessoas estará disponível somente para usuários autorizados. O módulo é opcional e depende de homologação com a construtora.</p><a class="button secondary" href="#fluxo" data-action="flow-open-people">Entender o contrato de pessoas ${icon('arrow', 16)}</a></section>` : state.importedFile ? `<section class="panel team-restricted">${icon('info', 27)}<h3>Nenhum cadastro pessoal importado</h3><p>O perfil LIGHT-01 não inclui colaboradores. Esse domínio deve usar <strong>PRUMO_PESSOAS_RESTRITO_v1.xlsx</strong> em arquivo separado, depois de autorização da construtora.</p></section>` : `<section class="panel"><div class="panel-head"><div><h3>Colaboradores da obra</h3><p>Exemplo fictício. Não é cadastro de RH, nem controle de ponto.</p></div><span class="soft-tag">Acesso master · simulado</span></div><div class="team-search-wrap">${icon('search', 18)}<input id="person-search" placeholder="Buscar nome, função ou equipe…" aria-label="Buscar colaboradores"/></div><div class="table-scroll"><table class="prumo-table staff-table"><thead><tr><th>Nome / código</th><th>Função</th><th>Equipe</th><th>Encarregado</th><th>Horas previstas/semana</th><th>Situação</th></tr></thead><tbody>${mockPeople.map(p => `<tr class="staff-row" data-terms="${esc((p.name + ' ' + p.code + ' ' + p.function + ' ' + p.team).toLowerCase())}"><td><strong>${esc(p.name)}</strong><small>${esc(p.code)}</small></td><td>${esc(p.function)}</td><td>${esc(p.team)}</td><td>${esc(p.lead)}</td><td>${esc(p.hours)}</td><td><span class="status-pill ${p.status === 'Ativo' ? 'done' : 'waiting'}">${esc(p.status)}</span></td></tr>`).join('')}</tbody></table></div><p class="team-footnote">Horas semanais previstas não equivalem a apontamento efetivo. Campos, visibilidade e obrigatoriedade dependem de validação com o engenheiro.</p></section>`;
    }
    else {
        body = `<section class="panel"><div class="panel-head"><div><h3>Alocações por equipe</h3><p>Referências às frentes de execução do serviço atualmente selecionado</p></div><span class="soft-tag">Visualização</span></div><div class="team-allocation-grid">${teams.map(t => `<div class="allocation-item"><strong>${esc(t.name)}</strong><small>${esc(t.speciality)}</small><span>${state.units.filter(u => u.teams[state.service] === t.id).length} unidades vinculadas</span><button class="button secondary" data-action="team-map" data-team="${esc(t.id)}">Localizar no mapa ${icon('arrow', 15)}</button></div>`).join('')}</div><div class="notice-inline">${icon('info', 17)} Datas, carga de trabalho por pessoa e vínculos individuais são definições futuras do contrato EQP-01.</div></section>`;
    }
    return `${pageHeader('PESSOAS E FRENTES', 'Equipes', 'Explore equipes, alocações e a proposta de cadastro individual.', `<button class="button secondary" data-action="mock-action">${icon('plus', 16)} Nova equipe (demo)</button>`)}${tabbar}${body}`;
}
function materialsPage() {
    if (state.importedFile)
        return `${pageHeader('MATERIAIS · CADASTRO OPCIONAL', 'Materiais', 'A importação LIGHT-01 não contém quantidades ou consumo de materiais.', `<a class="button secondary" href="#cadastros">${icon('clipboard', 16)} Abrir cadastros</a>`)}<div class="notice-inline">${icon('info', 17)} Sem dados de consumo da obra importada. O cadastro de materiais é independente e permanece apenas na memória desta demonstração.</div>`;
    return `${pageHeader('MATERIAIS · DEMONSTRAÇÃO', 'Materiais', 'Consumo ilustrativo por item, sem controle de estoque completo.', `<a class="button secondary" href="#cadastros">${icon('plus', 16)} Gerenciar cadastro</a>`)}<div class="notice-inline">${icon('info', 17)} Quantidades exclusivamente fictícias. Consumo / previsto não significa estoque disponível nem custo financeiro.</div><section class="panel table-panel"><div class="panel-head"><div><h3>Consumo demonstrativo</h3><p>Dados de exemplo sem vínculo com execução real</p></div><span class="soft-tag">Mock v0.4</span></div><div class="table-scroll"><table class="prumo-table"><thead><tr><th>Código / material</th><th>Equipe</th><th>Utilizado</th><th>Previsto</th><th>Consumo</th></tr></thead><tbody>${mockMaterials.map(x => `<tr><td><strong>${esc(x.name)}</strong><small>${esc(x.code)}</small></td><td>${esc(x.team || '—')}</td><td>${x.used} ${esc(x.unit)}</td><td>${x.planned} ${esc(x.unit)}</td><td class="bar-cell"><div class="progress-track"><div style="width:${percent(x.used, x.planned)}%"></div></div><span>${percent(x.used, x.planned)}%</span></td></tr>`).join('')}</tbody></table></div></section>`;
}
function catalogOptions(values) { return values.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join(''); }
function registryPage() {
    const tabs = [['materiais', 'Materiais'], ['servicos', 'Serviços'], ['equipes', 'Equipes'], ['colaboradores', 'Colaboradores']];
    const allowed = isMaster();
    const restricted = catalogTab === 'colaboradores' && !allowed;
    const rows = catalogTab === 'materiais' ? `<thead><tr><th>Código</th><th>Descrição</th><th>Categoria</th><th>Unidade</th></tr></thead><tbody>${mockMaterials.map(m => `<tr><td>${esc(m.code)}</td><td><strong>${esc(m.name)}</strong></td><td>${esc(m.category)}</td><td>${esc(m.unit)}</td></tr>`).join('')}</tbody>` :
        catalogTab === 'servicos' ? `<thead><tr><th>Código</th><th>Serviço</th><th>Unidade de medida</th><th>Origem</th></tr></thead><tbody>${serviceList.map(s => `<tr><td>${esc(s.id)}</td><td><strong>${esc(s.name)}</strong></td><td>${esc(s.unit)}</td><td>${state.importedFile ? 'Importação / sessão' : 'Demonstração'}</td></tr>`).join('')}</tbody>` :
            catalogTab === 'equipes' ? `<thead><tr><th>Identificador</th><th>Atividade</th><th>Encarregado</th><th>Vínculos atuais</th></tr></thead><tbody>${teams.map(t => `<tr><td><strong>${esc(t.id)}</strong></td><td>${esc(t.speciality)}</td><td>${esc(t.person)}</td><td>${state.units.filter(u => Object.values(u.teams).includes(t.id)).length}</td></tr>`).join('')}</tbody>` :
                `<thead><tr><th>Código</th><th>Nome de exibição</th><th>Função</th><th>Equipe</th><th>Jornada prevista</th></tr></thead><tbody>${mockPeople.map(p => `<tr><td>${esc(p.code)}</td><td><strong>${esc(p.name)}</strong></td><td>${esc(p.function)}</td><td>${esc(p.team)}</td><td>${esc(p.hours)}</td></tr>`).join('')}</tbody>`;
    const form = !showCatalogForm || !allowed ? '' : catalogTab === 'materiais' ? `<div class="registry-form"><h3>Novo material — exemplo local</h3><div class="registry-fields"><label><span>Descrição *</span><input id="reg-name" maxlength="80" required placeholder="Ex.: Rejunte flexível cinza"/></label><label><span>Categoria *</span><select id="reg-category">${catalogOptions(['Revestimentos', 'Elétrica', 'Hidráulica', 'Pintura', 'Argamassas', 'Outros'])}</select></label><label><span>Unidade *</span><select id="reg-unit">${catalogOptions(catalogUnits)}</select></label></div><div class="form-actions"><button class="button primary" data-action="registry-save">${icon('check', 16)} Adicionar ao mock</button><button class="button secondary" data-action="registry-cancel">Cancelar</button></div></div>` :
        catalogTab === 'servicos' ? `<div class="registry-form"><h3>Novo serviço — exemplo local</h3><div class="registry-fields"><label><span>Nome oficial *</span><input id="reg-name" maxlength="64" placeholder="Ex.: Regularização"/></label><label><span>Unidade *</span><select id="reg-unit">${catalogOptions(catalogUnits)}</select></label></div><div class="form-actions"><button class="button primary" data-action="registry-save">${icon('check', 16)} Adicionar ao catálogo</button><button class="button secondary" data-action="registry-cancel">Cancelar</button></div></div>` :
            catalogTab === 'equipes' ? `<div class="registry-form"><h3>Nova equipe — exemplo local</h3><div class="registry-fields"><label><span>Nome *</span><input id="reg-name" maxlength="60" placeholder="Ex.: Equipe 05"/></label><label><span>Atividade</span><select id="reg-category">${catalogOptions(['Revestimentos', 'Instalações elétricas', 'Instalações hidráulicas', 'Acabamentos', 'Outros'])}</select></label><label><span>Encarregado (texto de demonstração)</span><input id="reg-lead" maxlength="60" placeholder="Ex.: Responsável"/></label></div><div class="form-actions"><button class="button primary" data-action="registry-save">${icon('check', 16)} Adicionar equipe</button><button class="button secondary" data-action="registry-cancel">Cancelar</button></div></div>` :
                `<div class="registry-form"><h3>Novo colaborador — simulação restrita</h3><div class="registry-fields"><label><span>Nome de exibição *</span><input id="reg-name" maxlength="70" placeholder="Nome fictício"/></label><label><span>Função *</span><select id="reg-category">${catalogOptions(catalogFunctions)}</select></label><label><span>Equipe *</span><select id="reg-team">${teams.map(t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('')}</select></label><label><span>Jornada semanal prevista</span><select id="reg-hours">${catalogOptions(['40h', '44h', '36h', '20h'])}</select></label></div><div class="form-actions"><button class="button primary" data-action="registry-save">${icon('check', 16)} Adicionar exemplo</button><button class="button secondary" data-action="registry-cancel">Cancelar</button></div></div>`;
    return `${pageHeader('PADRONIZAÇÃO · CADASTROS', 'Cadastros', 'Organize nomes, códigos e responsáveis sem editar diretamente as planilhas.', allowed ? `<button class="button primary" data-action="registry-open">${icon('plus', 17)} Novo registro (mock)</button>` : '<span class="soft-tag">Modo consulta</span>')}
    <div class="notice-inline">${icon('info', 17)} Todos os cadastros desta tela são locais e fictícios. Não escrevem em XLSX ou Google Sheets. Serviços, materiais e equipes serão geridos por seus códigos estáveis.</div>
    <div class="flow-tabs registry-tabs" role="tablist" aria-label="Categorias de cadastro">${tabs.map(([id, name]) => `<button data-action="registry-tab" data-tab="${id}" role="tab" aria-selected="${catalogTab === id}" class="${catalogTab === id ? 'active' : ''}">${name}</button>`).join('')}</div>
    ${restricted ? `<section class="panel team-restricted">${icon('lock', 28)}<h3>Colaboradores — acesso restrito</h3><p>Dados individuais não fazem parte da consulta pública da obra. A autorização deve existir também no Google Drive.</p></section>` :
        `<section class="panel registry-panel"><div class="panel-head"><div><h3>${{ materiais: 'Catálogo de materiais', servicos: 'Tipos de serviço', equipes: 'Equipes cadastradas', colaboradores: 'Pessoas autorizadas' }[catalogTab]}</h3><p>Dados fictícios para avaliação do formulário e do contrato XLSX</p></div><span class="soft-tag">${{ materiais: mockMaterials.length, servicos: serviceList.length, equipes: teams.length, colaboradores: mockPeople.length }[catalogTab]} registros</span></div>${form}<div class="table-scroll"><table class="prumo-table registry-table">${rows}</table></div><div class="registry-tip">${icon('shield', 17)} ${catalogTab === 'colaboradores' ? 'Não utilizar CPF, salário, endereço ou dados médicos nesta demonstração.' : 'Duplicatas normalizadas são bloqueadas. Novos códigos só serão definitivos após a homologação.'}</div></section>`}`;
}
function saveRegistry() {
    if (!isMaster())
        return;
    const get = (id) => document.querySelector(`#${id}`)?.value.trim() ?? '';
    const name = get('reg-name');
    if (name.length < 2) {
        notify('Informe um nome ou descrição com pelo menos 2 caracteres.', 'warn');
        return;
    }
    if (catalogTab === 'materiais') {
        if (mockMaterials.some(m => normalized(m.name) === normalized(name))) {
            notify('Já existe um material equivalente no catálogo.', 'warn');
            return;
        }
        const next = 1 + Math.max(0, ...mockMaterials.map(m => Number(m.code.match(/MAT-(\d+)/)?.[1] ?? 0)));
        mockMaterials.push({ code: `MAT-${String(next).padStart(4, '0')}`, name, category: get('reg-category'), unit: get('reg-unit'), used: 0, planned: 0, team: '' });
    }
    else if (catalogTab === 'servicos') {
        if (serviceList.some(s => normalized(s.name) === normalized(name))) {
            notify('Esse serviço já consta do catálogo.', 'warn');
            return;
        }
        const code = 'SRV-DEMO-' + String(serviceList.length + 1).padStart(3, '0');
        serviceList.push({ id: code, name, short: name, unit: get('reg-unit') });
        state.units.forEach(u => { u.statuses[code] = 'waiting'; u.teams[code] = ''; u.revisions[code] = 0; });
    }
    else if (catalogTab === 'equipes') {
        if (teams.some(t => normalized(t.name) === normalized(name))) {
            notify('Essa equipe já consta do cadastro.', 'warn');
            return;
        }
        teams.push({ id: name, name, person: get('reg-lead') || 'Não informado', speciality: get('reg-category'), members: 0, color: '#739b85' });
    }
    else {
        if (mockPeople.some(p => normalized(p.name) === normalized(name))) {
            notify('Já existe pessoa com nome equivalente no exemplo.', 'warn');
            return;
        }
        const next = mockPeople.length + 1;
        const team = get('reg-team');
        mockPeople.push({ code: `COL-${String(next).padStart(3, '0')}`, name, function: get('reg-category'), team, lead: teams.find(t => t.id === team)?.person ?? 'Não informado', hours: get('reg-hours'), status: 'Ativo' });
    }
    showCatalogForm = false;
    notify('Registro adicionado apenas à demonstração, sem gravação externa.', 'success');
}
function productionPage() {
    const completion = serviceList.map(s => ({ name: s.name, pct: serviceCompletion(state.units, s.id) }));
    return `${pageHeader('MEDIÇÕES E AVANÇO', 'Produção', 'Indicadores essenciais para acompanhar o trabalho realizado.', `<button class="button secondary" data-action="mock-action">${icon('download', 16)} Exportar relatório</button>`)}
  ${state.importedFile ? `<div class="notice-inline">${icon('info', 17)} Indicadores de produção calculados a partir dos status da importação. Não representam medição física ponderada.</div>` : ''}<div class="metric-grid three">${statCard('Serviços monitorados', String(serviceList.length), 'Indicadores por categoria', 'layers')}${statCard('Unidades cadastradas', String(state.units.length), 'Base estrutural', 'building', 'blue')}${statCard('Equipes ativas', String(teams.length), 'Frentes de execução', 'users', 'green')}</div>
  <div class="content-grid equal"><section class="panel"><div class="panel-head"><div><h3>Execução por atividade</h3><p>Percentual de unidades concluídas</p></div></div><div class="service-list">${completion.map((x, i) => `<div class="service-progress"><div><strong>${esc(x.name)}</strong><span>${x.pct}%</span></div><div class="progress-track"><div style="width:${x.pct}%;background:${['#4c9778', '#5d8ca1', '#bc9a60', '#8d8dac'][i % 4]}"></div></div></div>`).join('')}</div></section><section class="panel"><div class="panel-head"><div><h3>Distribuição de serviços</h3><p>Serviço selecionado: ${esc(serviceList.find(s => s.id === state.service)?.name ?? 'Serviço')}</p></div><select id="service-filter" class="small-select">${sOpt()}</select></div>${(() => { const c = countStatuses(state.units, state.service); const parts = [{ name: 'Concluído', value: percent(c.done, state.units.length), color: '#5c9d7f' }, { name: 'Em execução', value: percent(c.active, state.units.length), color: '#81aabe' }, { name: 'Não iniciado', value: percent(c.waiting, state.units.length), color: '#cbd6d0' }, { name: 'Bloqueado', value: percent(c.blocked, state.units.length), color: '#d7b174' }]; return `${ringChart(serviceCompletion(state.units, state.service), '#438d70', 152)}${stackedBar(parts)}<div class="key-grid">${parts.map(p => `<span><i style="background:${p.color}"></i>${p.name} <strong>${p.value}%</strong></span>`).join('')}</div>`; })()}</section></div>`;
}
function metricRow(entry, kind) {
    const c = entry.total ? percent(entry.done, entry.total) : 0;
    const tip = kind === 'servico' ? 'Percentual de unidades com serviço concluído' : kind === 'bloco' ? 'Ocorrências de serviço concluídas / registradas' : 'Ocorrências vinculadas à equipe, não produtividade individual';
    return `<div class="indicator-row"><div class="indicator-name"><strong>${esc(entry.label)}</strong><small>${tip}</small></div><div class="indicator-rail"><div class="progress-track"><div style="width:${c}%"></div></div><span>${entry.done}/${entry.total}</span></div><strong class="indicator-value">${c}%</strong></div>`;
}
function evolutionPage() {
    if (indicatorScope !== 'all' && !serviceList.some(x => x.id === indicatorScope))
        indicatorScope = 'all';
    const scope = indicatorScope;
    const totals = aggregate(state.units, serviceList, scope);
    const current = percent(totals.done, totals.total);
    const latest = weeklyProgress(state.units, serviceList, scope);
    const week = Math.min(6, Math.max(0, state.historicalWeek));
    const currentHistory = latest[week];
    const startHistory = latest[0];
    const imported = !!state.importedFile;
    const breakdown = indicatorBreakdown === 'servicos' ? groupByService(state.units, serviceList).filter(r => scope === 'all' || r.id === scope) : indicatorBreakdown === 'blocos' ? groupByBlock(state.units, serviceList, scope) : groupByTeam(state.units, serviceList, scope);
    const parts = [{ name: 'Concluído', value: totals.done, color: '#478d6e' }, { name: 'Em execução', value: totals.active, color: '#79a5bd' }, { name: 'Não iniciado', value: totals.waiting, color: '#cbd5d0' }, { name: 'Bloqueado', value: totals.blocked, color: '#d4a46e' }];
    return `${pageHeader('DASHBOARD · ACOMPANHAMENTO', 'Indicadores & evolução', 'Enxergue a obra por serviços, blocos, equipes e períodos.', `<span class="soft-tag">${icon('info', 15)} ${imported ? 'Estado atual do XLSX' : 'Cenário demonstrativo'}</span>`)}
  <div class="indicator-filters"><label class="filter-control"><span>Escopo dos indicadores</span><select id="indicator-scope"><option value="all" ${scope === 'all' ? 'selected' : ''}>Todos os serviços</option>${serviceList.map(s => `<option value="${esc(s.id)}" ${scope === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label><span class="indicator-explain">${icon('info', 16)} Percentuais por contagem de ocorrências, sem ponderação de custo, área ou duração.</span></div>
  ${imported ? `<div class="notice-inline">${icon('info', 17)} Os indicadores atuais abaixo usam a importação <strong>${esc(state.importedFile)}</strong>. Sem snapshots datados, a linha do tempo não é exibida.</div>` : `<div class="notice-inline">${icon('info', 17)} Demonstração: a série histórica é gerada a partir dos serviços concluídos no cenário fictício. Ela ilustra a interface, não representa medições reais.</div>`}
  <div class="metric-grid">${statCard('Ocorrências concluídas', `${totals.done}/${totals.total}`, `${current}% dos registros monitorados`, 'checkcircle', 'green')}${statCard('Em execução', String(totals.active), 'Situação atual dos serviços', 'hardhat', 'blue')}${statCard('Não iniciadas', String(totals.waiting), 'Aguardando execução', 'clock')}${statCard('Bloqueadas', String(totals.blocked), 'Pendências operacionais', 'alert', 'gold')}</div>
  <div class="indicator-duo"><section class="panel indicator-hero"><div class="panel-head"><div><h3>Conclusão operacional</h3><p>Distribuição atual dos registros</p></div><span class="soft-tag">${scope === 'all' ? 'Todos os serviços' : esc(serviceList.find(s => s.id === scope)?.name ?? scope)}</span></div>${ringChart(current, '#438d70', 156)}<div class="status-summary">${parts.map(p => `<div><span><i style="background:${p.color}"></i>${p.name}</span><strong>${p.value}</strong></div>`).join('')}</div></section><section class="panel chart-panel indicator-history"><div class="panel-head"><div><h3>Trajetória semanal</h3><p>${imported ? 'Não disponível nesta importação' : 'Simulação coerente com os serviços concluídos atuais'}</p></div><span class="soft-tag">${imported ? 'Sem dados' : '19/09 a 31/10'}</span></div>${imported ? `<div class="history-placeholder">${icon('clock', 32)}<strong>Precisamos de registros datados</strong><span>Ao ativar snapshots e conciliação, essa região mostrará a evolução real.</span></div>` : `${lineChart(latest.slice(0, week + 1), snapshotWeekLabels.slice(0, week + 1), { id: 'indicator-history', height: 235 })}<label class="indicator-timeline-label" for="time-slider">Até: <strong>${snapshotWeekLabels[week]}/2026</strong> · ${currentHistory}% do cenário simulado</label><input id="time-slider" type="range" min="0" max="6" step="1" value="${week}" aria-label="Selecionar semana para visualizar evolução fictícia"/><div class="timeline-ticks">${snapshotWeekLabels.map((date, i) => `<button data-action="set-week" data-week="${i}" class="${i === week ? 'current' : ''}">${date}</button>`).join('')}</div><div class="indicator-delta">${icon('chart', 17)} ${currentHistory - startHistory >= 0 ? '+' : ''}${currentHistory - startHistory} pontos percentuais desde 19/09 (simulação)</div>`}</section></div>
  <section class="panel indicator-breakdown"><div class="panel-head"><div><h3>Onde está o avanço?</h3><p>Visualizações do mesmo conjunto de registros, por diferentes perspectivas</p></div></div><div class="flow-tabs indicator-tabs" role="tablist" aria-label="Detalhamento dos indicadores">${[['servicos', 'Por serviço'], ['blocos', 'Por bloco'], ['equipes', 'Por equipe']].map(([id, title]) => `<button data-action="indicator-tab" data-tab="${id}" role="tab" aria-selected="${indicatorBreakdown === id}" class="${indicatorBreakdown === id ? 'active' : ''}">${title}</button>`).join('')}</div><div class="indicator-list">${breakdown.length ? breakdown.map(x => metricRow(x, indicatorBreakdown === 'servicos' ? 'servico' : indicatorBreakdown === 'blocos' ? 'bloco' : 'equipe')).join('') : `<div class="history-placeholder">Sem registros relacionados a esse filtro.</div>`}</div></section>
  <div class="indicator-roadmap"><div>${icon('box', 20)}<span><strong>Materiais</strong><small>Consumo demonstrativo na aba Materiais. Histórico de consumo exige movimentos datados.</small></span></div><div>${icon('calendar', 20)}<span><strong>Cronograma</strong><small>Desvio de prazo exige baseline de tarefas e datas reais; previsto para versão futura.</small></span></div><div>${icon('lock', 20)}<span><strong>Custos</strong><small>Indicadores financeiros exigem permissão restrita e contrato FIN-01 homologado.</small></span></div></div>`;
}
function syncPage() {
    const visible = state.user?.role === 'editor' ? state.journal.filter(e => e.author === state.user?.id) : state.journal;
    const pending = visible.filter(e => e.status === 'pending').length;
    const conflicting = state.journal.filter((e, i, a) => e.status === 'pending' && a.some((o, j) => j !== i && o.status === 'pending' && e.unitId === o.unitId && e.service === o.service && e.newStatus !== o.newStatus));
    return `${pageHeader('CONTROLE DE VERSÕES', 'Prumo Sync', isMaster() ? 'Concilie alterações, analise conflitos e mantenha a Master consistente.' : state.user?.role === 'viewer' ? 'Acompanhe o estado demonstrativo da sincronização.' : 'Suas alterações ficam isoladas até a conciliação pelo gestor.', isMaster() ? `<button class="button primary" data-action="merge-all">${icon('sync', 17)} Conciliar sem conflito</button>` : '')}
  <div class="metric-grid three">${statCard('Pendentes', String(pending), 'Aguardando consolidação', 'clock', 'gold')}${statCard('Consolidadas', String(visible.filter(e => e.status === 'merged').length), 'Confirmadas nesta sessão', 'checkcircle', 'green')}${statCard('Conflitos potenciais', String(isMaster() ? conflicting.length : 0), 'Alterações incompatíveis', 'alert', 'blue')}</div>
  <div class="notice-inline">${icon('lock', 17)} ${isMaster() ? 'Somente o master pode executar a conciliação nesta demonstração.' : 'A planilha Master é privada; este painel exibe apenas o estado simulado.'}</div>
  <section class="panel sync-panel"><div class="panel-head"><div><h3>${isMaster() ? 'Fila de conciliação' : state.user?.role === 'editor' ? 'Minhas alterações' : 'Histórico de sincronização'}</h3><p>Eventos simulados por usuário e apartamento</p></div><span class="soft-tag">${visible.length} registros</span></div><div class="sync-list">${visible.length ? visible.map(e => `<div class="sync-row"><div class="sync-row-icon ${e.status}">${icon(e.status === 'merged' ? 'checkcircle' : e.status === 'rejected' ? 'x' : 'edit', 19)}</div><div class="sync-main"><div class="sync-title"><strong>${e.unitId.replace('-', ' · Apartamento ')}</strong><span class="event-id">${e.id}</span></div><p>${nameFromId(e.author)} · Cerâmica · ${statusLabels[e.oldStatus]} → <b>${statusLabels[e.newStatus]}</b></p><small>${e.date} · Revisão base ${e.baseRevision}</small></div><div class="sync-end"><span class="journal-pill ${e.status}">${{ pending: 'Pendente', merged: 'Conciliado', conflict: 'Conflito', rejected: 'Rejeitado' }[e.status]}</span>${isMaster() && e.status === 'pending' ? `<button class="row-action" data-action="accept-change" data-id="${e.id}" title="Simular aprovação do evento">${icon('check', 16)} Aprovar</button><button class="row-action reject" data-action="reject-change" data-id="${e.id}" title="Simular rejeição">${icon('x', 16)}</button>` : ''}</div></div>`).join('') : `<div class="empty-state">${icon('checkcircle', 32)}<h3>Nenhuma alteração na fila</h3><p>Registre uma alteração no mapa para testar o fluxo de conciliação.</p></div>`}</div></section>`;
}
function importPage() {
    const p = importPreview;
    return `${pageHeader('DADOS · CONTRATO LIGHT-01', 'Importar planilhas', 'Conecte a estrutura da obra ao mapa sem servidor e sem autenticação real.', `<span class="soft-tag">${icon('shield', 16)} Tudo processado no seu navegador</span>`)}
    <div class="notice-inline">${icon('info', 17)} Apenas UNIDADES e SERVICOS (LIGHT-01) são importáveis. A aba LISTAS do modelo v0.3 controla os nomes dos serviços; mapas visuais antigos precisam de normalização.</div><div class="import-help"><a class="button secondary" href="./modelos/PRUMO_ENTRADA_PADRAO_v0.3.xlsx" download>${icon('download', 16)} Baixar XLSX v0.3</a><a href="#fluxo" class="button secondary">${icon('layers', 16)} Entender fluxo e catálogos</a></div>
    <section class="panel import-panel"><div class="panel-head"><div><h3>1. Escolha um arquivo XLSX</h3><p>Use o modelo PRUMO_ENTRADA_PADRAO.xlsx ou um dos mapas normalizados do pacote.</p></div>${icon('download', 21)}</div>
      <label class="file-drop"><strong>Selecione uma planilha local</strong><span>Limite 15 MB · formato .xlsx · nenhuma transmissão pela internet</span><input id="xlsx-file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ${importBusy ? 'disabled' : ''}/></label>
      ${importBusy ? '<div class="import-message">Analisando arquivo local…</div>' : ''}
      ${importError ? `<div class="import-errors"><strong>Não foi possível ler o arquivo</strong><p>${esc(importError)}</p></div>` : ''}
    </section>
    ${p ? `<section class="panel import-panel"><div class="panel-head"><div><h3>2. Conferência da importação</h3><p>${esc(p.source)}</p></div><span class="soft-tag">${p.errors.length ? 'Corrija o arquivo' : 'Prévia válida'}</span></div>
      <div class="import-metrics">${statCard('Unidades', String(p.units.length), 'Cadastradas no XLSX', 'building')}${statCard('Serviços', String(p.services.length), 'Categorias identificadas', 'layers')}${statCard('Equipes', String(p.teams.length), 'Códigos referenciados', 'users')}</div>
      ${p.errors.length ? `<div class="import-errors"><strong>${p.errors.length} problema(s)</strong><ul>${p.errors.slice(0, 15).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${p.warnings.length ? `<div class="import-warnings"><strong>Avisos</strong><ul>${p.warnings.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${!p.errors.length ? `<div class="import-sample"><strong>Exemplo reconhecido</strong><p>${esc(p.units.slice(0, 4).map(u => `${displayBlock(u.block)}/${u.number}`).join(' · '))}</p></div><div class="form-actions"><button class="button primary" data-action="apply-import">${icon('check', 16)} Aplicar no mapa (somente memória)</button><button class="button secondary" data-action="reset-demo">Restaurar demonstração</button></div>` : ''}
    </section>` : ''}
    <section class="panel import-panel"><div class="panel-head"><div><h3>3. Origem e compatibilidade</h3><p>O que a importação já reconhece — e o que fica para depois.</p></div></div>
      <div class="details-list"><div><span>LIGHT-01</span><strong>UNIDADES + SERVICOS</strong></div><div><span>Formatos futuros</span><strong>ENG-01 · EQP-01 · PESSOAS_RESTRITO</strong></div><div><span>Armazenamento atual</span><strong>Memória do navegador · sem salvar</strong></div><div><span>Origem ativa</span><strong>${esc(state.importedFile ?? 'Demonstração fictícia original')}</strong></div></div>
      <div class="form-actions"><button class="button secondary" data-action="reset-demo">${icon('sync', 16)} Restaurar demo inicial</button></div>
    </section>`;
}
function settingsPage() {
    return `${pageHeader('PREFERÊNCIAS', 'Configurações', 'Revise o contexto da instalação e as permissões simuladas.')}
  <div class="content-grid equal"><section class="panel settings-panel"><div class="panel-head"><div><h3>Ambiente</h3><p>Informações da instalação de demonstração</p></div>${icon('sliders', 19)}</div><div class="details-list"><div><span>Empreendimento</span><strong>${esc(project.name)}</strong></div><div><span>Construtora</span><strong>${esc(project.company)}</strong></div><div><span>Identidade</span><strong>${state.user?.email}</strong></div><div><span>Perfil</span><strong>${state.user ? userRole(state.user) : ''}</strong></div><div><span>Modo de execução</span><strong>Mock / sem backend</strong></div><div><span>Versão</span><strong>Frontend v0.4</strong></div></div><button class="button secondary" data-action="mock-action">${icon('download', 16)} Exportar configuração (simulado)</button></section><section class="panel settings-panel"><div class="panel-head"><div><h3>Integração Google</h3><p>Prevista para uma etapa posterior</p></div>${icon('shield', 19)}</div><div class="integration-list"><div><span class="integration-icon">${icon('users', 18)}</span><div><strong>Google Identity</strong><small>Autenticação e contas</small></div><span class="integration-off">Não conectado</span></div><div><span class="integration-icon">${icon('box', 18)}</span><div><strong>Drive / Sheets</strong><small>Arquivos e permissões</small></div><span class="integration-off">Não conectado</span></div><div><span class="integration-icon">${icon('sync', 18)}</span><div><strong>Apps Script</strong><small>Conciliação e snapshots</small></div><span class="integration-off">Não conectado</span></div><div><span class="integration-icon">${icon('building', 18)}</span><div><strong>Firebase Hosting</strong><small>Publicação operacional futura</small></div><span class="integration-off">Não conectado</span></div></div>${emptyFeature('Integrações reais serão ativadas apenas após aprovação do frontend.')}</section></div>`;
}
function footer() { return `<footer class="app-footer"><span>© PRUMO · Produto independente · Protótipo 0.4</span><span>${icon('info', 14)} Dados e login inteiramente simulados</span></footer>`; }
function render() {
    if (!app)
        return;
    const sidebarScrollTop = app.querySelector('.sidebar-scroll')?.scrollTop ?? 0;
    document.body.classList.toggle('is-login', !state.user);
    if (!state.user) {
        app.innerHTML = renderLogin();
        return;
    }
    const html = { visao: overviewPage, mapa: mapPage, equipes: teamsPage, materiais: materialsPage, cadastros: registryPage, producao: productionPage, evolucao: evolutionPage, sync: syncPage, importar: importPage, fluxo: () => renderFlowPage({ tab: flowTab, selected: flowSelected, checklist: flowChecklist, importedFile: state.importedFile, userRole: state.user.role }), configuracoes: settingsPage }[state.page]();
    app.innerHTML = `<div class="app-shell">${sidebar()}<div class="main-area">${navbar()}<main class="main-content">${html}${footer()}</main></div>${state.sidebarOpen ? '<div class="mobile-sidebar-overlay" data-action="toggle-sidebar"></div>' : ''}${unitDrawer()}${state.toast ? `<div class="toast ${state.toast.kind}">${icon(state.toast.kind === 'success' ? 'checkcircle' : state.toast.kind === 'warn' ? 'alert' : 'info', 18)}${esc(state.toast.message)}</div>` : ''}</div>`;
    const menu = app.querySelector('.sidebar-scroll');
    if (menu)
        menu.scrollTop = sidebarScrollTop;
}
function navigate() {
    const hash = location.hash.replace('#', '');
    state.page = navItems.some(n => n.page === hash) ? hash : 'mapa';
    state.selectedUnit = null;
    state.editing = false;
    state.sidebarOpen = false;
    render();
    window.scrollTo({ top: 0, behavior: 'instant' });
}
function signIn(id) {
    const u = personas.find(x => x.id === id);
    if (!u)
        return;
    state.user = u;
    state.page = 'mapa';
    state.sidebarOpen = false;
    state.selectedUnit = null;
    state.editing = false;
    loginChooser = false;
    sessionStorage.setItem('prumo-preview-role', id);
    location.hash = 'mapa';
    render();
}
function approve(e) {
    const u = getUnit(e.unitId);
    if (!u)
        return;
    const sameOther = state.journal.filter(other => other.id !== e.id && other.unitId === e.unitId && other.service === e.service && other.status === 'pending' && other.newStatus !== e.newStatus);
    if (u.revisions[e.service] !== e.baseRevision || u.statuses[e.service] !== e.oldStatus || sameOther.length > 0) {
        e.status = 'conflict';
        notify('Conflito detectado: alteração exige revisão do master.', 'warn');
        return;
    }
    u.statuses[e.service] = e.newStatus;
    u.revisions[e.service]++;
    e.status = 'merged';
    notify('Evento conciliado na base de demonstração.', 'success');
}
function mergeAll() {
    let merged = 0, conflicts = 0;
    const pending = state.journal.filter(e => e.status === 'pending');
    for (const e of pending) {
        const u = getUnit(e.unitId);
        if (!u)
            continue;
        const competing = pending.some(o => o !== e && o.unitId === e.unitId && o.service === e.service && o.newStatus !== e.newStatus);
        if (competing || u.revisions[e.service] !== e.baseRevision || u.statuses[e.service] !== e.oldStatus) {
            e.status = 'conflict';
            conflicts++;
            continue;
        }
        u.statuses[e.service] = e.newStatus;
        u.revisions[e.service]++;
        e.status = 'merged';
        merged++;
    }
    notify(`${merged} evento(s) conciliado(s); ${conflicts} conflito(s) separado(s) para revisão.`, 'info');
}
function resetDemo() {
    serviceList.splice(0, serviceList.length, ...originalServices.map(s => ({ ...s })));
    teams.splice(0, teams.length, ...originalTeams.map(t => ({ ...t })));
    mockMaterials.splice(0, mockMaterials.length, ...defaultMaterials.map(m => ({ ...m })));
    mockPeople.splice(0, mockPeople.length, ...originalPeople.map(p => ({ ...p })));
    catalogTab = 'materiais';
    showCatalogForm = false;
    indicatorScope = 'all';
    indicatorBreakdown = 'servicos';
    Object.assign(project, originalProject);
    state.units = createUnits();
    state.journal = createJournal(state.units);
    state.service = 'ceramica';
    state.selectedUnit = null;
    state.statusFilter = 'all';
    state.teamFilter = 'all';
    state.importedFile = null;
    importPreview = null;
    importError = '';
    notify('Demonstração restaurada com dados fictícios.', 'success');
}
function applyImport() {
    if (!importPreview || importPreview.errors.length || !importPreview.units.length || !importPreview.services.length)
        return;
    serviceList.splice(0, serviceList.length, ...importPreview.services);
    teams.splice(0, teams.length, ...importPreview.teams.map((id, i) => ({ id, name: id, person: 'Não informado', speciality: 'Não informado', members: 0, color: ['#6d9d89', '#6f9bb1', '#c7a46a', '#927da9'][i % 4] })));
    state.units = importPreview.units;
    project.company = 'Importação local';
    project.name = importPreview.source.replace(/\.xlsx$/i, '').replaceAll('_', ' ').slice(0, 65);
    project.blockCount = new Set(state.units.map(u => u.block)).size;
    state.journal = [];
    state.service = serviceList[0].id;
    state.selectedUnit = null;
    state.statusFilter = 'all';
    state.teamFilter = 'all';
    state.importedFile = importPreview.source;
    state.page = 'mapa';
    location.hash = 'mapa';
    notify(`${state.units.length} unidades carregadas no mapa. Arquivo permanece somente no navegador.`, 'success');
}
async function localFileSelected(input) {
    const file = input.files?.[0];
    if (!file)
        return;
    importPreview = null;
    importError = '';
    importBusy = true;
    render();
    try {
        importPreview = parseLight01(await readXlsxLocal(file), file.name);
    }
    catch (error) {
        importError = error instanceof Error ? error.message : 'Erro desconhecido ao ler XLSX.';
    }
    finally {
        importBusy = false;
        render();
    }
}
function listen() {
    document.addEventListener('click', ev => {
        const target = ev.target;
        const el = target.closest('[data-action]');
        if (!el)
            return;
        const action = el.dataset.action;
        if (action === 'choose-user') {
            loginChooser = true;
            render();
        }
        else if (action === 'cancel-choose') {
            loginChooser = false;
            render();
        }
        else if (action === 'sign-in') {
            signIn(el.dataset.id ?? '');
        }
        else if (action === 'logout') {
            state.user = null;
            sessionStorage.removeItem('prumo-preview-role');
            loginChooser = false;
            state.selectedUnit = null;
            location.hash = '';
            render();
        }
        else if (action === 'toggle-sidebar') {
            state.sidebarOpen = !state.sidebarOpen;
            render();
        }
        else if (action === 'notify') {
            notify('Todas as notificações são demonstrativas.', 'info');
        }
        else if (action === 'chart-period') {
            state.chartPeriod = el.dataset.value ?? '30d';
            render();
        }
        else if (action === 'unit') {
            state.selectedUnit = el.dataset.id ?? null;
            state.editing = false;
            render();
        }
        else if (action === 'close-drawer') {
            state.selectedUnit = null;
            state.editing = false;
            render();
        }
        else if (action === 'open-edit') {
            if (canEdit()) {
                state.editing = true;
                render();
            }
        }
        else if (action === 'cancel-edit') {
            state.editing = false;
            render();
        }
        else if (action === 'save-edit') {
            const u = getUnit(state.selectedUnit ?? '');
            const select = document.querySelector('#edit-status');
            if (!u || !select || !canEdit())
                return;
            const next = select.value;
            const current = u.statuses[state.service];
            if (next === current) {
                notify('Selecione um status diferente do atual.', 'warn');
                return;
            }
            const e = { id: 'CHG-' + (1045 + state.journal.length), author: state.user.id, unitId: u.id, service: state.service, oldStatus: current, newStatus: next, baseRevision: u.revisions[state.service], date: 'Agora', status: 'pending' };
            state.journal.unshift(e);
            state.editing = false;
            notify('Alteração registrada na fila local de demonstração.', 'success');
        }
        else if (action === 'apply-import') {
            applyImport();
        }
        else if (action === 'reset-demo') {
            resetDemo();
        }
        else if (action === 'set-week') {
            state.historicalWeek = Number(el.dataset.week ?? 6);
            render();
        }
        else if (action === 'merge-all') {
            if (isMaster())
                mergeAll();
        }
        else if (action === 'accept-change') {
            if (!isMaster())
                return;
            const e = state.journal.find(e => e.id === el.dataset.id);
            if (e && e.status === 'pending')
                approve(e);
        }
        else if (action === 'reject-change') {
            if (!isMaster())
                return;
            const e = state.journal.find(e => e.id === el.dataset.id);
            if (e) {
                e.status = 'rejected';
                notify('Evento marcado como rejeitado (simulação).', 'info');
            }
        }
        else if (action === 'team-map') {
            state.teamFilter = el.dataset.team ?? 'all';
            location.hash = 'mapa';
            navigate();
        }
        else if (action === 'reset-filters') {
            state.statusFilter = 'all';
            state.teamFilter = 'all';
            render();
        }
        else if (action === 'flow-tab') {
            flowTab = el.dataset.tab ?? 'visao';
            render();
        }
        else if (action === 'flow-select') {
            flowSelected = el.dataset.id ?? 'light';
            render();
        }
        else if (action === 'flow-open-people') {
            flowTab = 'arquivos';
            flowSelected = 'pessoas';
        }
        else if (action === 'team-tab') {
            teamTab = el.dataset.tab ?? 'equipes';
            render();
        }
        else if (action === 'indicator-tab') {
            indicatorBreakdown = el.dataset.tab ?? 'servicos';
            render();
        }
        else if (action === 'registry-tab') {
            catalogTab = el.dataset.tab ?? 'materiais';
            showCatalogForm = false;
            render();
        }
        else if (action === 'registry-open') {
            if (isMaster()) {
                showCatalogForm = true;
                render();
            }
        }
        else if (action === 'registry-cancel') {
            showCatalogForm = false;
            render();
        }
        else if (action === 'registry-save') {
            saveRegistry();
        }
        else if (action === 'mock-action') {
            notify('Ação disponível visualmente; integração ainda não implementada.', 'info');
        }
    });
    document.addEventListener('change', ev => {
        const t = ev.target;
        if (t.id === 'xlsx-file') {
            void localFileSelected(t);
            return;
        }
        if (t.matches('[data-flow-check]')) {
            const id = t.dataset.flowCheck ?? '';
            if (t.checked)
                flowChecklist.add(id);
            else
                flowChecklist.delete(id);
            render();
            return;
        }
        if (t.id === 'indicator-scope') {
            indicatorScope = t.value;
            render();
        }
        if (t.id === 'service-filter') {
            state.service = t.value;
            render();
        }
        if (t.id === 'status-filter') {
            state.statusFilter = t.value;
            render();
        }
        if (t.id === 'team-filter') {
            state.teamFilter = t.value;
            render();
        }
    });
    document.addEventListener('input', ev => {
        const t = ev.target;
        if (t.id === 'time-slider') {
            state.historicalWeek = Number(t.value);
            render();
        }
        if (t.id === 'catalog-test') {
            const out = document.querySelector('#catalog-result');
            if (out)
                out.innerHTML = catalogResult(t.value);
        }
        if (t.id === 'person-search') {
            const needle = t.value.toLocaleLowerCase('pt-BR').trim();
            document.querySelectorAll('.staff-row').forEach(row => { row.hidden = !(row.dataset.terms ?? '').includes(needle); });
        }
    });
    window.addEventListener('hashchange', () => { if (state.user)
        navigate(); });
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && state.selectedUnit) {
        state.selectedUnit = null;
        state.editing = false;
        render();
    } });
}
export function startApp() {
    // Persistência exclusiva da escolha de perfil entre recargas; não representa sessão segura.
    const saved = sessionStorage.getItem('prumo-preview-role');
    if (saved) {
        state.user = personas.find(u => u.id === saved) ?? null;
    }
    const hash = location.hash.replace('#', '');
    state.page = navItems.some(n => n.page === hash) ? hash : 'mapa';
    listen();
    render();
}
