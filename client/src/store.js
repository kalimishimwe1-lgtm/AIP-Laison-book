import {useState,useEffect,useRef,useCallback} from 'react';
import {api} from './api';
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};

// Works with or without internet.
// - Every edit is kept in `pend` (also in localStorage) until the server confirms it.
// - Only the changed fields are sent (PATCH), so a supervisor's edits are never overwritten.
// - A full copy of the book is cached on the device, so it opens offline.
export function useStore(path){
  const pk='iapPend:'+path,ck='iapCache:'+path;
  const [S,setS]=useState({});
  const [status,setStatus]=useState('loading');
  const pend=useRef({});
  const sending=useRef(false);
  const timer=useRef(null);
  const replace=useRef(false);

  const flush=useCallback(async()=>{
    if(sending.current)return;
    if(!replace.current&&!Object.keys(pend.current).length){setStatus('saved');return}
    if(!navigator.onLine){setStatus('offline');return}
    sending.current=true;setStatus('saving');
    const snap={...pend.current},wasReplace=replace.current;
    try{
      await api(path,{method:wasReplace?'PUT':'PATCH',body:wasReplace?{data:{}}:{changes:snap}});
      if(wasReplace)replace.current=false;
      for(const k of Object.keys(snap))if(pend.current[k]===snap[k])delete pend.current[k];
      write(pk,{pend:pend.current,replace:replace.current});
      sending.current=false;
      if(Object.keys(pend.current).length||replace.current)return flush();
      setStatus('saved');
    }catch(e){
      sending.current=false;
      setStatus(e.status&&e.status<500?'error':(navigator.onLine?'error':'offline'));
    }
  },[path]);

  const later=useCallback((ms=700)=>{clearTimeout(timer.current);timer.current=setTimeout(flush,ms)},[flush]);

  useEffect(()=>{
    let live=true;
    const saved=read(pk,{pend:{},replace:false});
    pend.current=saved.pend||{};replace.current=!!saved.replace;
    setStatus('loading');
    api(path).then(r=>{
      if(!live)return;
      const base=replace.current?{}:(r.data||{});
      const merged={...base,...pend.current};
      setS(merged);write(ck,merged);
      if(Object.keys(pend.current).length||replace.current)flush();else setStatus('saved');
    }).catch(e=>{
      if(!live)return;
      const cached=read(ck,null);
      if(cached&&!(e.status&&e.status<500)){setS({...cached,...pend.current});setStatus('offline')}
      else setStatus('error');
    });
    const on=()=>flush();
    window.addEventListener('online',on);
    return()=>{live=false;clearTimeout(timer.current);window.removeEventListener('online',on)};
  },[path]);

  const set=(k,v)=>{
    pend.current[k]=v;write(pk,{pend:pend.current,replace:replace.current});
    setS(p=>{const n={...p,[k]:v};write(ck,n);return n});
    setStatus(navigator.onLine?'saving':'offline');later();
  };
  const reset=()=>{
    pend.current={};replace.current=true;write(pk,{pend:{},replace:true});
    setS({});write(ck,{});later(0);
  };
  return {S,status,set,reset,path};
}
