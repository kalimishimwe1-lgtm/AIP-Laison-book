import crypto from 'node:crypto';
import {Router} from 'express';
import ExcelJS from 'exceljs';
import {pool,audit} from './db.js';
import {requireAuth} from './auth.js';

export async function schoolRows(district){
  const [rows]=await pool.query(`SELECT s.id,s.name,s.district,COUNT(u.id) AS learners,
      COALESCE(SUM(b.days_recorded>0),0) AS started,COALESCE(SUM(b.final_mark>0),0) AS marked,
      ROUND(AVG(b.hours),1) AS avg_hours,ROUND(AVG(NULLIF(b.final_mark,0)),1) AS avg_final
    FROM schools s LEFT JOIN users u ON u.school_id=s.id AND u.role='learner' LEFT JOIN books b ON b.learner_id=u.id
    ${district?'WHERE s.district=?':''} GROUP BY s.id ORDER BY s.district,s.name`,district?[district]:[]);
  return rows.map(r=>({...r,started:+r.started,marked:+r.marked}));
}
async function learnerRows(district){
  const [rows]=await pool.query(`SELECT u.name,u.email,s.name AS school,s.district,JSON_UNQUOTE(JSON_EXTRACT(b.data,'$.l_trade')) AS trade,
      JSON_UNQUOTE(JSON_EXTRACT(b.data,'$.c_name')) AS company,b.days_recorded,b.hours,b.eval_score,b.final_mark
    FROM users u JOIN books b ON b.learner_id=u.id LEFT JOIN schools s ON s.id=u.school_id WHERE u.role='learner'
    ${district?'AND s.district=?':''} ORDER BY s.district,s.name,u.name`,district?[district]:[]);
  return rows;
}

const r=Router();
r.use(requireAuth(['admin']));
r.get('/',async(req,res)=>{
  const [d]=await pool.query("SELECT DISTINCT district FROM schools WHERE district IS NOT NULL ORDER BY district");
  res.json({districts:d.map(x=>x.district),schools:await schoolRows(String(req.query.district||''))});
});
r.get('/export.xlsx',async(req,res)=>{
  const district=String(req.query.district||'');
  const wb=new ExcelJS.Workbook();wb.creator='IAP Liaison Book';wb.created=new Date();
  const a=wb.addWorksheet('Schools');
  a.columns=[['School','name',34],['District','district',16],['Learners','learners',10],['Started','started',10],['With final mark','marked',16],['Avg hours','avg_hours',11],['Avg final mark','avg_final',15]].map(([header,key,width])=>({header,key,width}));
  (await schoolRows(district)).forEach(x=>a.addRow(x));
  const b=wb.addWorksheet('Learners');
  b.columns=[['Learner','name',26],['Email','email',30],['School','school',30],['District','district',16],['Trade','trade',20],['Company','company',26],['Days recorded','days_recorded',14],['Hours','hours',9],['Company evaluation /100','eval_score',22],['Final mark /100','final_mark',16]].map(([header,key,width])=>({header,key,width}));
  (await learnerRows(district)).forEach(x=>b.addRow({...x,hours:+x.hours,eval_score:+x.eval_score,final_mark:+x.final_mark}));
  [a,b].forEach(w=>{w.getRow(1).font={bold:true};w.views=[{state:'frozen',ySplit:1}]});
  await audit(req,'report_exported',district||'all');
  res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition','attachment; filename="iap-report.xlsx"');
  res.send(Buffer.from(await wb.xlsx.writeBuffer()));
});
r.get('/audit',async(req,res)=>{
  const [rows]=await pool.query(`SELECT a.id,a.action,a.detail,a.ip,a.created_at,u.name FROM audit_log a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 50`);
  res.json({rows});
});
export default r;

// Read-only aggregates for RTB systems. Enabled only when RTB_API_KEY is set. No personal data.
export const integration=Router();
integration.get('/summary',async(req,res)=>{
  const key=process.env.RTB_API_KEY;
  const got=Buffer.from(String(req.headers['x-api-key']||'')),want=Buffer.from(String(key||''));
  if(!key||got.length!==want.length||!crypto.timingSafeEqual(got,want))return res.status(401).json({error:'Invalid API key.'});
  res.json({generated_at:new Date().toISOString(),schools:await schoolRows(String(req.query.district||''))});
});
