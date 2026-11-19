const API=import.meta.env.VITE_API_URL||'/api';
let token='';
try{token=localStorage.getItem('iapToken')||''}catch(e){}
export const setToken=t=>{token=t;try{t?localStorage.setItem('iapToken',t):localStorage.removeItem('iapToken')}catch(e){}};
export const hasToken=()=>!!token;
export async function api(path,{method='GET',body}={}){
  let r;
  try{
    r=await fetch(API+path,{method,headers:{'Content-Type':'application/json',...(token&&{Authorization:'Bearer '+token})},body:body&&JSON.stringify(body)});
  }catch(e){
    throw new Error('Cannot reach the server. Start the backend (npm run dev in the server folder).');
  }
  const j=await r.json().catch(()=>({}));
  if(!r.ok){
    if(r.status===401&&token&&!path.startsWith('/auth/'))window.dispatchEvent(new Event('iap-unauthorized'));
    if(r.status===503&&j.maintenance)window.dispatchEvent(new Event('iap-maintenance'));
    const fallback=r.status>=500?'Cannot reach the server or database. Start the backend and MySQL, then try again.':'Request failed.';
    throw Object.assign(new Error(j.error||fallback),{status:r.status});
  }
  return j;
}

// Downloads a file the API protects with the login token (e.g. the Excel report).
export async function downloadFile(path,filename){
  const r=await fetch(API+path,{headers:token?{Authorization:'Bearer '+token}:{}});
  if(!r.ok)throw new Error('Download failed.');
  const a=document.createElement('a');a.href=URL.createObjectURL(await r.blob());a.download=filename;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
}
