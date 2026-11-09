/** Reconciliation over raw CSV rows. All arithmetic uses integer cents.
 * resolve(name,email) returns canonical recipient/payer name. For bookings the
 * resolver must prefer the service recipient name over a third-party payer email.
 */
export function reconcile(data, resolve, asOf = '2026-10-06') {
  const issues = [], day = 86400000;
  const cents = v => {const n=Number(String(v??'').replace(/[$,\s]/g,'')); return Number.isFinite(n)?Math.round(n*100):null;};
  const dollars = n => n/100;
  const iso = value => { const str=String(value);if(!/^\d{4}-\d{2}-\d{2}$/.test(str))return null;const t=Date.parse(str+'T00:00:00Z'); return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===str?t:null; };
  const slash = (v, bank=false) => {const a=String(v).split('/').map(Number); return a.length===3?iso(`${a[2]}-${String(a[bank?1:0]).padStart(2,'0')}-${String(a[bank?0:1]).padStart(2,'0')}`):null;};
  const now=iso(asOf), canon=(n,e)=>resolve(n||'',e||'')||String(n||e||'Unresolved');
  const rows=k=>Array.isArray(data[k])?data[k]:[];
  const invoices=rows('invoices').map(r=>({...r,client:canon(r.bill_to,r.email),amount_cents:cents(r.amount),balance_cents:r.status?.toLowerCase()==='void'?0:cents(r.amount),issued_time:iso(r.issued),due_time:iso(r.due),allocations:[]}));
  const payments=rows('payments').map(r=>({...r,client:canon(r.payer,r.payer_email),amount_cents:cents(r.amount),remaining_cents:cents(r.amount),date_time:slash(r.date,true),allocations:[]}));
  const bookings=rows('bookings').map(r=>({...r,client:canon(r.client_name,r.email),price_cents:cents(r.price),date_time:slash(r.date)}));
  const invoiceMap=new Map(),bookingMap=new Map();
  for (const i of invoices) {if(invoiceMap.has(i.invoice_no))issues.push({type:'duplicate_id',record:i.invoice_no});invoiceMap.set(i.invoice_no,i);i.invalid=i.amount_cents===null||i.amount_cents<0||i.issued_time===null||i.due_time===null;if(i.invalid)issues.push({type:'invalid_invoice',record:i.invoice_no});i.future=i.issued_time>now;if(i.future)issues.push({type:'future_invoice',record:i.invoice_no});}
  for (const b of bookings) {bookingMap.set(b.booking_id,b);if(b.price_cents===null||b.date_time===null)issues.push({type:'invalid_booking',record:b.booking_id});}
  const activeInvoice=i=>!i.invalid&&!i.future&&i.status?.toLowerCase()!=='void'&&i.balance_cents>0&&i.issued_time!==null;
  const alloc=(p,i,n,rule)=>{if(!(n>0))return;i.balance_cents-=n;p.remaining_cents-=n;const a={payment:p.payment_id,invoice:i.invoice_no,amount:dollars(n),rule};i.allocations.push(a);p.allocations.push(a);};
  // Reserve explicit bank references globally before allocating unnamed cash.
  for(const p of payments){
    if(p.date_time===null||p.amount_cents===null||p.amount_cents<0){p.quarantined=true;issues.push({type:'invalid_payment',record:p.payment_id});continue;}
    if(p.date_time>now){p.future=true;issues.push({type:'future_payment',record:p.payment_id});continue;}
    for(const ref of (p.reference||'').match(/INV-\d+/gi)||[]){
      const i=invoiceMap.get(ref.toUpperCase());
      if(!i){p.quarantined=true;issues.push({type:'unknown_invoice_reference',record:p.payment_id,reference:ref});continue;}
      if(i.invalid||i.future){p.quarantined=true;issues.push({type:'ineligible_invoice_reference',record:p.payment_id,reference:ref});continue;}
      if(i.client!==p.client){p.quarantined=true;issues.push({type:'payer_reference_conflict',record:p.payment_id,reference:ref,payer:p.client,billed:i.client});continue;}
      if(i.status?.toLowerCase()==='void'){p.quarantined=true;issues.push({type:'payment_to_void_invoice',record:p.payment_id,reference:ref});continue;}
      alloc(p,i,Math.min(p.remaining_cents,i.balance_cents),'explicit bank reference');
    }
  }
  const months={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
  for(const p of [...payments].sort((a,b)=>(a.date_time-b.date_time)||String(a.payment_id).localeCompare(String(b.payment_id)))){
    if(!(p.remaining_cents>0)||p.quarantined||p.date_time===null||p.date_time>now)continue;
    let candidates=invoices.filter(i=>activeInvoice(i)&&i.client===p.client&&i.issued_time<=p.date_time);
    const period=(p.reference||'').toLowerCase().match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/);
    if(period)candidates=candidates.filter(i=>new Date(i.issued_time).getUTCMonth()===months[period[1].slice(0,3)]&&new Date(i.issued_time).getUTCFullYear()===new Date(p.date_time).getUTCFullYear());
    candidates.sort((a,b)=>(a.issued_time-b.issued_time)||String(a.invoice_no).localeCompare(String(b.invoice_no)));
    const exact=candidates.filter(i=>i.balance_cents===p.remaining_cents);
    if(exact.length&&!period) {alloc(p,exact[0],p.remaining_cents,'identity + amount + chronological unreserved invoice');}
    else for(const i of candidates){alloc(p,i,Math.min(p.remaining_cents,i.balance_cents),period?'identity + bank period':'identity + chronological unreserved invoice');if(!p.remaining_cents)break;}
  }
  const bridge={},bridge_evidence=[],matched=new Set();
  const link=(i,b,rule,confidence='inferred',alternatives=[])=>{bridge[i.invoice_no]=b.booking_id;matched.add(b.booking_id);i.booking_id=b.booking_id;bridge_evidence.push({invoice:i.invoice_no,booking:b.booking_id,rule,confidence,alternatives});};
  const nonRetainer=invoices.filter(i=>!i.invalid&&!i.future&&i.status?.toLowerCase()!=='void'&&!/monthly retainer/i.test(i.memo||''));
  for(const i of nonRetainer){const ids=(i.memo||'').match(/\bB\d+\b/g)||[];if(ids.length===1){const b=bookingMap.get(ids[0]);if(b&&!matched.has(b.booking_id))link(i,b,'explicit booking ID in memo','high');else issues.push({type:'booking_reference_conflict',record:i.invoice_no,reference:ids[0]});}}
  // Service recipients may be billed through a payer. Infer that relationship
  // only from explicit booking references or same-date, same-amount service memo.
  const payerRecipients=new Map();
  const learn=(i,b)=>{if(i.client!==b.client){if(!payerRecipients.has(i.client))payerRecipients.set(i.client,new Set());payerRecipients.get(i.client).add(b.client);}};
  for(const [inv,bid] of Object.entries(bridge))learn(invoiceMap.get(inv),bookingMap.get(bid));
  // Shared billing email on a service-recipient booking exposes payer relationship.
  for(const b of bookings){const payer=resolve('',b.email||'');if(payer&&payer!==b.client){if(!payerRecipients.has(payer))payerRecipients.set(payer,new Set());payerRecipients.get(payer).add(b.client);}}
  const canMatch=(i,b)=>i.client===b.client||payerRecipients.get(i.client)?.has(b.client);
  const sorted=[...nonRetainer].sort((a,b)=>(!(/\b\d{1,2}\/\d{1,2}(?:\s|$)/.test(a.memo||'')))-(!(/\b\d{1,2}\/\d{1,2}(?:\s|$)/.test(b.memo||'')))||(a.issued_time-b.issued_time));
  for(const i of sorted){
    if(bridge[i.invoice_no])continue;
    let candidates=bookings.filter(b=>!matched.has(b.booking_id)&&b.status!=='upcoming'&&canMatch(i,b)&&b.price_cents===i.amount_cents);
    const m=(i.memo||'').match(/\b(\d{1,2})\/(\d{1,2})(?:\s|$)/);
    let rule='identity + amount + nearest preceding unmatched service';
    if(m){const date=iso(`${new Date(i.issued_time).getUTCFullYear()}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`);candidates=candidates.filter(b=>b.date_time===date);rule='identity/payer + service date + amount';}
    else {candidates=candidates.filter(b=>Math.abs(b.date_time-i.issued_time)<=7*day);candidates.sort((a,b)=>Number(a.date_time>i.issued_time)-Number(b.date_time>i.issued_time)||Math.abs(a.date_time-i.issued_time)-Math.abs(b.date_time-i.issued_time));}
    if(candidates.length){const b=candidates[0];const tied=candidates.filter(c=>c.date_time===b.date_time).map(c=>c.booking_id);link(i,b,rule,tied.length>1?'ambiguous':'inferred',tied.length>1?tied:[]);if(tied.length>1)issues.push({type:'ambiguous_booking_allocation',record:i.invoice_no,candidates:tied});}
    else issues.push({type:'unmatched_invoice',record:i.invoice_no});
  }
  const disputed=[];
  for(const i of invoices){const b=bookingMap.get(bridge[i.invoice_no]);if(b?.status?.toLowerCase()==='cancelled'){i.disputed=true;disputed.push({client:b.client,invoice:i.invoice_no,booking:b.booking_id,amount:dollars(i.balance_cents),why:'Linked booking is cancelled. Check cancellation terms and any prepayment claim before collecting or refunding.'});}}
  const overdue=invoices.filter(i=>i.balance_cents>0&&!i.invalid&&!i.future&&!i.disputed&&i.due_time<now).map(i=>({client:i.client,invoice:i.invoice_no,amount_owed:dollars(i.balance_cents),days_late:Math.floor((now-i.due_time)/day)}));
  const credits=payments.filter(p=>p.remaining_cents>0&&!p.quarantined&&p.date_time!==null&&p.date_time<=now).map(p=>({client:p.client,payment:p.payment_id,amount:dollars(p.remaining_cents),why:'Unallocated bank receipt after reference, identity, amount and period matching; verify refund/credit with owner.'}));
  const never_billed=bookings.filter(b=>b.status?.toLowerCase()==='completed'&&b.price_cents>0&&b.date_time<=now&&!matched.has(b.booking_id)).map(b=>({client:b.client,booking_id_or_month:b.booking_id,amount:dollars(b.price_cents)}));
  const wrong=[];
  for(const i of invoices){i.amount=dollars(i.amount_cents||0);i.balance=dollars(i.balance_cents||0);if(i.invalid||i.future||i.status?.toLowerCase()==='void')continue;const truth=i.balance_cents===0?'paid':i.balance_cents<i.amount_cents?'partial':'unpaid';i.reconciled_status=i.disputed?'disputed':truth;if(i.status?.toLowerCase()!==truth)wrong.push({invoice:i.invoice_no,tool_says:i.status,truth:`${truth}; balance $${i.balance.toFixed(2)}`,how_you_know:i.allocations.map(a=>`${a.payment} $${a.amount.toFixed(2)} (${a.rule})`).join('; ')||'No matching bank receipt after allocating explicit references first.'});}
  for(const p of payments){p.amount=dollars(p.amount_cents||0);p.remaining=dollars(p.remaining_cents||0);}
  const quarantined=payments.filter(p=>p.quarantined).map(p=>({payment:p.payment_id,client:p.client,amount:dollars(p.remaining_cents||0),why:'Needs review; invalid or conflicting reference/value. Not reallocated or classified as refundable credit.'}));
  return {invoices,payments,bookings,quarantined,overdue,overdue_total:overdue.reduce((s,r)=>s+r.amount_owed,0),credits,never_billed,never_billed_total:never_billed.reduce((s,r)=>s+r.amount,0),wrong,disputed,bridge,bridge_evidence,issues,payer_recipients:Object.fromEntries([...payerRecipients].map(([k,v])=>[k,[...v]]))};
}
