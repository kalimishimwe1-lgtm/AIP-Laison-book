import {useState,useEffect,useCallback} from 'react';
import {api} from '../api';
import {useA} from './text';

export function useData(path){
  const [d,setD]=useState(null),[err,setErr]=useState('');
  const load=useCallback(()=>api(path).then(x=>{setD(x);setErr('')}).catch(e=>setErr(e.message)),[path]);
  useEffect(()=>{load()},[load]);
  return {d,err,load};
}
export const qs=o=>Object.entries(o).filter(([,v])=>v!==''&&v!==undefined&&v!==null).map(([k,v])=>k+'='+encodeURIComponent(v)).join('&');
export const Err=({e})=>e?<p className="err" role="alert">{e}</p>:null;
export const Badge=({kind,children})=><span className={'badge '+kind}>{children}</span>;
export const Tile=({label,value,color,onClick})=><div className="tile" style={{'--c':color}}><span>{label}</span><b>{value}</b>{onClick&&<button className="btn ghost sm" onClick={onClick}>→</button>}</div>;

export function Pager({page,total,size,onPage}){
  const a=useA();const pages=Math.max(1,Math.ceil(total/size));
  return <div className="pager np"><span>{total} {a.total}</span>
    <button className="btn ghost sm" disabled={page<=1} onClick={()=>onPage(page-1)}>{a.prev}</button>
    <span>{a.page} {page} / {pages}</span>
    <button className="btn ghost sm" disabled={page>=pages} onClick={()=>onPage(page+1)}>{a.next}</button></div>;
}
// Shows a one-time temporary password.
export function Secret({value,onClose}){
  const a=useA();const [ok,setOk]=useState(false);
  return <div className="secret" role="status"><h3>{a.tempTitle}</h3><p>{a.tempNote}</p>
    <code>{value}</code>
    <div><button className="btn" onClick={()=>{try{navigator.clipboard.writeText(value);setOk(true)}catch(e){}}}>{ok?a.copied:a.copy}</button>{' '}
    <button className="btn ghost" onClick={onClose}>{a.close}</button></div></div>;
}
export function useSchools(){
  const [s,setS]=useState([]);
  useEffect(()=>{api('/admin/schools').then(r=>setS(r.schools)).catch(()=>{})},[]);
  return s;
}
export function useDebounced(v,ms=300){
  const [x,setX]=useState(v);
  useEffect(()=>{const t=setTimeout(()=>setX(v),ms);return()=>clearTimeout(t)},[v,ms]);
  return x;
}
