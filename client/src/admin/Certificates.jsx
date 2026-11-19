import {useState} from 'react';
import {api} from '../api';
import {useA} from './text';
import {useData,Err,Badge} from './parts';
export default function Certificates(){
  const a=useA();const {d,err,load}=useData('/admin/certificates');const [msg,setMsg]=useState('');
  const act=async(c,what,ask)=>{if(ask&&!confirm(ask))return;setMsg('');try{await api(`/admin/certificates/${c}/${what}`,{method:'POST'});await load()}catch(e){setMsg(e.message)}};
  return <><h2>{a.nav_certificates}</h2><p className="sub"/><Err e={msg||err}/>
    {!d?<p>{a.loading}</p>:!d.rows.length?<p>{a.noResults}</p>:<div className="tw"><table><tbody><tr><th>{a.code}</th><th>{a.name}</th><th>{a.school}</th><th>{a.trade}</th><th>{a.issuedOn}</th><th>{a.status}</th><th>{a.actions}</th></tr>
      {d.rows.map(c=><tr key={c.code}><td><code>{c.code}</code></td><td style={{fontWeight:400}}>{c.name}</td><td style={{fontWeight:400}}>{c.school||'–'}</td><td style={{fontWeight:400}}>{c.trade||'–'}</td><td style={{fontWeight:400}}>{c.issued_at?new Date(c.issued_at).toLocaleDateString():''}</td>
        <td><Badge kind={c.revoked_at?'disabled':'active'}>{c.revoked_at?a.withdrawn:a.valid}</Badge></td>
        <td className="acts">{c.revoked_at?<button className="btn sm" onClick={()=>act(c.code,'restore')}>{a.restore}</button>:<button className="btn ghost sm danger" onClick={()=>act(c.code,'revoke',a.confirmRevoke)}>{a.revoke}</button>}</td></tr>)}</tbody></table></div>}</>;
}
