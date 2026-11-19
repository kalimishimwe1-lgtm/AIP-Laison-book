import {G,V,st} from './data';
const num=(S,k)=>parseFloat(S[k]);
export function calc(S){
  const att={n:0};st.forEach(s=>att[s]=0);
  for(let w=1;w<=4;w++)for(let i=0;i<6;i++){const s=S[`a${w}${i}s`];if(s){att[s]++;att.n++}}
  const wh=[0];let T=0;
  for(let w=1;w<=4;w++){let t=0;for(let i=0;i<6;i++)for(let k=1;k<=3;k++){const x=num(S,`r${w}${i}${k}h`);if(x)t+=x}wh[w]=t;T+=t}
  let tot=0;
  const es=G.map((g,gi)=>{let s=0,k=0;g[3].forEach((_,i)=>{const x=num(S,`e${gi}_${i}`);if(!isNaN(x)){s+=x;k++}});const p=k?s/(g[3].length*5)*g[2]:0;tot+=p;return {p,k,max:g[2]}});
  let vs=0,vk=0;V.forEach((g,gi)=>g[1].forEach((_,i)=>{const x=num(S,`v${gi}_${i}`);if(x){vs+=x;vk++}}));
  let qs=0,qk=0;for(let i=0;i<4;i++){const x=num(S,'q'+i);if(!isNaN(x)){qs+=x;qk++}}
  const work=tot/2,rep=qk?qs/20*30:0,theory=num(S,'m_theory')||0;
  return {att,wh,T,es,tot,vavg:vk?vs/vk:null,work,rep,hasQ:qk>0,final:theory+work+rep};
}
