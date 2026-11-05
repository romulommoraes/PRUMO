import {icon} from './icons.js';
export function lineChart(values:number[],labels:string[],opts:{height?:number;id?:string;max?:number}={}):string{
  const w=650,h=opts.height??210,pad={top:20,left:25,right:20,bottom:36},cw=w-pad.left-pad.right,ch=h-pad.top-pad.bottom;
  const max=opts.max??100;
  const points=values.map((v,i)=>({x:pad.left+i*cw/Math.max(1,values.length-1),y:pad.top+ch-(v/max)*ch,v}));
  const coords=points.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area=`M ${points[0].x} ${pad.top+ch} L ${points.map(p=>`${p.x} ${p.y}`).join(' L ')} L ${points[points.length-1].x} ${pad.top+ch} Z`;
  return `<svg class="line-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Evolução: ${values.map((v,i)=>`${labels[i]}: ${v}%`).join(', ')}" preserveAspectRatio="none">
  <defs><linearGradient id="chartfade${opts.id??'main'}" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#55a785" stop-opacity=".26"/><stop offset="100%" stop-color="#55a785" stop-opacity="0"/></linearGradient></defs>
  ${[0,25,50,75,100].map(v=>{const y=pad.top+ch-v/max*ch;return `<line x1="${pad.left}" y1="${y}" x2="${w-pad.right}" y2="${y}" stroke="#dce7e0" stroke-dasharray="3 5"/><text x="0" y="${y+3}" font-size="9" fill="#899f96">${v}</text>`;}).join('')}
  <path d="${area}" fill="url(#chartfade${opts.id??'main'})"/><polyline points="${coords}" fill="none" stroke="#3c8b6e" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
  ${points.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="4.5" fill="#f9fcf9" stroke="#3c8b6e" stroke-width="2.5"><title>${labels[i]}: ${p.v}%</title></circle><text x="${p.x}" y="${h-12}" text-anchor="middle" font-size="10" fill="#8ca198">${labels[i]}</text>`).join('')}</svg>`;
}
export function ringChart(value:number,stroke='#438d70',size=126):string {
  return `<div class="ring-wrap" style="width:${size}px;height:${size}px"><svg viewBox="0 0 120 120" role="img" aria-label="${value}% concluído"><circle cx="60" cy="60" r="50" fill="none" stroke="#e7eee8" stroke-width="10"/><circle cx="60" cy="60" r="50" fill="none" stroke="${stroke}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${value*3.14159} 314.159" transform="rotate(-90 60 60)"/></svg><div class="ring-center"><strong>${value}%</strong><span>concluído</span></div></div>`;
}
export function stackedBar(parts:{name:string;value:number;color:string}[]):string{
  return `<div class="stacked-bar" role="img" aria-label="${parts.map(p=>`${p.name}: ${p.value}`).join(', ')}">${parts.map(p=>`<span style="width:${p.value}%;background:${p.color}" title="${p.name}: ${p.value}%"></span>`).join('')}</div>`;
}
export function emptyFeature(message:string):string{
  return `<div class="coming-soon">${icon('info',22)}<span>${message}</span></div>`;
}
