import {useData,Err,Tile} from './parts';
import {useA} from './text';
export default function Overview({go}){
  const a=useA();const {d,err}=useData('/admin/overview');
  if(err)return <Err e={err}/>;if(!d)return <p>{a.loading}</p>;
  const att=[[d.attention.pendingTeachers,a.pendingTeachers,'users',{status:'pending'}],[d.attention.unverifiedSchools,a.unverifiedSchools,'schools',{}],[d.attention.failedLogins24h,a.failedLogins,'activity',{action:'login_failed'}]].filter(x=>x[0]>0);
  const u=d.users,x=d.activity,s=d.system;
  return <>
    <h2>{a.nav_overview}</h2><p className="sub"/>
    <h3>{a.needsAttention}</h3>
    {!att.length?<p className="okmsg">✔ {a.allClear}</p>:<div className="tw"><table><tbody>
      {att.map(([n,t,tab,p])=><tr key={t}><td style={{width:80}}><b>{n}</b></td><td style={{fontWeight:400}}>{t}</td><td style={{width:140}}><button className="btn sm" onClick={()=>go(tab,p)}>{a.review}</button></td></tr>)}</tbody></table></div>}
    <h3>{a.accounts}</h3>
    <div className="stats">
      <Tile label={a.learners} value={u.learners} color="#1f4e9c" onClick={()=>go('learners')}/>
      <Tile label={a.teachers} value={u.teachers} color="#0a8f4a" onClick={()=>go('users',{role:'teacher'})}/>
      <Tile label={a.companies} value={u.companies} color="#fad201" onClick={()=>go('users',{role:'company'})}/>
      <Tile label={a.admins} value={u.admins} color="#0f2a5c" onClick={()=>go('users',{role:'admin'})}/>
      <Tile label={a.disabled} value={u.disabled} color="#c0392b" onClick={()=>go('users',{status:'disabled'})}/></div>
    <h3>{a.progress}</h3>
    <div className="stats">
      <Tile label={a.schoolsN} value={x.schools} color="#1f4e9c"/>
      <Tile label={a.booksStarted} value={x.booksStarted} color="#0a8f4a"/>
      <Tile label={a.withFinalMark} value={x.withFinalMark} color="#fad201"/>
      <Tile label={a.certIssued} value={x.certificates} color="#0f2a5c"/>
      <Tile label={a.logins24} value={x.logins24} color="#1f4e9c"/>
      <Tile label={a.edited7} value={x.editedLast7Days} color="#0a8f4a"/></div>
    <h3>{a.system}</h3>
    <div className="tw"><table><tbody>
      <tr><td className={s.maintenance?'err':''} style={{fontWeight:400}}>{s.maintenance?a.maintenanceOn:a.maintenanceOff}</td><td style={{width:200}}><button className="btn ghost sm" onClick={()=>go('settings')}>{a.manageSettings}</button></td></tr>
      <tr><td style={{fontWeight:400}}>{s.registrationOpen?a.regOpen:a.regClosed}</td><td/></tr>
      <tr><td style={{fontWeight:400}}>{a.uptime}: {s.uptimeHours} · Node {s.node}</td><td/></tr></tbody></table></div>
  </>;
}
