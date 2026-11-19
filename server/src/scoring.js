// Server-side copy of the client's scoring rules (client/src/scoring.js). Keep the two in sync.
// [points for the group, number of statements]
const G=[[15,4],[15,4],[20,4],[15,3],[15,3],[10,2],[10,2]];
const num=v=>parseFloat(v);
export function summarize(d={}){
  let days=0,hours=0,tot=0;
  for(let w=1;w<=4;w++)for(let i=0;i<6;i++){
    if(d[`a${w}${i}s`])days++;
    for(let k=1;k<=3;k++){const x=num(d[`r${w}${i}${k}h`]);if(x>0)hours+=x}
  }
  G.forEach(([pts,n],gi)=>{let s=0,c=0;for(let i=0;i<n;i++){const x=num(d[`e${gi}_${i}`]);if(!isNaN(x)){s+=x;c++}}if(c)tot+=s/(n*5)*pts});
  let qs=0,qk=0;for(let i=0;i<4;i++){const x=num(d['q'+i]);if(!isNaN(x)){qs+=x;qk++}}
  const work=tot/2,rep=qk?qs/20*30:0,theory=Math.min(20,Math.max(0,num(d.m_theory)||0));
  const r1=x=>Math.round(x*10)/10;
  return {days,hours:r1(hours),evalScore:r1(tot),finalMark:r1(theory+work+rep)};
}
