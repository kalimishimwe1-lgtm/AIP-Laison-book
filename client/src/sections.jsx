import {useState,useEffect} from 'react';
import QRCode from 'qrcode';
import {Inp,Sel,Area,Check,Box,Head,Tx,useS} from './ui';
import {useT} from './i18n';
import {api} from './api';
import {days,st,sc6,G,V,Q} from './data';
import {calc} from './scoring';

export const Profile=()=><>
  <Head t="Profile" sub="Learner, TVET provider and company details from the front page."/>
  <Box t="Learner"><div className="grid"><Inp k="l_name" label="Name"/><Inp k="l_trade" label="Trade"/><Inp k="l_rqf" label="RQF level"/><Inp k="l_year" label="School year"/><Inp k="l_tel" label="Learner’s phone"/></div></Box>
  <Box t="TVET provider"><div className="grid"><Inp k="p_name" label="Name of TVET provider"/><Inp k="p_tel" label="Phone"/><Inp k="p_mail" label="Email" type="email"/><Inp k="p_loc" label="Location / district"/><Inp k="p_sup" label="School supervisor"/><Inp k="p_suptel" label="Supervisor phone"/><Inp k="p_supmail" label="School supervisor email (can view your book)" type="email"/></div></Box>
  <Box t="Company"><div className="grid"><Inp k="c_name" label="Name"/><Inp k="c_tel" label="Phone"/><Inp k="c_mail" label="Email" type="email"/><Inp k="c_loc" label="Location / district"/><Inp k="c_sector" label="Sector"/><Inp k="c_cell" label="Cell"/><Inp k="c_vil" label="Village"/><Inp k="c_sup" label="Company supervisor name"/><Inp k="c_suptel" label="Company supervisor contact"/><Inp k="c_supmail" label="Company supervisor email (can view your book)" type="email"/></div></Box>
</>;

export const Competences=()=><>
  <Head t="Competences" sub="Filled by the TVET teacher: the competences and activities the learner must practise, from the curriculum."/>
  <div className="grid" style={{marginBottom:12}}><Inp k="d_start" label="Starting date" type="date"/><Inp k="d_end" label="Ending date" type="date"/></div>
  <div className="tw"><table><tbody><tr><th style={{width:40}}><Tx>No</Tx></th><th><Tx>Specific competence</Tx></th><th><Tx>Activities to carry out</Tx></th></tr>
    {[...Array(8).keys()].map(i=><tr key={i}><td>{i+1}</td><td><Inp k={'cp'+i}/></td><td><Inp k={'ca'+i}/></td></tr>)}</tbody></table></div>
</>;

export function Attendance(){
  const {S}=useS();const {att}=calc(S);
  return <>
    <Head t="Attendance" sub="Fill in every day. The company supervisor confirms each day by signing (type the initials)."/>
    <div className="tot"><div className="pill"><Tx>Days recorded</Tx> <b>{att.n}</b></div>{st.map(s=><div className="pill" key={s}><Tx>{s}</Tx> <b>{att[s]}</b></div>)}</div>
    {[1,2,3,4].map(w=><details key={w} open={w===1}><summary><Tx>Week</Tx> {w}</summary><div className="tw"><table><tbody>
      <tr><th><Tx>Day</Tx></th><th><Tx>Time in</Tx></th><th><Tx>Time out</Tx></th><th><Tx>Status</Tx></th><th><Tx>Learner sign</Tx></th><th><Tx>Company sign</Tx></th></tr>
      {days.map((d,i)=><tr key={d}><td><Tx>{d}</Tx></td><td><Inp k={`a${w}${i}i`} type="time"/></td><td><Inp k={`a${w}${i}o`} type="time"/></td><td><Sel k={`a${w}${i}s`} options={st}/></td><td><Inp k={`a${w}${i}l`}/></td><td><Inp k={`a${w}${i}c`}/></td></tr>)}
    </tbody></table></div></details>)}
  </>;
}

export function Weekly(){
  const {S}=useS();const {wh,T}=calc(S);
  return <>
    <Head t="Weekly reports" sub="Record up to three tasks a day, with the tools used and hours worked."/>
    <div className="tot"><div className="pill"><Tx>Total hours</Tx> <b>{T}</b></div></div>
    {[1,2,3,4].map(w=><details key={w} open={w===1}><summary><Tx>Week</Tx> {w} <span style={{fontWeight:400,color:'var(--mut)'}}>{wh[w]?`· ${wh[w]} h`:''}</span></summary>
      <div className="grid" style={{marginBottom:8}}><Inp k={`rf${w}`} label="From" type="date"/><Inp k={`rt${w}`} label="To" type="date"/></div>
      <div className="tw"><table><tbody><tr><th><Tx>Day</Tx></th><th><Tx>Tasks performed</Tx></th><th><Tx>Tools, materials, equipment</Tx></th><th style={{width:80}}><Tx>Hours</Tx></th></tr>
        {days.map((d,i)=>[1,2,3].map(t=><tr key={d+t}>{t===1&&<td rowSpan={3}><Tx>{d}</Tx></td>}<td><Inp k={`r${w}${i}${t}a`}/></td><td><Inp k={`r${w}${i}${t}b`}/></td><td><Inp k={`r${w}${i}${t}h`} type="number" min="0" max="24" step="0.5"/></td></tr>))}
      </tbody></table></div>
      <Inp k={`rs${w}`} label="Company supervisor signature (name)"/><br/></details>)}
  </>;
}

export function Evaluation(){
  const {S}=useS();const c=calc(S);
  return <>
    <Head t="Company supervisor evaluation" sub="Rate each statement from 0 (poor) to 5 (excellent). Each group is scaled to its points, and the total is out of 100."/>
    <div className="tot"><div className="pill big"><Tx>Learner overall performance</Tx> <b>{c.tot.toFixed(1)}</b> / 100</div></div>
    {G.map((g,gi)=><div key={gi}>
      {(gi===0||G[gi-1][0]!==g[0])&&<h3 style={{margin:'18px 0 6px'}}><Tx>{g[0]}</Tx></h3>}
      <div className="tw"><table><tbody><tr><th><Tx>{g[1]}</Tx></th><th style={{width:90}}><Tx>Score</Tx></th></tr>
        {g[3].map((s,i)=><tr key={i}><td><Tx>{s}</Tx></td><td><Sel k={`e${gi}_${i}`} options={sc6}/></td></tr>)}
        <tr><th><Tx>Sub-total</Tx></th><th>{c.es[gi].k?c.es[gi].p.toFixed(1):'–'} / {g[2]}</th></tr></tbody></table></div></div>)}
    <Area k="e_com" label="Company supervisor’s comments and ideas to improve the IAP"/>
    <div className="grid" style={{marginTop:8}}><Inp k="e_at" label="Done at"/><Inp k="e_on" label="Date" type="date"/><Inp k="e_name" label="Name and stamp"/></div>
  </>;
}

export function Visit(){
  const {S}=useS();const {vavg}=calc(S);
  return <>
    <Head t="School supervisor visit" sub="Completed by the TVET teacher during a visit. Rank from 1 (fair) to 5 (excellent)."/>
    {V.map((g,gi)=><div className="tw" key={gi}><table><tbody><tr><th><Tx>{g[0]}</Tx></th><th style={{width:80}}><Tx>Rank</Tx></th><th><Tx>Comments</Tx></th></tr>
      {g[1].map((s,i)=><tr key={i}><td><Tx>{s}</Tx></td><td><Sel k={`v${gi}_${i}`} options={[1,2,3,4,5]}/></td><td><Inp k={`vc${gi}_${i}`}/></td></tr>)}</tbody></table></div>)}
    <div className="tot"><div className="pill"><Tx>Average rank</Tx> <b>{vavg?vavg.toFixed(1):'–'}</b> / 5</div></div>
    <Area k="v_obs" label="Other observations and recommendations"/>
    <h3><Tx>Follow-up visits</Tx></h3>
    <div className="tw"><table><tbody><tr><th><Tx>Name</Tx></th><th><Tx>Function</Tx></th><th><Tx>Date of visit</Tx></th><th><Tx>Signature</Tx></th></tr>
      {[0,1,2].map(i=><tr key={i}><td><Inp k={`f${i}n`}/></td><td><Inp k={`f${i}f`}/></td><td><Inp k={`f${i}d`} type="date"/></td><td><Inp k={`f${i}s`}/></td></tr>)}</tbody></table></div>
  </>;
}

const helped=['It sharpened my skills through hands-on activities','It oriented me on the move from school to work','The workplace inspired me to practise work ethics'];
const probs=['Lack of safety measures','Poor communication with work mates','Inadequate tools and equipment','Lack of supervision and support','Unclear job description','Tasks not related to my training','No opportunities for professional growth','Failure to see dignity and value of work','Lack of work ethics','Lack of morality among work mates'];
const liked=['Applying my theory in practice','Doing tasks like a regular worker','Learning from my workmates'];
export const SelfAssessment=()=><>
  <Head t="Learner self-assessment" sub="Answer honestly. This is not part of your IAP marks. It helps improve the program."/>
  <Box t="Were your expectations met?"><Sel k="s_exp" options={['All','Some','Very few','None at all']}/></Box>
  <Box t="How did IAP help you? (tick all that apply)">{helped.map((t,i)=><Check key={i} k={'sh'+i} label={t}/>)}<Inp k="s_oth1" label="Others"/></Box>
  <Box t="Problems you met at the workplace">{probs.map((t,i)=><Check key={i} k={'pr'+i} label={t}/>)}<Inp k="s_oth2" label="Other conditions"/></Box>
  <Box t="Did your teacher or headteacher address your IAP concerns?"><Sel k="s_mon" options={['Always','Sometimes','Very rarely','Never']}/></Box>
  <Box t="What did you like most?">{liked.map((t,i)=><Check key={i} k={'lk'+i} label={t}/>)}<Inp k="s_oth3" label="Others"/></Box>
  <Box t="Rate your IAP experience"><Sel k="s_rate" options={[[5,'5 Excellent'],[4,'4 Very good'],[3,'3 Good'],[2,'2 Sufficient'],[1,'1 Fair'],[0,'0 Poor']]}/><Area k="s_why" label="Brief explanation"/></Box>
</>;

export function Interview(){
  const {S}=useS();const c=calc(S);
  return <>
    <Head t="Final interview and marks" sub="The jury (at least 2 teachers and the company supervisor) scores each criterion from 0 to 5. The learner hands in this book one day before the interview."/>
    {Q.map((q,i)=><Box t={q[0]} key={i}><ul>{q[1].map(x=><li key={x}><Tx>{x}</Tx></li>)}</ul><label><Tx>Score (0–5)</Tx><Sel k={'q'+i} options={sc6}/></label></Box>)}
    <h3><Tx>Overall marks for the IAP module</Tx></h3>
    <div className="tw"><table><tbody><tr><th><Tx>Part</Tx></th><th><Tx>Weight</Tx></th><th><Tx>Mark</Tx></th></tr>
      <tr><td><Tx>Industrial attachment theory (entered by teacher)</Tx></td><td>20</td><td><Inp k="m_theory" type="number" min="0" max="20" step="0.5"/></td></tr>
      <tr><td><Tx>Performance at workplace (company evaluation ÷ 2)</Tx></td><td>50</td><td>{c.work.toFixed(1)}</td></tr>
      <tr><td><Tx>Report presentation (interview scores scaled to 30)</Tx></td><td>30</td><td>{c.hasQ?c.rep.toFixed(1):'–'}</td></tr>
      <tr><th><Tx>Total</Tx></th><th>100</th><th>{c.final.toFixed(1)}</th></tr></tbody></table></div>
  </>;
}

export function Certificate(){
  const {S,path,role}=useS();
  const {tr}=useT();
  const [cert,setCert]=useState(undefined),[qr,setQr]=useState(''),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{api(path+'/certificate').then(r=>setCert(r.certificate)).catch(()=>setCert(null))},[path]);
  const url=cert?`${location.origin}${location.pathname}#/verify/${cert.code}`:'';
  useEffect(()=>{if(url)QRCode.toDataURL(url,{margin:1,width:160}).then(setQr).catch(()=>setQr(''));else setQr('')},[url]);
  const issue=async()=>{setErr('');setBusy(true);
    try{const r=await api(path+'/certificate',{method:'POST'});setCert(r.certificate)}catch(e){setErr(e.message)}setBusy(false)};
  const U=({v})=><u>{v||''}</u>;
  const printIt=()=>{document.body.classList.add('pc');window.print();document.body.classList.remove('pc')};
  return <>
    <Head t="Certificate" sub="Filled from your profile. Print it, or save it as a PDF, for signature and stamp."/>
    <div className="cert"><h3><Tx>TVET Industrial Attachment Participation Certificate</Tx></h3>
      <p><b><Tx>TO WHOM IT MAY CONCERN</Tx></b><br/><Tx>This is to certify that Mr./Ms.</Tx> <U v={S.l_name}/> <Tx>a trainee from</Tx> <U v={S.p_name}/> <Tx>has successfully completed the industrial attachment program in (Trade)</Tx> <U v={S.l_trade}/> <Tx>RQF level </Tx><U v={S.l_rqf}/> <Tx>at</Tx> <U v={S.c_name}/> <Tx>from</Tx> <U v={S.d_start}/> <Tx>to</Tx> <U v={S.d_end}/>.</p>
      <div className="sig"><div><Tx>Name, signature and stamp</Tx><br/><b><Tx>Company authority</Tx></b></div>
        {qr&&!cert.revoked_at&&<div className="qr"><img src={qr} alt="QR" width="110" height="110"/><small><Tx>Certificate code</Tx>: {cert.code}</small></div>}
        <div style={{textAlign:'right'}}><Tx>Name, signature and stamp</Tx><br/><b><Tx>TVET provider</Tx></b></div></div></div>
    <div className="np" style={{textAlign:'center',marginTop:14}}>
      {cert===undefined?null:cert?.revoked_at?<p className="err" role="alert">{tr('This certificate has been withdrawn by RTB and is not valid.')}</p>:cert?<p className="okmsg">✔ {tr('Certificate issued')} · {tr('Scan to verify')}</p>
        :role==='teacher'?<button className="btn" disabled={busy} onClick={issue}>{tr('Issue certificate')}</button>
        :<p className="sub" style={{margin:'0 auto'}}>{tr('Not issued yet')}. {tr('Only the school supervisor can issue the certificate, after the learner completes the program.')}</p>}
      {err&&<p className="err" role="alert">{err}</p>}
      <p><button className="btn ghost" onClick={printIt}>{tr('Print certificate')}</button></p></div>
  </>;
}
