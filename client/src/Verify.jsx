import {useState,useEffect} from 'react';
import {api} from './api';
import {useT} from './i18n';
import LangSwitch from './LangSwitch';
// Public page opened by scanning the QR code on a certificate. No login needed.
export default function Verify({code}){
  const {t}=useT();
  const [c,setC]=useState(null),[bad,setBad]=useState(false);
  useEffect(()=>{setC(null);setBad(false);api('/verify/'+encodeURIComponent(code)).then(setC).catch(()=>setBad(true))},[code]);
  const rows=c?[[t.name,c.name],[t.school,c.school],[t.trade,c.trade],['RQF',c.rqf],[t.companyName,c.company],[t.dates,`${c.start} → ${c.end}`],[t.issuedOn,new Date(c.issued_at).toLocaleDateString()]]:[];
  return <div className="auth"><div className="card"><div className="flag"/><LangSwitch/>
    <h2>{t.verifyTitle}</h2><p className="sub">{t.title} · {t.sub}</p>
    {!c&&!bad&&<p>{t.checking}</p>}
    {bad&&<p className="err" role="alert">{t.invalid}</p>}
    {c&&<><p className="okmsg" role="status">✔ {t.valid}</p>
      <div className="tw"><table><tbody>{rows.map(([k,v])=><tr key={k}><td>{k}</td><td style={{fontWeight:400}}>{v||'–'}</td></tr>)}</tbody></table></div></>}
    <p><small>Code: {code}</small></p>
    <a className="btn ghost" href="#/" onClick={()=>{location.hash=''}}>{t.login}</a>
  </div></div>;
}
