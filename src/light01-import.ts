import type { ExcelCell,ExcelSheet } from './xlsx-local.js';
import type { Unit,ServiceId, WorkStatus } from './types.js';
import {defaultServices,normalized,resolveService,type CatalogEntry} from './catalog.js';
export interface LocalImport {
  units: Unit[];
  services: {id: ServiceId;name:string;short:string;unit:string}[];
  teams: string[];
  warnings: string[];
  errors: string[];
  source: string;
  acceptedRows: number;
}
const required={UNIDADES:['bloco','pavimento','unidade'],SERVICOS:['bloco','pavimento','unidade','servico','status']};
const statuses:Record<string,WorkStatus>={pendente:'waiting',nao_iniciado:'waiting',em_execucao:'active',concluido:'done',bloqueado:'blocked'};
function string(v:ExcelCell):string{return v===null||v===undefined?'':String(v).trim();}
function rows(sheet:ExcelSheet,kind:'UNIDADES'|'SERVICOS',errors:string[]):Record<string,string>[] {
 const [header,...body]=sheet.data;
 if(!header){errors.push(`Aba ${kind} vazia.`);return [];}
 const keys=header.map(x=>string(x));
 for(const field of required[kind])if(!keys.includes(field))errors.push(`Aba ${kind}: coluna obrigatória '${field}' ausente.`);
 if(new Set(keys.filter(Boolean)).size!==keys.filter(Boolean).length)errors.push(`Aba ${kind}: nomes de colunas duplicados.`);
 if(errors.length)return [];
 return body.map((r,i)=>({line:i+2,data:Object.fromEntries(keys.map((k,j)=>[k,string(r[j])]))})).filter(x=>Object.values(x.data).some(Boolean)).map(x=>({...x.data,_linha:String(x.line)}));
}
function parseCatalog(sheet:ExcelSheet | undefined,errors:string[]):CatalogEntry[] {
 if(!sheet)return defaultServices;
 const [header,...body]=sheet.data;
 if(!header){errors.push('Aba LISTAS vazia.');return [];}
 const cols=header.map(v=>normalized(string(v)));
 for(const column of ['tipo','codigo','nome'])if(!cols.includes(column))errors.push(`LISTAS: coluna '${column}' ausente.`);
 if(errors.length)return [];
 const records:CatalogEntry[]=[];
 for(const [i,row] of body.entries()){
   const get=(k:string)=>string(row[cols.indexOf(k)]);
   if(normalized(get('tipo'))!=='servico')continue;
   const code=get('codigo'),name=get('nome'),aliases=get('aliases').split(';').map(x=>x.trim()).filter(Boolean);
   if(!code||!name){errors.push(`LISTAS linha ${i+2}: serviço sem código ou nome.`);continue;}
   if(records.some(x=>x.code===code)){errors.push(`LISTAS linha ${i+2}: código duplicado (${code}).`);continue;}
   records.push({code,name,aliases,unit:get('unidade_medida')||'un.'});
 }
 if(!records.length)errors.push('LISTAS: nenhum serviço catalogado (tipo=servico).');
 const aliasOwners=new Map<string,string>();
 for(const svc of records)for(const n of [svc.code,svc.name,...svc.aliases]){
   const alias=normalized(n),current=aliasOwners.get(alias);
   if(current&&current!==svc.code)errors.push(`LISTAS: grafia '${n}' usada por dois códigos (${current} e ${svc.code}).`);
   aliasOwners.set(alias,svc.code);
 }
 return records;
}
export function parseLight01(sheets:ExcelSheet[],source:string):LocalImport {
 const errors:string[]=[],warnings:string[]=[];
 const map=new Map(sheets.map(s=>[s.sheet.toUpperCase(),s]));
 for(const k of ['UNIDADES','SERVICOS'])if(!map.has(k))errors.push(`Aba ${k} não encontrada: apenas o contrato LIGHT-01 é importável.`);
 const result:LocalImport={units:[],services:[],teams:[],warnings,errors,source,acceptedRows:0};
 if(errors.length)return result;
 const catalog=parseCatalog(map.get('LISTAS'),errors);
 const urows=rows(map.get('UNIDADES')!,'UNIDADES',errors);
 const srows=rows(map.get('SERVICOS')!,'SERVICOS',errors);
 if(errors.length)return result;
 if(urows.length>5000||srows.length>20000){errors.push('Limite: 5.000 unidades e 20.000 serviços por importação.');return result;}
 const units=new Map<string,Unit>();
 for(const r of urows){
   const block=r.bloco.padStart(2,'0'),floor=Number(r.pavimento),unit=r.unidade;
   if(!r.bloco||!r.pavimento||!unit||!/^\d+$/.test(r.bloco)||!Number.isInteger(floor)||floor<0||floor>99){errors.push(`UNIDADES linha ${r._linha}: bloco, pavimento ou unidade inválidos.`);continue;}
   if(Object.values(r).some(x=>x==='__FORMULA__')){errors.push(`UNIDADES linha ${r._linha}: fórmulas não são permitidas.`);continue;}
   const id=`B${block}-${unit}`;
   if(units.has(id)){errors.push(`UNIDADES linha ${r._linha}: unidade duplicada (${block}/${unit}).`);continue;}
   units.set(id,{id,number:unit,block:Number(block),floor,statuses:{},teams:{},revisions:{}});
 }
 const services=new Map<string,{id:string;name:string;short:string;unit:string}>();
 const teams=new Set<string>(),occurrences=new Set<string>(),unknown=new Set<string>();
 for(const r of srows){
   if(!r.bloco||!r.pavimento||!r.unidade||!r.servico||!r.status||Object.values(r).some(x=>x==='__FORMULA__')){errors.push(`SERVICOS linha ${r._linha}: campo obrigatório vazio ou fórmula não permitida.`);continue;}
   const block=r.bloco.padStart(2,'0'),key=`B${block}-${r.unidade}`,unit=units.get(key);
   if(!unit){errors.push(`SERVICOS linha ${r._linha}: unidade '${block}/${r.unidade}' não cadastrada.`);continue;}
   if(String(unit.floor)!==String(Number(r.pavimento))){errors.push(`SERVICOS linha ${r._linha}: pavimento não corresponde ao da unidade.`);continue;}
   const status=statuses[normalized(r.status)];
   if(!status){errors.push(`SERVICOS linha ${r._linha}: status '${r.status}' inválido.`);continue;}
   const found=resolveService(r.servico,catalog);
   if(!found && map.has('LISTAS')){errors.push(`SERVICOS linha ${r._linha}: serviço '${r.servico}' não consta do catálogo LISTAS.`);continue;}
   const id=found?.code??`LEGADO-${normalized(r.servico)}`;
   if(!found)unknown.add(r.servico);
   const occurrence=`${key}|${id}`;
   if(occurrences.has(occurrence)){errors.push(`SERVICOS linha ${r._linha}: serviço duplicado na unidade (${r.servico}). Confira sinônimos.`);continue;}
   occurrences.add(occurrence);
   if(!services.has(id))services.set(id,{id,name:found?.name??r.servico,short:found?.name??r.servico,unit:found?.unit||r.unidade_medida||'un.'});
   unit.statuses[id]=status;unit.teams[id]=r.equipe||'Não atribuído';unit.revisions[id]=1;
   if(r.equipe)teams.add(r.equipe);
 }
 if(!units.size)errors.push('O arquivo não contém unidades válidas.');
 if(!services.size)errors.push('O arquivo não contém serviços válidos.');
 if(!errors.length){
   for(const unit of units.values())for(const id of services.keys()){
      if(unit.statuses[id]===undefined){unit.statuses[id]='waiting';unit.teams[id]='Não atribuído';unit.revisions[id]=1;}
   }
   if(!map.has('LISTAS'))warnings.push('Arquivo LIGHT-01 antigo: sem aba LISTAS. Códigos conhecidos foram normalizados pelo catálogo padrão.');
   if(unknown.size)warnings.push(`Serviços ainda não homologados: ${[...unknown].slice(0,8).join(', ')}. Importados como legado; valide os nomes com a obra.`);
   if(!teams.size)warnings.push('Nenhuma equipe foi atribuída; consulte o engenheiro antes de preencher.');
   warnings.push('A importação não contém histórico ou snapshots; gráficos temporais da demo não são dados da planilha.');
   result.units=[...units.values()].sort((a,b)=>a.block-b.block||a.floor-b.floor||a.number.localeCompare(b.number,'pt-BR',{numeric:true}));
   result.services=[...services.values()];result.teams=[...teams];result.acceptedRows=urows.length+srows.length;
 }
 return result;
}
