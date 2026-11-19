import {useState} from 'react';
import {useA} from './text';
import {useData,qs,Err,Pager,useSchools,useDebounced} from './parts';
export default function Learners(){
  const a=useA();const [q,setQ]=useState(''),[sid,setSid]=useState(''),[page,setPage]=useState(1);
  const dq=useDebounced(q);const schools=useSchools();
  const {d,err}=useData('/admin/learners?'+qs({q:dq,school_id:sid,page}));
  return <><h2>{a.nav_learners}</h2><p className="sub"/><Err e={err}/>
    <div className="toolbar np"><input style={{maxWidth:280}} placeholder={a.q} value={q} onChange={e=>{setQ(e.target.value);setPage(1)}}/>
      <select style={{width:'auto'}} value={sid} onChange={e=>{setSid(e.target.value);setPage(1)}}><option value="">{a.allSchools}</option>{schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
    {!d?<p>{a.loading}</p>:!d.rows.length?<p>{a.noResults}</p>:<><div className="tw"><table><tbody><tr><th>{a.name}</th><th>{a.school}</th><th>{a.days}</th><th>{a.hours}</th><th>{a.evaluation}</th><th>{a.finalMark}</th><th>{a.certificate}</th><th>{a.updated}</th></tr>
      {d.rows.map(r=><tr key={r.id}><td>{r.name}<br/><small>{r.email}</small></td><td style={{fontWeight:400}}>{r.school||'–'}</td><td style={{fontWeight:400}}>{r.days_recorded??'–'}</td><td style={{fontWeight:400}}>{r.hours??'–'}</td><td style={{fontWeight:400}}>{r.eval_score??'–'}</td><td>{r.final_mark??'–'}</td>
        <td style={{fontWeight:400}}>{r.certificate?(r.revoked_at?a.withdrawn:r.certificate):a.noCert}</td><td style={{fontWeight:400}}>{r.updated_at?new Date(r.updated_at).toLocaleDateString():'–'}</td></tr>)}</tbody></table></div>
      <Pager page={d.page} total={d.total} size={d.size} onPage={setPage}/></>}</>;
}
