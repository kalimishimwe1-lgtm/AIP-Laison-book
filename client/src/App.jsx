import {useState,useEffect} from 'react';
import {api,setToken,hasToken} from './api';
import Auth from './Auth';
import Dashboard from './Dashboard';
import Book from './Book';
import AdminDashboard from './AdminDashboard';
import Verify from './Verify';
import {LangCtx,initialLang,saveLang,useT} from './i18n';
export default function App(){
  const [user,setUser]=useState(null);
  const [ready,setReady]=useState(!hasToken());
  const [open,setOpen]=useState(null);
  const [lang,setL]=useState(initialLang);
  const setLang=l=>{setL(l);saveLang(l)};
  const [hash,setHash]=useState(location.hash);
  useEffect(()=>{const h=()=>setHash(location.hash);window.addEventListener('hashchange',h);return()=>window.removeEventListener('hashchange',h)},[]);
  const remember=u=>{try{u?localStorage.setItem('iapUser',JSON.stringify(u)):localStorage.removeItem('iapUser')}catch(e){}};
  const login=u=>{remember(u);setUser(u)};
  useEffect(()=>{if(hasToken())api('/auth/me').then(r=>{remember(r.user);setUser(r.user)})
    .catch(e=>{
      if(e.status===401){setToken('');remember(null)}
      else{try{setUser(JSON.parse(localStorage.getItem('iapUser')))}catch(x){}} // no internet: keep the saved session
    }).finally(()=>setReady(true))},[]);
  useEffect(()=>{const f=()=>{setToken('');remember(null);setUser(null);setOpen(null)};window.addEventListener('iap-unauthorized',f);return()=>window.removeEventListener('iap-unauthorized',f)},[]);
  const [site,setSite]=useState({});
  const loadSite=()=>fetch((import.meta.env.VITE_API_URL||'/api')+'/settings').then(r=>r.json()).then(setSite).catch(()=>{});
  useEffect(()=>{loadSite()},[user]);
  const logout=()=>{setToken('');remember(null);setUser(null);setOpen(null)};
  const view=()=>{
    if(hash.startsWith('#/verify/'))return <Verify code={decodeURIComponent(hash.slice(9))}/>;
    if(!ready)return <p style={{padding:24}}>…</p>;
    if(!user)return <Auth onAuth={login}/>;
    if(user.role==='admin')return <AdminDashboard user={user} onLogout={logout} onSettings={loadSite}/>;
    if(user.role==='learner')return <Book path="/books/me" role="learner" onLogout={logout}/>;
    if(open)return <Book path={'/books/'+open.id} title={open.name} role={user.role} onBack={()=>setOpen(null)} onLogout={logout}/>;
    return <Dashboard user={user} onOpen={setOpen} onLogout={logout}/>;
  };
  return <LangCtx.Provider value={{lang,setLang}}><Banner site={site} admin={user?.role==='admin'}/>{view()}</LangCtx.Provider>;
}

function Banner({site,admin}){
  useT();
  if(!site.announcement&&!(site.maintenance&&admin))return null;
  return <div className="banner np" role="status">{site.maintenance&&admin&&<b>⚠ Maintenance ON. </b>}{site.announcement}</div>;
}
