import {useT} from './i18n';
export default function LangSwitch(){
  const {lang,setLang}=useT();
  return <div className="lang np" role="group" aria-label="Language">
    {[['rw','Kinyarwanda'],['en','English']].map(([k,n])=><button key={k} type="button" className={lang===k?'on':''} onClick={()=>setLang(k)}>{n}</button>)}</div>;
}
