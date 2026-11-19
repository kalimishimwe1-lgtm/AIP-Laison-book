import {useState,useEffect} from 'react';
import {api,setToken} from './api';
import {useT} from './i18n';
import LangSwitch from './LangSwitch';
export default function Auth({onAuth}){
  const {t}=useT();
  const [reg,setReg]=useState(false);
  const [f,setF]=useState({name:'',email:'',password:'',role:'learner',school_name:''});
  const [schools,setSchools]=useState([]);
  const [err,setErr]=useState('');const [ok,setOk]=useState('');const [busy,setBusy]=useState(false);
  const up=k=>e=>setF({...f,[k]:e.target.value});
  useEffect(()=>{api('/schools').then(r=>setSchools(r.schools)).catch(()=>{})},[]);
  const needSchool=reg&&f.role!=='company';
  const submit=async e=>{e.preventDefault();setErr('');setOk('');setBusy(true);
    try{
      const r=await api(reg?'/auth/register':'/auth/login',{method:'POST',body:f});
      if(r.pending){setOk(t.pending);setReg(false)}else{setToken(r.token);onAuth(r.user)}
    }catch(x){setErr(x.message)}
    setBusy(false)};
  return <div className="auth"><form className="card" onSubmit={submit}>
    <div className="flag"/><LangSwitch/><h2>{reg?t.create:t.login}</h2><p className="sub">{t.title} · {t.sub}</p>
    {reg&&<><label>{t.name}<input value={f.name} onChange={up('name')} required/></label>
      <label>{t.iam}<select value={f.role} onChange={up('role')}><option value="learner">{t.learner}</option><option value="teacher">{t.teacher}</option><option value="company">{t.company}</option></select></label>
      {needSchool&&<label>{t.school}
        <input list="school-list" value={f.school_name} onChange={up('school_name')} placeholder={t.schoolType} autoComplete="off" minLength={3} maxLength={160} required/>
        <datalist id="school-list">{schools.map(x=><option key={x.id} value={x.name}>{x.district||''}</option>)}</datalist>
        <small>{t.schoolHelp}</small></label>}</>}
    <label>{t.email}<input type="email" value={f.email} onChange={up('email')} required/></label>
    <label>{t.password}<input type="password" value={f.password} onChange={up('password')} minLength={reg?8:undefined} required/></label>
    {ok&&<p className="okmsg" role="status">{ok}</p>}
    {err&&<p className="err" role="alert">{err}</p>}
    <button className="btn" disabled={busy}>{busy?t.wait:reg?t.create:t.login}</button>
    <p><button type="button" className="btn ghost" onClick={()=>{setReg(!reg);setErr('');setOk('')}}>{reg?t.haveAcc:t.newAcc}</button></p>
  </form></div>;
}
