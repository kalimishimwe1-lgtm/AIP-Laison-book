import {createContext,useContext} from 'react';
import {useT} from './i18n';
export const Ctx=createContext();
export const useS=()=>useContext(Ctx);
export const Tx=({children})=>{const {tr}=useT();return tr(children)};
export function Inp({k,label,type='text',...r}){
  const {S,set}=useS();const {tr}=useT();
  const i=<input type={type} value={S[k]??''} onChange={e=>set(k,e.target.value)} {...r}/>;
  return label?<label>{tr(label)}{i}</label>:i;
}
export function Sel({k,options}){
  const {S,set}=useS();const {tr}=useT();
  return <select value={S[k]??''} onChange={e=>set(k,e.target.value)}><option value=""></option>
    {options.map(o=>{const [val,txt]=Array.isArray(o)?o:[o,o];return <option key={val} value={val}>{tr(String(txt))}</option>})}</select>;
}
export function Area({k,label}){
  const {S,set}=useS();const {tr}=useT();
  return <label>{tr(label)}<textarea value={S[k]??''} onChange={e=>set(k,e.target.value)}/></label>;
}
export function Check({k,label}){
  const {S,set}=useS();const {tr}=useT();
  return <label><input type="checkbox" style={{width:'auto'}} checked={!!S[k]} onChange={e=>set(k,e.target.checked)}/> {tr(label)}</label>;
}
export const Box=({t,children})=>{const {tr}=useT();return <fieldset><legend>{tr(t)}</legend>{children}</fieldset>};
export const Head=({t,sub})=>{const {tr}=useT();return <><h2>{tr(t)}</h2><p className="sub">{tr(sub)}</p></>};
