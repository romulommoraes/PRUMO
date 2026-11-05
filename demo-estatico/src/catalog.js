export const defaultServices = [
    { code: 'SRV-CER', name: 'Cerâmica', aliases: ['Ceramica', 'Assentamento ceramico'], unit: 'm²' },
    { code: 'SRV-ELE', name: 'Elétrica', aliases: ['Eletrica', 'Instalação elétrica'], unit: 'pontos' },
    { code: 'SRV-AGF', name: 'Água fria', aliases: ['Agua fria'], unit: 'pontos' },
    { code: 'SRV-HID', name: 'Hidráulica', aliases: ['Hidraulica'], unit: 'pontos' },
    { code: 'SRV-ESG', name: 'Esgoto', aliases: ['Rede de esgoto'], unit: 'pontos' },
    { code: 'SRV-PIN', name: 'Pintura', aliases: ['Pinturas'], unit: 'm²' },
    { code: 'SRV-RAD', name: 'Radier', aliases: [], unit: 'm²' },
    { code: 'SRV-CON', name: 'Concretagem', aliases: ['Concreto'], unit: 'm³' },
    { code: 'SRV-CPT', name: 'Contrapiso', aliases: [], unit: 'm²' },
    { code: 'SRV-REJ', name: 'Rejunte', aliases: ['Rejuntamento'], unit: 'm²' },
    { code: 'SRV-IMP', name: 'Impermeabilização', aliases: ['Impermeabilizacao'], unit: 'm²' },
    { code: 'SRV-LIM', name: 'Limpeza', aliases: ['Limpeza final'], unit: 'un.' },
    { code: 'SRV-GES', name: 'Gesso', aliases: [], unit: 'm²' },
    { code: 'SRV-PLU', name: 'Poliuretano', aliases: [], unit: 'm²' }
];
export const catalogStatuses = [
    { code: 'pendente', label: 'Pendente' },
    { code: 'em_execucao', label: 'Em execução' },
    { code: 'concluido', label: 'Concluído' },
    { code: 'bloqueado', label: 'Bloqueado' }
];
export const catalogFunctions = ['Pedreiro', 'Servente', 'Eletricista', 'Encanador', 'Pintor', 'Encarregado', 'Técnico de obra'];
export const catalogUnits = ['m²', 'm³', 'm', 'un.', 'pontos', 'sacos', 'kg', 'litros'];
export const normalized = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
export function resolveService(value, services = defaultServices) {
    const key = normalized(value);
    return services.find(s => [s.code, s.name, ...s.aliases].some(v => normalized(v) === key)) ?? null;
}
