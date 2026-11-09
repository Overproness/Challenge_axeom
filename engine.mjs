import { reconcile } from './finance.mjs';

export const TABLES = {
  leads: ['lead_id','created','name','business','email','phone','source','first_reply','status'],
  bookings: ['booking_id','date','client_name','email','service','status','price'],
  invoices: ['invoice_no','bill_to','email','issued','due','amount','status','memo'],
  payments: ['payment_id','date','payer','payer_email','amount','method','reference'],
  production_board: ['video_id','client','title','editor','stage','notes_on_board','revisions','editor_hours','client_approved_on','shoot_booking'],
  team: ['name','role','joined','pay'], costs: ['item','cost','note']
};
export const norm = s => String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export const words = s => String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,' ').replace(/\s+/g,' ').trim();
export const cents = s => Math.round(Number(String(s||'0').replace(/[$,]/g,''))*100);
export const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n||0);
export const sum = (rows,key) => Math.round(rows.reduce((n,r)=>n+Number(r[key]||0),0)*100)/100;
export function isoDate(s, format='iso') {
  if(!s) return '';
  let y,m,d;
  if(format==='iso') [y,m,d]=String(s).slice(0,10).split('-').map(Number);
  else { const a=String(s).split('/').map(Number); [m,d,y]=format==='bank'?[a[1],a[0],a[2]]:a; }
  const date=new Date(Date.UTC(y,m-1,d));
  return Number.isFinite(+date)&&date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?date.toISOString().slice(0,10):'';
}
export const days = (a,b) => Math.round((Date.parse(a)-Date.parse(b))/86400000);

// RFC 4180: commas, escaped quotes, CRLF, BOM and quoted line breaks.
export function parseCSV(text) {
  text=String(text).replace(/^\uFEFF/,'');
  const rows=[];let row=[],field='',quoted=false,closed=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(quoted) { if(c==='"') {if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}} else field+=c; }
    else if(c==='"') {if(field||closed)throw Error('Unexpected quote in CSV');quoted=true;}
    else if(c===','||c==='\n'||c==='\r') {
      row.push(field);field='';closed=false;
      if(c!==',') {if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(x=>x!==''))rows.push(row);row=[];}
    } else {if(closed&&!/\s/.test(c))throw Error('Text after a closing CSV quote');if(!closed)field+=c;}
  }
  if(quoted)throw Error('Unclosed CSV quote');
  row.push(field);if(row.some(x=>x!==''))rows.push(row);
  if(!rows.length)throw Error('Empty CSV');
  const headers=rows.shift().map(x=>x.trim());
  if(new Set(headers).size!==headers.length)throw Error('Duplicate CSV column');
  return {headers,rows:rows.map((r,i)=>{if(r.length!==headers.length)throw Error('CSV row '+(i+2)+' has '+r.length+' fields; expected '+headers.length);return Object.fromEntries(headers.map((h,j)=>[h,r[j].trim()]));})};
}

export function parseMessages(text) {
  return String(text).split(/\r?\n/).filter(x=>x.trim()).map((raw,i)=>{
    const m=raw.match(/^\[(\d{4}-\d\d-\d\d) (\d\d:\d\d)\] (EMAIL|WHATSAPP|VOICE NOTE|INSTAGRAM DM|WEBSITE FORM) (from|to) (.*?): (.*)$/);
    if(!m||!isoDate(m[1]))throw Error('Invalid message format at line '+(i+1));
    const sender=m[5],body=m[6].replace(/^Transcript:\s*/,'').replace(/^"|"$/g,'');
    return {key:raw,line:i+1,date:m[1],time:m[2],channel:m[3].toLowerCase().replace(' dm',''),direction:m[4],sender,body,raw};
  });
}

function validateRow(type,r) {
  const id=r[TABLES[type][0]];if(!id)throw Error(type+': missing primary key');
  for(const field of type==='bookings'?['price']:type==='invoices'||type==='payments'?['amount']:type==='production_board'?['editor_hours','revisions']:[]) {
    const value=String(r[field]);if(!/^\$?-?[\d,]+(?:\.\d+)?$/.test(value)||!Number.isFinite(cents(value)))throw Error(id+': invalid '+field);
    if(Number(value.replace(/[$,]/g,''))<0&&!(type==='payments'&&field==='amount'))throw Error(id+': negative '+field);
  }
  for(const field of type==='bookings'||type==='payments'?['date']:type==='invoices'?['issued','due']:type==='leads'?['created','first_reply']:type==='team'?['joined']:type==='production_board'?['client_approved_on']:[]) {
    if(r[field]&&!isoDate(r[field],type==='bookings'?'booking':type==='payments'?'bank':'iso'))throw Error(id+': invalid '+field+' date');
  }
}

// Validate the entire batch first, then upsert by stable source ID. Never append duplicate money.
export function importFiles(current,files) {
  const next=structuredClone(current), report=[];
  for(const file of files) {
    if(file.name.toLowerCase().endsWith('.txt')) {
      const incoming=parseMessages(file.text);const old=parseMessages(next.messages||'');
      const unique=new Map(old.map(m=>[m.raw,m.raw]));for(const m of incoming)unique.set(m.raw,m.raw);
      next.messages=[...unique.values()].sort().join('\n');report.push({file:file.name,table:'messages',added:unique.size-old.length,updated:0});continue;
    }
    if(!file.name.toLowerCase().endsWith('.csv'))throw Error('Use the pack CSV files or messages.txt. Unsupported: '+file.name);
    const parsed=parseCSV(file.text);const type=Object.keys(TABLES).find(t=>TABLES[t].every(h=>parsed.headers.includes(h)));
    if(!type)throw Error(file.name+': headers do not match a pack format');
    const seen=new Set();for(const r of parsed.rows){validateRow(type,r);const id=r[TABLES[type][0]];if(seen.has(id))throw Error(file.name+': duplicate ID '+id);seen.add(id);}
    const key=TABLES[type][0], map=new Map((next[type]||[]).map(r=>[r[key],r]));let added=0,updated=0;
    for(const r of parsed.rows){if(!map.has(r[key]))added++;else if(JSON.stringify(map.get(r[key]))!==JSON.stringify(r))updated++;map.set(r[key],r);}
    next[type]=[...map.values()];report.push({file:file.name,table:type,added,updated});
  }
  return {data:next,report};
}

export function identities(data,reviewed,overrides={}) {
  const entities=structuredClone(reviewed);const byName=new Map(),byEmail=new Map(),byPhone=new Map();
  const add=(map,key,e)=>{if(!key)return;if(!map.has(key))map.set(key,e);else if(map.get(key)!==e)map.set(key,null);};
  const index=e=>{for(const n of [e.name,...(e.other_names_used_in_the_data||[])])add(byName,norm(n),e);for(const v of e.emails||[])add(byEmail,v.toLowerCase(),e);for(const p of e.phones||[])add(byPhone,p.replace(/\D/g,'').slice(-10),e);};
  for(const e of entities)index(e);
  const resolve=(name,email='',phone='')=>{
    if(overrides[norm(name)+'|'+email.toLowerCase()])return overrides[norm(name)+'|'+email.toLowerCase()];
    const a=byName.get(norm(name)),b=byEmail.get(String(email).toLowerCase());
    if(b?.payer_only&&a&&!a.payer_only)return a.name;
    if(b)return b.name;if(a)return a.name;
    // A phone match alone is unsafe: unrelated leads reuse some phone numbers in this pack.
    const p=byPhone.get(String(phone).replace(/\D/g,'').slice(-10));
    if(p&&p.other_names_used_in_the_data?.some(n=>norm(n)===norm(name)))return p.name;
    return '';
  };
  const learn=(name,email)=>{const billingEmail=byEmail.get(String(email||'').toLowerCase());const found=resolve(name,email);if(found){const e=entities.find(e=>e.name===found);if(e&&!e.payer_only){if(name&&!e.other_names_used_in_the_data.includes(name))e.other_names_used_in_the_data.push(name);add(byName,norm(name),e);if(email&&!billingEmail?.payer_only){if(!e.emails.includes(email))e.emails.push(email);add(byEmail,email.toLowerCase(),e);}}return;}
    if(!name&&!email)return;
    const e={name:name||email,other_names_used_in_the_data:[],emails:email?[email]:[],phones:[],inferred:true};entities.push(e);index(e);
  };
  for(const r of data.bookings||[])learn(r.client_name,r.email);
  for(const r of data.invoices||[])learn(r.bill_to,r.email);
  // Board rows inherit their booking's identity when present.
  for(const r of data.production_board||[]) {const b=(data.bookings||[]).find(b=>b.booking_id===r.shoot_booking);if(b){const n=resolve(b.client_name,b.email);const e=entities.find(e=>e.name===n);if(e)add(byName,norm(r.client),e);}}
  const sender=m=>{
    const email=m.sender.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0];
    if(email&&byEmail.get(email.toLowerCase()))return byEmail.get(email.toLowerCase()).name;
    const phone=m.sender.match(/(?:\+1\s*)?(\d{3}[- ]\d{3}[- ]\d{4})/)?.[1];
    if(phone&&byPhone.get(phone.replace(/\D/g,'')))return byPhone.get(phone.replace(/\D/g,'')).name;
    if(m.sender.startsWith('@')) {
      // Handles are reviewed identity evidence. Prefix guessing can merge unrelated accounts,
      // and fails on short names with location suffixes such as @colesautospatx.
      const handle=m.sender.split(/[ ,]/)[0].toLowerCase().replace(/^@/,'');
      const candidates=entities.filter(e=>(e.handles||[]).some(h=>String(h).toLowerCase().replace(/^@/,'')===handle));
      if(candidates.length===1)return candidates[0].name;
    }
    return resolve(m.sender.replace(/\s*\(.*?\).*$/,''),email||'');
  };
  return {entities,resolve,sender};
}

export function requestedAction(body) {
  const t=words(body);
  if(/calmer song|calmer music|cancion mas tranquila/.test(t))return 'Calmer music';
  if(/music.*too loud/.test(t))return 'Music lower';
  if(/captions bigger/.test(t))return 'Captions bigger';
  if(/first 3 seconds/.test(t))return 'Cut first 3 sec';
  if(/stumble/.test(t))return 'Cut stumble';
  if(/blur.*face/.test(t))return 'Blur client face';
  if(/other shot.*outside/.test(t))return 'Use outside shot';
  if(/phone number.*end/.test(t))return 'Phone number end card';
  if(/name is spelled wrong/.test(t))return 'Fix name spelling';
  const color=t.match(/brand color (\w+)/);if(color)return 'Brand color '+color[1];
  if(/take out.*prices/.test(t))return 'Remove prices';
  if(/add the line.*walk ins welcome/.test(t))return 'Add walk-ins welcome';
  if(/different song.*new intro/.test(t))return 'New song and intro after approval';
  return '';
}

function instructionCaptured(notes,expected) {
  // Board notes can legitimately shorten "Remove prices part" to "Remove prices".
  // Keep the other instructions exact enough to preserve colors and action details.
  const instruction=s=>norm(s).replace(/^removepricespart$/,'removeprices');
  return instruction(notes).includes(instruction(expected));
}

export function build(data,reviewed,audit=[],overrides={},asOf='2026-10-06') {
  const graph=identities(data,reviewed,overrides),{resolve,sender,entities}=graph;
  const messages=parseMessages(data.messages||'').filter(m=>m.date<=asOf).map(m=>({...m,client:sender(m)}));
  const finance=reconcile(data,resolve,asOf);
  const booking=new Map(data.bookings.map(b=>[b.booking_id,b]));
  const board=data.production_board.map(v=>({...v,canonical:resolve(v.client)||resolve(booking.get(v.shoot_booking)?.client_name,booking.get(v.shoot_booking)?.email)}));
  const audited=new Map(audit.map(r=>[r.message,r]));const requests=[],other=[];
  for(const m of messages.filter(m=>m.direction==='from')) {
    const a=audited.get(m.raw),action=a?.requested_change||requestedAction(m.body);
    if(!action) {
      // A new type of edit must remain visible even if this ruleset cannot classify it.
      // Its original text is retained for owner review, rather than inventing a board status.
      const editIntent=/\b(?:please|can you|could you|would you)\b.*\b(?:replace|remove|add|change|fix|update|edit|cut|blur|make|use|lower|raise|swap|adjust|resize)\b/i.test(m.body);
      if(editIntent)other.push({...m,requested_change:m.body,why:'Unrecognized edit instruction: review the original message and choose its video and change.'});
      continue;
    }
    let v=a?board.find(v=>v.video_id===a.video_id):null;
    let ambiguity=false;
    if(!v&&m.client) {
      const body=' '+words(m.body)+' ';
      const explicitIds=[...new Set(m.body.match(/\bV\d+\b/gi)||[])].map(id=>id.toUpperCase());
      // An explicit ID wins over a repeated title only when its client agrees with sender.
      let candidates=explicitIds.length?board.filter(v=>explicitIds.includes(v.video_id.toUpperCase())&&v.canonical===m.client):board.filter(v=>v.canonical===m.client&&body.includes(' '+words(v.title)+' '));
      // New repeated titles need review rather than silently picking a different batch.
      candidates=candidates.filter(v=>!v.shoot_booking||isoDate(booking.get(v.shoot_booking)?.date,'booking')<=m.date);
      if(candidates.length===1&&explicitIds.length<=1)v=candidates[0];else ambiguity=true;
    }
    if(v) {
      const expected=a?.requested_change||action;
      const captured=instructionCaptured(v.notes_on_board,expected);
      requests.push({...m,video_id:v.video_id,title:v.title,editor:v.editor,stage:v.stage,requested_change:expected,captured,notes:v.notes_on_board,approval:v.client_approved_on,scopeChange:/after approval/.test(expected),confidence:a?.mapping_confidence||'Title and sender; single candidate'});
    } else other.push({...m,requested_change:action,why:ambiguity?'Repeated title or unnamed video: owner must choose the video.':'Sender or video could not be resolved.'});
  }
  const spam=r=>/crypto|free followers|test test|^asdf$/i.test(r.name+' '+r.business)||/coin-x|fastfollowers|test@test|^a@a.co$/i.test(r.email);
  const leads=data.leads.filter(r=>isoDate(r.created)<=asOf).map(r=>({...r,canonical:resolve(r.business,r.email),spam:spam(r),futureReply:!!r.first_reply&&r.first_reply>asOf,waiting:!r.first_reply||r.first_reply>asOf}));
  const waiting=leads.filter(r=>r.waiting&&!r.spam);
  const churn=messages.filter(m=>m.direction==='from'&&/whether we continue|contract this week|we.ll pause|too many rounds|not happy/i.test(m.body));
  const naming=messages.filter(m=>m.direction==='from'&&/full name|full legal name/i.test(m.body));
  const opportunities=messages.filter(m=>m.direction==='from'&&/every month|also cut short clips|package where you cut|cousin.*needs videos/i.test(m.body));
  const unresolved=[...board.filter(v=>!v.canonical).map(v=>({type:'production_board',name:v.client,email:'',id:v.video_id})),...data.payments.filter(p=>!resolve(p.payer,p.payer_email)).map(p=>({type:'payments',name:p.payer,email:p.payer_email,id:p.payment_id}))];
  return {asOf,entities,resolve,messages,board,finance,requests,lost:requests.filter(r=>!r.captured&&!r.scopeChange),ambiguous:other,leads,waiting,churn,naming,opportunities,unresolved};
}
