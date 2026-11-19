import crypto from 'node:crypto';
import {DEFAULTS} from './settingsDefaults.js';

export const ROLES=['learner','teacher','company','admin'];
export const STATUSES=['active','pending','disabled'];

// Returns an error message, or null when the change is allowed.
export function checkUserChange({actorId,target,changes,activeAdmins}){
  const leavesAdmin=changes.role!==undefined&&changes.role!=='admin';
  const stopsActive=changes.status!==undefined&&changes.status!=='active';
  if(target.id===actorId){
    if(stopsActive)return 'You cannot disable your own account.';
    if(leavesAdmin)return 'You cannot remove your own administrator role.';
  }
  if(target.role==='admin'&&target.status==='active'&&activeAdmins<=1&&(leavesAdmin||stopsActive))
    return 'At least one active administrator is required.';
  return null;
}
export function checkUserDelete({actorId,target,activeAdmins}){
  if(target.id===actorId)return 'You cannot delete your own account.';
  if(target.role==='admin'&&target.status==='active'&&activeAdmins<=1)return 'At least one active administrator is required.';
  return null;
}

// 12 characters, no look-alike letters (0/O, 1/l/I), shown to the admin once.
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
export function genPassword(len=12){
  let s='';for(let i=0;i<len;i++)s+=ALPHABET[crypto.randomInt(ALPHABET.length)];
  return s;
}

// Only known keys, valid values. Returns {values} or {error}.
export function cleanSettings(input){
  const out={};
  for(const k of Object.keys(DEFAULTS)){
    if(input?.[k]===undefined)continue;
    if(k==='announcement'){
      const t=String(input[k]).replace(/\s+/g,' ').trim();
      if(t.length>300)return {error:'The announcement can have at most 300 characters.'};
      out[k]=t;
    }else{
      const v=input[k];
      if(![true,false,'1','0',1,0].includes(v))return {error:'Invalid value for '+k+'.'};
      out[k]=(v===true||v==='1'||v===1)?'1':'0';
    }
  }
  return {values:out};
}

// Escape % and _ so a search term is matched literally in LIKE.
export const like=s=>'%'+String(s).replace(/[\\%_]/g,'\\$&')+'%';
// Spreadsheet programs run cells that start with = + - @ as formulas.
export function csvCell(v){
  let s=v==null?'':String(v);
  if(/^[=+\-@\t\r]/.test(s))s="'"+s;
  return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
}
export const page=(q,size=25)=>{const p=Math.max(1,parseInt(q)||1);return {limit:size,offset:(p-1)*size,page:p}};
