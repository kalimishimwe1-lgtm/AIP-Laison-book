import {useState,useEffect} from 'react';
import {api} from '../api';
import {useA} from './text';
import {Err} from './parts';
export default function Settings({onSaved}){
  const a=useA();const [s,setS]=useState(null),[msg,setMsg]=useState(''),[ok,setOk]=useState('');
  useEffect(()=>{api('/admin/settings').then(r=>setS(r)).catch(e=>setMsg(e.message))},[]);
  if(!s)return <><Err e={msg}/><p>{a.loading}</p></>;
  const T=({k,l,h})=><label className="chk big"><input type="checkbox" checked={!!s[k]} onChange={e=>setS({...s,[k]:e.target.checked})}/><span><b>{l}</b><br/><small>{h}</small></span></label>;
  return <><h2>{a.nav_settings}</h2><p className="sub"/><Err e={msg}/>{ok&&<p className="okmsg">{ok}</p>}
    <form className="card-form" onSubmit={async e=>{e.preventDefault();setMsg('');setOk('');try{await api('/admin/settings',{method:'PUT',body:s});setOk(a.saved);onSaved&&onSaved()}catch(x){setMsg(x.message)}}}>
      <T k="registration_open" l={a.s_registration} h={a.s_registrationHelp}/>
      <T k="allow_new_schools" l={a.s_newSchools} h={a.s_newSchoolsHelp}/>
      <T k="maintenance" l={a.s_maintenance} h={a.s_maintenanceHelp}/>
      <label>{a.s_announcement}<textarea rows="2" maxLength="300" value={s.announcement||''} onChange={e=>setS({...s,announcement:e.target.value})}/><small>{a.s_announcementHelp}</small></label>
      <button className="btn" style={{marginTop:10}}>{a.save}</button></form></>;
}
