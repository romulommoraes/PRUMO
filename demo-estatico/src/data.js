export const project = { company: 'Alvorada Engenharia', name: 'Residencial Parque das Águas', location: 'Recife · Pernambuco', stage: 'Implantação', blockCount: 6, started: '15 de junho de 2026' };
export const personas = [
    { id: 'master', name: 'Marina Almeida', email: 'marina@exemplo.com', initials: 'MA', role: 'master', team: 'Gestão da obra' },
    { id: 'editor-1', name: 'Carlos Lima', email: 'carlos@exemplo.com', initials: 'CL', role: 'editor', team: 'Equipe 01' },
    { id: 'editor-2', name: 'Ana Torres', email: 'ana@exemplo.com', initials: 'AT', role: 'editor', team: 'Equipe 02' },
    { id: 'editor-3', name: 'Rafael Costa', email: 'rafael@exemplo.com', initials: 'RC', role: 'editor', team: 'Equipe 03' },
    { id: 'editor-4', name: 'Bianca Dias', email: 'bianca@exemplo.com', initials: 'BD', role: 'editor', team: 'Equipe 04' },
    { id: 'viewer', name: 'Lucas Ferreira', email: 'lucas@exemplo.com', initials: 'LF', role: 'viewer', team: 'Acompanhamento' }
];
export const serviceList = [
    { id: 'ceramica', name: 'Cerâmica', short: 'Cerâmica', unit: 'm²' },
    { id: 'eletrica', name: 'Elétrica', short: 'Elétrica', unit: 'pontos' },
    { id: 'hidraulica', name: 'Água fria', short: 'Água fria', unit: 'pontos' },
    { id: 'pintura', name: 'Pintura', short: 'Pintura', unit: 'm²' }
];
export const teams = [
    { id: 'Equipe 01', name: 'Equipe 01', person: 'Carlos Lima', speciality: 'Revestimentos', members: 5, color: '#6d9d89' },
    { id: 'Equipe 02', name: 'Equipe 02', person: 'Ana Torres', speciality: 'Instalações elétricas', members: 4, color: '#6f9bb1' },
    { id: 'Equipe 03', name: 'Equipe 03', person: 'Rafael Costa', speciality: 'Instalações hidráulicas', members: 4, color: '#c7a46a' },
    { id: 'Equipe 04', name: 'Equipe 04', person: 'Bianca Dias', speciality: 'Acabamentos', members: 6, color: '#927da9' }
];
const statusKinds = ['done', 'active', 'waiting', 'blocked'];
export const statusLabels = { done: 'Concluído', active: 'Em execução', waiting: 'Não iniciado', blocked: 'Bloqueado' };
export function createUnits() {
    const arr = [];
    for (let b = 1; b <= 6; b++) {
        for (let floor = 0; floor < 3; floor++) {
            for (let room = 1; room <= 4; room++) {
                const number = `${floor === 0 ? '0' : floor}${String(room).padStart(2, '0')}`;
                const statuses = {};
                const assigned = {};
                const revisions = {};
                serviceList.forEach((svc, s) => {
                    const n = (b * 17 + floor * 11 + room * 7 + s * 13) % 19;
                    const variant = s === 0 ? (n < 10 ? 'done' : n < 15 ? 'active' : n < 18 ? 'waiting' : 'blocked') : s === 1 ? (n < 8 ? 'done' : n < 14 ? 'active' : n < 18 ? 'waiting' : 'blocked') : (n < 6 ? 'done' : n < 13 ? 'active' : n < 18 ? 'waiting' : 'blocked');
                    statuses[svc.id] = variant;
                    assigned[svc.id] = `Equipe 0${((b + room + s) % 4) + 1}`;
                    revisions[svc.id] = 1 + (n % 4);
                });
                arr.push({ id: `B${String(b).padStart(2, '0')}-${number}`, number, block: b, floor, statuses, teams: assigned, revisions });
            }
        }
    }
    return arr;
}
export function createJournal(units) {
    const refs = [
        { idx: 6, author: 'editor-1', newStatus: 'done' },
        { idx: 19, author: 'editor-2', newStatus: 'active' },
        { idx: 30, author: 'editor-3', newStatus: 'blocked' },
        { idx: 6, author: 'editor-4', newStatus: 'blocked' }
    ];
    return refs.map((r, i) => ({ id: `CHG-${String(1041 + i)}`, author: r.author, unitId: units[r.idx].id, service: 'ceramica', oldStatus: units[r.idx].statuses.ceramica, newStatus: r.newStatus, baseRevision: units[r.idx].revisions.ceramica, date: ['Hoje, 08:42', 'Hoje, 09:16', 'Hoje, 10:05', 'Hoje, 10:21'][i], status: 'pending' }));
}
export const snapshotWeekLabels = ['19/09', '26/09', '03/10', '10/10', '17/10', '24/10', '31/10'];
export const progressSnapshots = [28, 34, 41, 47, 53, 60, 67];
export function percent(n, total) { return total ? Math.round(n / total * 100) : 0; }
export function countStatuses(units, s) { return statusKinds.reduce((acc, k) => ({ ...acc, [k]: units.filter(u => u.statuses[s] === k).length }), {}); }
export function serviceCompletion(units, s) { return percent(units.filter(u => u.statuses[s] === 'done').length, units.length); }
export function nameFromId(id) { return personas.find(p => p.id === id)?.name ?? 'Usuário'; }
export function displayBlock(block) { return `Bloco ${String(block).padStart(2, '0')}`; }
