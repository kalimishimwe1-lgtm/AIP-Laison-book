import {useState,useEffect} from 'react';
import {api} from './api';
import {useT} from './i18n';
import LangSwitch from './LangSwitch';
export default function Dashboard({user,onOpen,onLogout}){
  const {t}=useT();
  const [rows,setRows]=useState(null);const [err,setErr]=useState('');
  useEffect(()=>{api('/books').then(r=>setRows(r.learners)).catch(e=>setErr(e.message))},[]);
  return <div className="auth"><div className="card wide"><div className="flag"/><LangSwitch/>
    <h2>{t.myLearners}</h2><p className="sub">{user.name} · {user.role==='teacher'?t.teacher:t.company} · {user.email}</p>
    {err&&<p className="err">{err}</p>}{!rows&&!err&&<p>{t.loading}</p>}
    {rows&&!rows.length&&<p>{t.noLearners}</p>}
    {rows&&rows.length>0&&<div className="tw"><table><tbody><tr><th>{t.learner}</th><th>{t.trade}</th><th>{t.days}</th><th>{t.hoursShort}</th><th>{t.finalShort}</th><th>{t.last}</th><th></th></tr>
      {rows.map(l=><tr key={l.id}><td>{l.name}<br/><small>{l.email}</small></td><td>{l.trade||'–'}</td><td>{l.days_recorded}</td><td>{+l.hours}</td><td>{+l.final_mark||'–'}</td><td>{new Date(l.updated_at).toLocaleDateString()}</td><td><button className="btn" onClick={()=>onOpen(l)}>{t.open}</button></td></tr>)}</tbody></table></div>}
    <button className="btn ghost" onClick={onLogout}>{t.logout}</button></div></div>;
}
