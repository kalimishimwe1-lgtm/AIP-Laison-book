import {useState} from 'react';
import {downloadFile} from '../api';
import {useA} from './text';
import {useData,qs,Err,Pager,useDebounced} from './parts';
export default function Activity({preset={}}){
  const a=useA();const [action,setAction]=useState(preset.action||''),[q,setQ]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState(''),[page,setPage]=useState(1),[m,setM]=useState('');
  const dq=useDebounced(q);const p={action,q:dq,from,to};
  const {d,err}=useData('/admin/audit?'+qs({...p,page}));
  const f=set=>e=>{set(e.target.value);setPage(1)};
  return <><h2>{a.nav_activity}</h2><p className="sub"/><Err e={m||err}/>
    <div className="toolbar np"><select style={{width:'auto'}} value={action} onChange={f(setAction)}><option value="">{a.all}</option>{(d?.actions||[]).map(x=><option key={x}>{x}</option>)}</select>
      <input style={{maxWidth:240}} placeholder={a.textFilter} value={q} onChange={f(setQ)}/>
      <label>{a.from} <input type="date" value={from} onChange={f(setFrom)}/></label><label>{a.to} <input type="date" value={to} onChange={f(setTo)}/></label>
      <button className="btn ghost" onClick={()=>downloadFile('/admin/audit.csv?'+qs(p),'activity.csv').catch(e=>setM(e.message))}>{a.exportCsv}</button></div>
    {!d?<p>{a.loading}</p>:!d.rows.length?<p>{a.noResults}</p>:<><div className="tw"><table><tbody><tr><th>{a.when}</th><th>{a.action}</th><th>{a.who}</th><th>{a.detail}</th><th>{a.ip}</th></tr>
      {d.rows.map(r=><tr key={r.id}><td style={{fontWeight:400}}>{new Date(r.created_at).toLocaleString()}</td><td><code>{r.action}</code></td><td style={{fontWeight:400}}>{r.name||'–'}</td><td style={{fontWeight:400}}>{r.detail}</td><td style={{fontWeight:400}}>{r.ip||''}</td></tr>)}</tbody></table></div>
      <Pager page={d.page} total={d.total} size={d.size} onPage={setPage}/></>}</>;
}
