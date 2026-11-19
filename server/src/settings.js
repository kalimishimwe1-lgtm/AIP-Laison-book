import {pool} from './db.js';
import {DEFAULTS} from './settingsDefaults.js';
export {DEFAULTS};
let cache=null,at=0;
export async function getSettings(){
  if(cache&&Date.now()-at<5000)return cache;
  const [rows]=await pool.query('SELECT k,v FROM settings');
  cache={...DEFAULTS,...Object.fromEntries(rows.map(r=>[r.k,r.v]))};at=Date.now();
  return cache;
}
export async function saveSettings(obj){
  for(const [k,v] of Object.entries(obj))
await pool.query('INSERT INTO settings(k,v) VALUES(?,?) ON DUPLICATE KEY UPDATE v=VALUES(v)',[k,v]);  cache=null;
}
