export type Role = 'master' | 'editor' | 'viewer';
export type Page = 'visao' | 'mapa' | 'equipes' | 'materiais' | 'producao' | 'evolucao' | 'sync' | 'importar' | 'fluxo' | 'configuracoes';
export type ServiceId = string;
export type WorkStatus = 'done' | 'active' | 'waiting' | 'blocked';
export type JournalStatus = 'pending' | 'merged' | 'conflict' | 'rejected';
export interface Persona { id: string; name: string; email: string; initials: string; role: Role; team: string; }
export interface Unit { id: string; number: string; block: number; floor: number; statuses: Record<ServiceId, WorkStatus>; teams: Record<ServiceId, string>; revisions: Record<ServiceId, number>; }
export interface JournalEvent { id: string; author: string; unitId: string; service: ServiceId; oldStatus: WorkStatus; newStatus: WorkStatus; baseRevision: number; date: string; status: JournalStatus; }
export interface Toast { message: string; kind: 'success' | 'info' | 'warn'; }
export interface AppState { user: Persona | null; page: Page; service: ServiceId; statusFilter: string; teamFilter: string; selectedUnit: string | null; editing: boolean; sidebarOpen: boolean; chartPeriod: '7d' | '30d' | '90d'; historicalWeek: number; journal: JournalEvent[]; units: Unit[]; toast: Toast | null; importedFile: string | null; }
