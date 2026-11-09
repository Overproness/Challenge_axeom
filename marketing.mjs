import {cents,isoDate} from './engine.mjs';
// Observed contribution, not profit after overhead or acquisition ROI.
export function marketing(data,model) {
  const monthStart=model.asOf.slice(0,7)+'-01';
  const rate=Number((data.costs.find(c=>/studio time/i.test(c.item))?.cost||'').replace(/[^0-9.]/g,''));
  const rates=Object.fromEntries(data.team.filter(t=>t.pay).map(t=>[t.name,Number(t.pay.split('/')[0].replace(/[$,]/g,''))]));
  const metrics=new Map(model.entities.filter(e=>!e.payer_only).map(e=>[e.name,{client:e.name,earned_revenue:0,studio_cost:0,editing_cost:0,channel:'Unknown',incomplete:false}]));
  const hours={'Content Day':6,'Reels Pack':3,'Retainer Shoot':4,'Podcast Studio 2hr':2,'Podcast Studio 4hr':4};
  for(const b of data.bookings) {
    if(b.status.toLowerCase()!=='completed'||isoDate(b.date,'booking')>model.asOf)continue;
    const r=metrics.get(model.resolve(b.client_name,b.email));if(!r)continue;
    r.earned_revenue+=cents(b.price)/100;
    if(!Number.isFinite(rate)||rate<=0||hours[b.service]===undefined)r.incomplete=true;else r.studio_cost+=rate*hours[b.service];
  }
  for(const i of data.invoices) {if(i.status!=='void'&&/monthly retainer/i.test(i.memo)&&i.issued<monthStart){const r=metrics.get(model.resolve(i.bill_to,i.email));if(r)r.earned_revenue+=cents(i.amount)/100;}}
  for(const b of model.board) {const r=metrics.get(b.canonical);if(!r)continue;if(!Number.isFinite(rates[b.editor]))r.incomplete=true;else r.editing_cost+=Number(b.editor_hours)*rates[b.editor];}
  for(const r of metrics.values()) {
    const source=[...model.leads].filter(l=>l.canonical===r.client).sort((a,b)=>a.created.localeCompare(b.created))[0];r.channel=source?.source||'Unknown';
    for(const k of ['earned_revenue','studio_cost','editing_cost'])r[k]=Math.round(r[k]*100)/100;
    r.contribution=Math.round((r.earned_revenue-r.studio_cost-r.editing_cost)*100)/100;
  }
  const channels=new Map();for(const r of metrics.values()){if(!channels.has(r.channel))channels.set(r.channel,{channel:r.channel,clients:0,earned_revenue:0,studio_cost:0,editing_cost:0,contribution:0,incomplete:false});const c=channels.get(r.channel);c.clients++;for(const k of ['earned_revenue','studio_cost','editing_cost','contribution'])c[k]+=r[k];c.incomplete ||=r.incomplete;}
  for(const c of channels.values()){for(const k of ['earned_revenue','studio_cost','editing_cost','contribution'])c[k]=Math.round(c[k]*100)/100;c.contribution_per_client=Math.round(c.contribution/c.clients*100)/100;}
  return {clients:[...metrics.values()],channels:[...channels.values()].sort((a,b)=>b.contribution-a.contribution)};
}
