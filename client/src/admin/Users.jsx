import {useState} from 'react';
import {api} from '../api';
import {useA} from './text';
import {useData,qs,Err,Badge,Pager,Secret,useSchools,useDebounced} from './parts';

const ROLES=['learner','teacher','company','admin'];
const needsSchool=r=>r==='learner'||r==='teacher';

export default function Users({preset={},user}){
  const a=useA();
  const [q,setQ]=useState(''),[role,setRole]=useState(preset.role||''),[status,setStatus]=useState(preset.status||''),[page,setPage]=useState(1);
  const dq=useDebounced(q);
  const {d,err,load}=useData('/admin/users?'+qs({q:dq,role,status,page}));
  const schools=useSchools();
  const [msg,setMsg]=useState(''),[secret,setSecret]=useState(''),[edit,setEdit]=useState(null),[add,setAdd]=useState(false);
  const [f,setF]=useState({name:'',email:'',role:'teacher',school_id:''});
  const run=async fn=>{setMsg('');try{await fn();await load()}catch(e){setMsg(e.message)}};
  const patch=(u,body,confirmText)=>{if(confirmText&&!confirm(confirmText))return;run(()=>api('/admin/users/'+u.id,{method:'PATCH',body}))};
  const filt=(set)=>e=>{set(e.target.value);setPage(1)};
  return <>
    <h2>{a.nav_users}</h2><p className="sub"/>
    {secret&&<Secret value={secret} onClose={()=>setSecret('')}/>}
    <Err e={msg||err}/>
    <div className="toolbar np">
      <input style={{maxWidth:280}} placeholder={a.q} value={q} onChange={filt(setQ)} aria-label={a.q}/>
      <select style={{width:'auto'}} value={role} onChange={filt(setRole)} aria-label={a.role}><option value="">{a.allRoles}</option>{ROLES.map(r=><option key={r} value={r}>{a['r_'+r]}</option>)}</select>
      <select style={{width:'auto'}} value={status} onChange={filt(setStatus)} aria-label={a.status}><option value="">{a.allStatuses}</option>{['active','pending','disabled'].map(s=><option key={s} value={s}>{a['s_'+s]}</option>)}</select>
      <button className="btn" onClick={()=>setAdd(!add)}>{a.addUser}</button></div>
    {add&&<form className="card-form" onSubmit={e=>{e.preventDefault();run(async()=>{const r=await api('/admin/users',{method:'POST',body:f});setSecret(r.temporaryPassword);setAdd(false);setF({name:'',email:'',role:'teacher',school_id:''})})}}>
      <div className="grid"><label>{a.name}<input value={f.name} onChange={e=>setF({...f,name:e.target.value})} required/></label>
        <label>{a.email}<input type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} required/></label>
        <label>{a.role}<select value={f.role} onChange={e=>setF({...f,role:e.target.value})}>{ROLES.map(r=><option key={r} value={r}>{a['r_'+r]}</option>)}</select></label>
        {needsSchool(f.role)&&<label>{a.school}<select value={f.school_id} onChange={e=>setF({...f,school_id:e.target.value})} required><option value=""/>{schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}</div>
      <button className="btn" style={{marginTop:10}}>{a.create}</button></form>}
    {edit&&<form className="card-form" onSubmit={e=>{e.preventDefault();run(async()=>{await api('/admin/users/'+edit.id,{method:'PATCH',body:{name:edit.name,role:edit.role,school_id:needsSchool(edit.role)?(edit.school_id||null):null}});setEdit(null)})}}>
      <h3>{a.editUser}: {edit.email}</h3>
      <div className="grid"><label>{a.name}<input value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})} required/></label>
        <label>{a.role}<select value={edit.role} disabled={edit.id===user.id} onChange={e=>setEdit({...edit,role:e.target.value})}>{ROLES.map(r=><option key={r} value={r}>{a['r_'+r]}</option>)}</select></label>
        {needsSchool(edit.role)&&<label>{a.school}<select value={edit.school_id||''} onChange={e=>setEdit({...edit,school_id:e.target.value})}><option value="">{a.noSchool}</option>{schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}</div>
      <div style={{marginTop:10}}><button className="btn">{a.save}</button> <button type="button" className="btn ghost" onClick={()=>setEdit(null)}>{a.cancel}</button></div></form>}
    {!d?<p>{a.loading}</p>:!d.rows.length?<p>{a.noResults}</p>:<>
      <div className="tw"><table><tbody><tr><th>{a.name}</th><th>{a.role}</th><th>{a.status}</th><th>{a.school}</th><th>{a.created}</th><th>{a.actions}</th></tr>
        {d.rows.map(u=><tr key={u.id}><td>{u.name}<br/><small>{u.email}</small></td><td style={{fontWeight:400}}>{a['r_'+u.role]}</td>
          <td><Badge kind={u.status}>{a['s_'+u.status]}</Badge></td><td style={{fontWeight:400}}>{u.school||'–'}</td>
          <td style={{fontWeight:400}}>{new Date(u.created_at).toLocaleDateString()}</td>
          <td className="acts">
            {u.status==='pending'&&<button className="btn sm" onClick={()=>patch(u,{status:'active'})}>{a.approve}</button>}
            {u.status==='active'&&u.id!==user.id&&<button className="btn ghost sm" onClick={()=>patch(u,{status:'disabled'},a.confirmDisable)}>{a.disable}</button>}
            {u.status==='disabled'&&<button className="btn sm" onClick={()=>patch(u,{status:'active'})}>{a.enable}</button>}
            <button className="btn ghost sm" onClick={()=>setEdit({id:u.id,name:u.name,email:u.email,role:u.role,school_id:u.school_id})}>{a.edit}</button>
            <button className="btn ghost sm" onClick={()=>{if(confirm(a.confirmReset))run(async()=>{const r=await api('/admin/users/'+u.id+'/reset-password',{method:'POST'});setSecret(r.temporaryPassword)})}}>{a.resetPw}</button>
            {u.id!==user.id&&<button className="btn ghost sm danger" onClick={()=>{if(confirm(a.confirmDelete))run(()=>api('/admin/users/'+u.id,{method:'DELETE'}))}}>{a.delete}</button>}
          </td></tr>)}</tbody></table></div>
      <Pager page={d.page} total={d.total} size={d.size} onPage={setPage}/></>}
  </>;
}
