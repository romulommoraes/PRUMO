/**
 * Métricas demonstrativas: uma ocorrência por (unidade, serviço), todas com peso 1.
 * Não calculam medição física ponderada, prazo, custo ou produtividade individual.
 * A série temporal de DEMO é reconstruída deterministicamente da situação atual.
 * Arquivos importados do perfil LIGHT-01 NÃO possuem histórico verificável.
 */
import type {ServiceId,Unit,WorkStatus} from './types.js';
type Service = {id:ServiceId;name:string};
export interface Aggregate {total:number;done:number;active:number;waiting:number;blocked:number;}
export interface MetricRow extends Aggregate {id:string;label:string;}
const empty=():Aggregate=>({total:0,done:0,active:0,waiting:0,blocked:0});
function add(out:Aggregate,status:WorkStatus){out.total++;out[({done:'done',active:'active',waiting:'waiting',blocked:'blocked'} as const)[status]]++;}
export function aggregate(units:Unit[],services:Service[],scope='all'):Aggregate{
 const out=empty();for(const u of units){for(const s of services){if(scope!=='all'&&s.id!==scope)continue;add(out,u.statuses[s.id]??'waiting');}}return out;
}
export function groupByService(units:Unit[],services:Service[]):MetricRow[]{
 return services.map(s=>{const m=aggregate(units,services,s.id);return {id:s.id,label:s.name,...m};});
}
export function groupByBlock(units:Unit[],services:Service[],scope='all'):MetricRow[]{
 return [...new Set(units.map(u=>u.block))].sort((a,b)=>a-b).map(b=>({id:String(b),label:`Bloco ${String(b).padStart(2,'0')}`,...aggregate(units.filter(u=>u.block===b),services,scope)}));
}
export function groupByTeam(units:Unit[],services:Service[],scope='all'):MetricRow[]{
 const map=new Map<string,Aggregate>();
 for(const u of units){for(const s of services){if(scope!=='all'&&s.id!==scope)continue;
   const id=u.teams[s.id]||'Sem equipe vinculada';if(!map.has(id))map.set(id,empty());add(map.get(id)!,u.statuses[s.id]??'waiting');
 }}
 return [...map].map(([id,counts])=>({id,label:id,...counts})).sort((a,b)=>b.total-a.total||a.label.localeCompare(b.label,'pt-BR'));
}
function hash(value:string):number{let h=2166136261;for(const c of value){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
/** Seven hypothetical demo snapshots; final snapshot EXACTLY equals actual current completion. */
export function weeklyProgress(units:Unit[],services:Service[],scope='all'):number[]{
 const overall=aggregate(units,services,scope);if(!overall.total)return Array(7).fill(0);
 const weekCounts=Array(7).fill(0) as number[];
 for(const u of units){for(const s of services){if(scope!=='all'&&s.id!==scope)continue;
   if(u.statuses[s.id]!=='done')continue;
   const key=hash(u.id+'|'+s.id)%100;
   const week=key<19?0:key<37?1:key<54?2:key<69?3:key<83?4:key<94?5:6;
   for(let i=week;i<7;i++)weekCounts[i]++;
 }}
 return weekCounts.map(count=>Math.round(count/overall.total*100));
}
