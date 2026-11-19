import {useState} from 'react';
import {api} from '../api';
import {useA} from './text';
import {useData,Err,Badge} from './parts';

export default function Schools(){
  const a=useA();
  const {d,err,load}=useData('/admin/schools');
  const [msg,setMsg]=useState(''),[ok,setOk]=useState('');
  const [f,setF]=useState({name:'',district:''}),[imp,setImp]=useState(''),[edit,setEdit]=useState(null),[mg,setMg]=useState(null),[q,setQ]=useState('');
  const run=async(fn,okText)=>{setMsg('');setOk('');try{const r=await fn();await load();if(okText)setOk(okText(r))}catch(e){setMsg(e.message)}};
  const rows=(d?.schools||[]).filter(s=>!q||(s.name+' '+(s.district||'')).toLowerCase().includes(q.toLowerCase()));
  return <>
    <h2>{a.nav_schools}</h2><p className="sub"/>
    <Err e={msg||err}/>{ok&&<p className="okmsg">{ok}</p>}
    <div className="grid2c">
      <form className="card-form" onSubmit={e=>{e.preventDefault();run(()=>api('/admin/schools',{method:'POST',body:f}),()=>a.saved).then(()=>setF({name:'',district:''}))}}>
        <h3>{a.addSchool}</h3>
        <label>{a.schoolName}<input value={f.name} onChange={e=>setF({...f,name:e.target.value})} required/></label>
        <label>{a.district}<input value={f.district} onChange={e=>setF({...f,district:e.target.value})}/></label>
        <button className="btn" style={{marginTop:10}}>{a.create}</button></form>
      <form className="card-form" onSubmit={e=>{e.preventDefault();run(()=>api('/admin/schools/import',{method:'POST',body:{text:imp}}),r=>`${a.imported}: ${r.added} + ${r.updated}`).then(()=>setImp(''))}}>
        <h3>{a.importTitle}</h3><p><small>{a.importHelp}</small></p>
        <textarea rows="4" value={imp} onChange={e=>setImp(e.target.value)} placeholder="IPRC Kigali; Nyarugenge"/>
        <button className="btn" style={{marginTop:10}}>{a.import}</button></form></div>
    {edit&&<form className="card-form" onSubmit={e=>{e.preventDefault();run(async()=>{await api('/admin/schools/'+edit.id,{method:'PATCH',body:{name:edit.name,district:edit.district,verified:edit.verified}});setEdit(null)})}}>
      <div className="grid"><label>{a.schoolName}<input value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})} required/></label>
        <label>{a.district}<input value={edit.district||''} onChange={e=>setEdit({...edit,district:e.target.value})}/></label>
        <label className="chk"><input type="checkbox" checked={!!edit.verified} onChange={e=>setEdit({...edit,verified:e.target.checked})}/> {a.verified}</label></div>
      <div style={{marginTop:10}}><button className="btn">{a.save}</button> <button type="button" className="btn ghost" onClick={()=>setEdit(null)}>{a.cancel}</button></div></form>}
    {mg&&<div className="card-form"><h3>{a.merge}: {mg.name}</h3><p><small>{a.mergeHelp}</small></p>
      <select value={mg.into||''} onChange={e=>setMg({...mg,into:e.target.value})}><option value="">{a.mergeInto}…</option>{d.schools.filter(s=>s.id!==mg.id).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
      <div style={{marginTop:10}}><button className="btn" disabled={!mg.into} onClick={()=>{if(confirm(a.confirmMerge))run(()=>api('/admin/schools/'+mg.id+'/merge',{method:'POST',body:{into:+mg.into}}),r=>`${r.moved??''} ${a.moved}`).then(()=>setMg(null))}}>{a.merge}</button> <button className="btn ghost" onClick={()=>setMg(null)}>{a.cancel}</button></div></div>}
    <div className="toolbar np"><input style={{maxWidth:280}} placeholder={a.filterSchools} value={q} onChange={e=>setQ(e.target.value)}/></div>
    {!d?<p>{a.loading}</p>:<div className="tw"><table><tbody><tr><th>{a.schoolName}</th><th>{a.district}</th><th>{a.status}</th><th>{a.learnersN}</th><th>{a.teachersN}</th><th>{a.actions}</th></tr>
      {rows.map(s=><tr key={s.id}><td>{s.name}</td><td style={{fontWeight:400}}>{s.district||'–'}</td>
        <td><Badge kind={s.verified?'active':'pending'}>{s.verified?a.verified:a.unverified}</Badge></td>
        <td style={{fontWeight:400}}>{s.learners??0}</td><td style={{fontWeight:400}}>{s.teachers??0}</td>
        <td className="acts">{!s.verified&&<button className="btn sm" onClick={()=>run(()=>api('/admin/schools/'+s.id+'/verify',{method:'POST'}))}>{a.verify}</button>}
          <button className="btn ghost sm" onClick={()=>setEdit({...s})}>{a.edit}</button>
          <button className="btn ghost sm" onClick={()=>setMg({id:s.id,name:s.name})}>{a.merge}</button>
          <button className="btn ghost sm danger" onClick={()=>{if(confirm(a.confirmDeleteSchool))run(()=>api('/admin/schools/'+s.id,{method:'DELETE'}))}}>{a.delete}</button></td></tr>)}</tbody></table></div>}
  </>;
}
