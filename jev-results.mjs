/**
 * Read recorded Jev results as review suggestions only. This module performs no
 * network, storage or action calls. Shape validation is not proof of API origin;
 * the supplied result archive must retain the actual run's provenance.
 */
import {parseMessages, isoDate} from './engine.mjs';

export const JEV_ROUTES = Object.freeze(['revision','churn','sales','billing','scheduling','approval','identity','praise','spam','other']);
const routeSet = new Set(JEV_ROUTES);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const probability = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
const close = (a,b) => Math.abs(a-b) <= 1e-9;
const jevModel = value => typeof value === 'string' && value.length <= 160 && /(?:^|[/:])jev(?:[-.:]|$)/i.test(value);
const jevProvider = value => typeof value === 'string' && value.length <= 200 && /^(?:OpenCode Jev|OpenCode \(TypeSafe Jev\)|TypeSafe Jev)(?:$|\s)/i.test(value);

// Synchronous SHA-256 keeps the public mapper pure and matches the CLI's exact
// UTF-8 message identifier (first 16 hex characters), without async side effects.
const K = new Uint32Array([
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
]);
const rotate = (x,n) => (x>>>n)|(x<<(32-n));
export function jevMessageId(raw) {
  const bytes = new TextEncoder().encode(raw);
  const padded = new Uint8Array(Math.ceil((bytes.length+9)/64)*64);
  padded.set(bytes);padded[bytes.length]=0x80;
  const view = new DataView(padded.buffer), bits=bytes.length*8;
  view.setUint32(padded.length-8,Math.floor(bits/0x100000000));
  view.setUint32(padded.length-4,bits>>>0);
  const hash = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
  const w = new Uint32Array(64);
  for(let block=0;block<padded.length;block+=64) {
    for(let i=0;i<16;i++)w[i]=view.getUint32(block+i*4);
    for(let i=16;i<64;i++) {
      const s0=rotate(w[i-15],7)^rotate(w[i-15],18)^(w[i-15]>>>3);
      const s1=rotate(w[i-2],17)^rotate(w[i-2],19)^(w[i-2]>>>10);
      w[i]=(w[i-16]+s0+w[i-7]+s1)>>>0;
    }
    let [a,b,c,d,e,f,g,h]=hash;
    for(let i=0;i<64;i++) {
      const s1=rotate(e,6)^rotate(e,11)^rotate(e,25),choice=(e&f)^(~e&g);
      const t1=(h+s1+choice+K[i]+w[i])>>>0;
      const s0=rotate(a,2)^rotate(a,13)^rotate(a,22),majority=(a&b)^(a&c)^(b&c);
      const t2=(s0+majority)>>>0;
      h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;
    }
    for(const [i,v] of [a,b,c,d,e,f,g,h].entries())hash[i]=(hash[i]+v)>>>0;
  }
  return [...hash].map(n=>n.toString(16).padStart(8,'0')).join('').slice(0,16);
}

function validatePrediction(item) {
  if(!object(item)||item.status!=='succeeded')return 'Prediction is not a successful result.';
  if(typeof item.raw_message!=='string'||!item.raw_message)return 'Missing exact raw message.';
  if(typeof item.message_id!=='string'||!/^[a-f0-9]{16}$/i.test(item.message_id)||item.message_id.toLowerCase()!==jevMessageId(item.raw_message))return 'Message identifier does not match the exact raw text.';
  if(!object(item.response)||!jevModel(item.response.model))return 'Returned model is missing or is not identified as Jev.';
  const answers=item.response.answers,result=item.result;
  if(!object(answers)||!object(result))return 'Missing typed answers or derived result.';
  const route=answers.route,probs=route?.probabilities;
  if(!object(route)||route.type!=='choice'||!routeSet.has(route.choice)||!object(probs))return 'Invalid route answer.';
  const keys=Object.keys(probs);
  if(keys.length!==JEV_ROUTES.length||keys.some(k=>!routeSet.has(k))||JEV_ROUTES.some(k=>!Object.hasOwn(probs,k)||!probability(probs[k])))return 'Route choices or probabilities do not match the known schema.';
  if(Math.abs(JEV_ROUTES.reduce((sum,key)=>sum+probs[key],0)-1)>0.02)return 'Route probabilities do not sum to one.';
  if(!routeSet.has(result.route)||result.route!==route.choice||!probability(result.route_probability)||!close(result.route_probability,probs[route.choice]))return 'Derived route disagrees with the recorded typed answer.';
  for(const name of ['needs_revision','continuation_risk']) {
    const answer=answers[name],p=result[name+'_probability'];
    if(!object(answer)||answer.type!=='noul'||!probability(answer.noul)||!probability(p)||!close(answer.noul,p)||typeof result[name]!=='boolean'||result[name]!== (p>=0.5))return 'Invalid or inconsistent '+name+' answer.';
  }
  if(result.action_authorized!==false)return 'A recorded result must explicitly authorize no action.';
  if(typeof result.review_reason!=='string'||!result.review_reason.trim()||result.review_reason.length>2000)return 'Missing review reason.';
  return '';
}

/**
 * Map recorded predictions onto the exact current inbound message text.
 * Optional data.asOf/data.as_of excludes future messages. An absent envelope is
 * an unavailable integration, not a success. No evaluation accuracy is inferred.
 *
 * `stats.matched` counts unique, validated current suggestions only. `failed`,
 * `rejected`, `outdated`, `duplicates` and `conflicts` are separate diagnostics;
 * they are not additional evaluated examples. Conflicting duplicates are removed.
 */
export function triageForMessages(data,resultEnvelope) {
  const stats={current_messages:0,inbound_messages:0,received:0,reported_succeeded:0,validated:0,matched:0,failed:0,rejected:0,outdated:0,duplicates:0,conflicts:0,future:0,missing:0,by_route:Object.fromEntries(JEV_ROUTES.map(route=>[route,0]))};
  const output={available:false,provider:'',requested_model:'',suggestions:[],stats,rejected:[],error:''};
  const reject=(index,item,reason)=>{stats.rejected++;output.rejected.push({index,message_id:typeof item?.message_id==='string'?item.message_id:'',reason});};
  let parsed;
  try {parsed=parseMessages(data?.messages||'');}
  catch {output.error='Current message data is invalid; no Jev suggestions were matched.';return output;}
  const all=new Map(parsed.map(m=>[m.raw,m]));stats.current_messages=all.size;
  const asOf=data?.asOf||data?.as_of||'';
  if(asOf&&!isoDate(asOf)){output.error='Current data cutoff is invalid; no Jev suggestions were matched.';return output;}
  const eligible=new Map([...all].filter(([,m])=>m.direction==='from'&&(!asOf||m.date<=asOf)));
  stats.inbound_messages=eligible.size;stats.missing=eligible.size;
  if(resultEnvelope===null||resultEnvelope===undefined)return output;
  if(!object(resultEnvelope)||!jevProvider(resultEnvelope.provider)||!jevModel(resultEnvelope.requested_model)||!Array.isArray(resultEnvelope.predictions)) {
    output.error='Recorded Jev envelope has invalid provider, model or predictions metadata.';
    reject(null,null,output.error);return output;
  }
  output.available=true;output.provider=resultEnvelope.provider;output.requested_model=resultEnvelope.requested_model;
  stats.received=resultEnvelope.predictions.length;
  const matched=new Map(),conflicted=new Set();
  for(const [index,item] of resultEnvelope.predictions.entries()) {
    if(object(item)&&item.status==='failed'){stats.failed++;continue;}
    if(item?.status==='succeeded')stats.reported_succeeded++;
    const reason=validatePrediction(item);
    if(reason){reject(index,item,reason);continue;}
    stats.validated++;
    const current=all.get(item.raw_message);
    if(!current){stats.outdated++;continue;}
    if(current.direction!=='from'){reject(index,item,'Outbound messages are not eligible for inbound triage.');continue;}
    if(asOf&&current.date>asOf){stats.future++;continue;}
    const r=item.result;
    const signature=JSON.stringify([item.response.model,r.route,r.route_probability,r.needs_revision,r.needs_revision_probability,r.continuation_risk,r.continuation_risk_probability]);
    if(conflicted.has(item.raw_message)){stats.duplicates++;reject(index,item,'Conflicting duplicate predictions require review of the run.');continue;}
    if(matched.has(item.raw_message)) {
      stats.duplicates++;
      const previous=matched.get(item.raw_message);
      if(previous.signature!==signature) {
        matched.delete(item.raw_message);conflicted.add(item.raw_message);stats.conflicts++;
        reject(previous.index,previous.item,'Conflicting duplicate predictions require review of the run.');
        reject(index,item,'Conflicting duplicate predictions require review of the run.');
      }
      continue;
    }
    matched.set(item.raw_message,{index,item,current,signature});
  }
  for(const {item,current} of matched.values()) {
    const result=item.result;
    output.suggestions.push({
      message_id:item.message_id.toLowerCase(),raw_message:item.raw_message,
      source_line:current.line,date:current.date,time:current.time,channel:current.channel,
      sender:current.sender,body:current.body,provider:output.provider,
      requested_model:output.requested_model,model:item.response.model,
      route:result.route,route_probability:result.route_probability,
      needs_revision:result.needs_revision,needs_revision_probability:result.needs_revision_probability,
      continuation_risk:result.continuation_risk,continuation_risk_probability:result.continuation_risk_probability,
      review_reason:result.review_reason,review_required:true,action_authorized:false
    });
    stats.by_route[result.route]++;
  }
  stats.matched=output.suggestions.length;stats.missing=eligible.size-stats.matched;
  return output;
}
