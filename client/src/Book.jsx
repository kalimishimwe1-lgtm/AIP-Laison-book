import {useState} from 'react';
import {Ctx} from './ui';
import {useStore} from './store';
import {calc} from './scoring';
import {useT} from './i18n';
import LangSwitch from './LangSwitch';
import {Profile,Competences,Attendance,Weekly,Evaluation,Visit,SelfAssessment,Interview,Certificate} from './sections';
const pages=[Profile,Competences,Attendance,Weekly,Evaluation,Visit,SelfAssessment,Interview,Certificate];
export default function Book({path,title,role,onBack,onLogout}){
  const {t}=useT();
  const tabs=t.tabs;
  const label={loading:t.loading,saving:t.saving,saved:t.saved,error:t.error,offline:t.offline};
  const store=useStore(path);
  const {S,status}=store;
  const c=calc(S);
  const [tab,setTab]=useState(()=>{try{return +localStorage.getItem('iapTab')||0}catch(e){return 0}});
  const go=i=>{setTab(i);try{localStorage.setItem('iapTab',i)}catch(e){}window.scrollTo(0,0)};
  const Page=pages[tab];
  const tiles=[[t.days,c.att.n,'','#1f4e9c'],[t.hours,c.T,'h','#0a8f4a'],[t.eval,Math.round(c.tot),'/100','#fad201'],[t.final,Math.round(c.final),'/100','#0f2a5c']];
  if(status==='loading')return <p style={{padding:24}}>{t.loading}</p>;
  return <Ctx.Provider value={{...store,role}}>
    <div className="app">
      <aside className="side">
        <div className="flag"/>
        <div className="brand"><h1>{t.title}</h1><p>{t.sub}</p></div>
        <nav>{tabs.map((t,i)=><button key={t} className={'nb'+(i===tab?' on':'')} onClick={()=>go(i)}><span className="n">{i+1}</span><span>{t}</span></button>)}</nav>
        <div className="who">{S.l_name||title||'Learner not set'}<small>{S.l_trade||'Add details in Profile'}</small></div>
      </aside>
      <main className="main">
        <LangSwitch/><p className={'status np '+status} role="status">{title&&`Viewing ${title} · `}{label[status]}</p>
        <div className="stats">{tiles.map(([l,n,u,col])=><div className="tile" key={l} style={{'--c':col}}><span>{l}</span><b>{n}<small>{u&&(u==='h'?' h':' '+u)}</small></b></div>)}</div>
        <section className="on"><Page/></section>
        <p className="np" style={{marginTop:28}}>
          {onBack&&<><button className="btn ghost" disabled={status==='saving'} onClick={onBack}>{t.back}</button>{' '}</>}
          <button className="btn ghost" onClick={()=>window.print()}>{t.print}</button>{' '}
          {!onBack&&<button className="btn ghost" onClick={()=>{if(confirm('Delete everything in your book? This cannot be undone.')){store.reset();go(0)}}}>{t.clear}</button>}{' '}
          <button className="btn ghost" disabled={status==='saving'} onClick={onLogout}>{t.logout}</button></p>
      </main>
    </div>
  </Ctx.Provider>;
}
