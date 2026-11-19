import {useState} from 'react';
import {downloadFile} from '../api';
import {useA} from './text';
import {useData,qs,Err} from './parts';
export default function Reports(){
  const a=useA();const [dist,setDist]=useState('');const {d,err}=useData('/admin/reports?'+qs({district:dist}));const [m,setM]=useState('');
  const rows=d?.schools||[];
  return <><h2>{a.reportTitle}</h2><p className="sub"/><Err e={m||err}/>
    <div className="toolbar np"><select style={{width:'auto'}} value={dist} onChange={e=>setDist(e.target.value)}><option value="">{a.allDistricts}</option>{(d?.districts||[]).map(x=><option key={x}>{x}</option>)}</select>
      <button className="btn" onClick={()=>downloadFile('/admin/reports/export.xlsx?'+qs({district:dist}),'iap-report.xlsx').catch(e=>setM(e.message))}>{a.exportXlsx}</button>
      <button className="btn ghost" onClick={()=>window.print()}>{a.print}</button></div>
    {!d?<p>{a.loading}</p>:<div className="tw"><table><tbody><tr><th>{a.school}</th><th>{a.district}</th><th>{a.learnersCol}</th><th>{a.started}</th><th>{a.withFinalMark}</th><th>{a.avgHours}</th><th>{a.avgFinal}</th></tr>
      {rows.map((r,i)=><tr key={i}><td>{r.name}</td><td style={{fontWeight:400}}>{r.district||'–'}</td><td style={{fontWeight:400}}>{r.learners}</td><td style={{fontWeight:400}}>{r.started}</td><td style={{fontWeight:400}}>{r.marked}</td><td style={{fontWeight:400}}>{r.avg_hours??'–'}</td><td style={{fontWeight:400}}>{r.avg_final??'–'}</td></tr>)}</tbody></table></div>}</>;
}
