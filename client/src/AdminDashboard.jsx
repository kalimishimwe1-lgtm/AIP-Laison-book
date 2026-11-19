import {useState} from 'react';
import {useA} from './admin/text';
import LangSwitch from './LangSwitch';
import Overview from './admin/Overview';
import Users from './admin/Users';
import Schools from './admin/Schools';
import Learners from './admin/Learners';
import Certificates from './admin/Certificates';
import Reports from './admin/Reports';
import Settings from './admin/Settings';
import Activity from './admin/Activity';

const TABS=['overview','users','schools','learners','certificates','reports','settings','activity'];
export default function AdminDashboard({user,onLogout,onSettings}){
  const a=useA();const [nav,setNav]=useState({tab:'overview',p:{},n:0});
  const go=(tab,p={})=>setNav(x=>({tab,p,n:x.n+1}));
  const k=nav.tab+nav.n;
  return <div className="app admin">
    <aside className="side np"><div className="flag"/><h1>{a.title}</h1><p><small>{user.name}<br/>{a.adminRole}</small></p>
      <nav>{TABS.map(t=><button key={t} className={nav.tab===t?'on':''} onClick={()=>go(t)}>{a['nav_'+t]}</button>)}</nav>
      <LangSwitch/><button className="btn ghost" onClick={onLogout}>⏻</button></aside>
    <main className="main">
      {nav.tab==='overview'&&<Overview key={k} go={go}/>}
      {nav.tab==='users'&&<Users key={k} preset={nav.p} user={user}/>}
      {nav.tab==='schools'&&<Schools key={k}/>}
      {nav.tab==='learners'&&<Learners key={k}/>}
      {nav.tab==='certificates'&&<Certificates key={k}/>}
      {nav.tab==='reports'&&<Reports key={k}/>}
      {nav.tab==='settings'&&<Settings key={k} onSaved={onSettings}/>}
      {nav.tab==='activity'&&<Activity key={k} preset={nav.p}/>}
    </main></div>;
}
