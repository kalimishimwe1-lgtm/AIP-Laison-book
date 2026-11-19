import {Router} from 'express';
import bcrypt from 'bcryptjs';
import {pool,audit} from './db.js';
import {requireAuth,forget} from './auth.js';
import {getSettings,saveSettings} from './settings.js';
import {ROLES,STATUSES,checkUserChange,checkUserDelete,genPassword,cleanSettings,like,csvCell,page} from './adminRules.js';

const r=Router();
r.use(requireAuth(['admin']));
const id=req=>+req.params.id||0;
const activeAdmins=async()=>(await pool.query("SELECT COUNT(*) n FROM users WHERE role='admin' AND status='active'"))[0][0].n;
const userById=async i=>(await pool.query('SELECT id,name,email,role,status,school_id FROM users WHERE id=?',[i]))[0][0];
const school=async i=>(await pool.query('SELECT id FROM schools WHERE id=?',[i]))[0][0];

// ---------- overview ----------
r.get('/overview',async(req,res)=>{
  const [byRole]=await pool.query('SELECT role,status,COUNT(*) n FROM users GROUP BY role,status');
  const n=(role,status)=>+(byRole.find(x=>x.role===role&&(!status||x.status===status))?.n||0);
  const sum=role=>byRole.filter(x=>x.role===role).reduce((a,x)=>a+ +x.n,0);
  const one=async sql=>Object.values((await pool.query(sql))[0][0])[0];
  const cfg=await getSettings();
  res.json({
    users:{learners:sum('learner'),teachers:n('teacher','active'),companies:sum('company'),admins:n('admin','active'),disabled:byRole.filter(x=>x.status==='disabled').reduce((a,x)=>a+ +x.n,0)},
    attention:{
      pendingTeachers:n('teacher','pending'),
      unverifiedSchools:+await one('SELECT COUNT(*) FROM schools WHERE verified=0'),
      failedLogins24h:+await one("SELECT COUNT(*) FROM audit_log WHERE action='login_failed' AND created_at>NOW()-INTERVAL 1 DAY")
    },
    activity:{
      schools:+await one('SELECT COUNT(*) FROM schools'),
      booksStarted:+await one('SELECT COUNT(*) FROM books WHERE days_recorded>0'),
      withFinalMark:+await one('SELECT COUNT(*) FROM books WHERE final_mark>0'),
      certificates:+await one('SELECT COUNT(*) FROM certificates WHERE revoked_at IS NULL'),
      logins24h:+await one("SELECT COUNT(*) FROM audit_log WHERE action='login' AND created_at>NOW()-INTERVAL 1 DAY"),
      editedLast7Days:+await one('SELECT COUNT(*) FROM books WHERE updated_at>NOW()-INTERVAL 7 DAY')
    },
    system:{maintenance:cfg.maintenance==='1',registrationOpen:cfg.registration_open==='1',uptimeHours:Math.round(process.uptime()/360)/10,node:process.version,time:new Date().toISOString()}
  });
});

// ---------- users ----------
function userFilter(q){
  const w=[],p=[];
  if(q.q){w.push('(u.name LIKE ? OR u.email LIKE ?)');p.push(like(q.q),like(q.q))}
  if(ROLES.includes(q.role)){w.push('u.role=?');p.push(q.role)}
  if(STATUSES.includes(q.status)){w.push('u.status=?');p.push(q.status)}
  if(+q.school_id){w.push('u.school_id=?');p.push(+q.school_id)}
  return {where:w.length?'WHERE '+w.join(' AND '):'',p};
}
r.get('/users',async(req,res)=>{
  const {where,p}=userFilter(req.query),pg=page(req.query.page);
  const [[t]]=await pool.query(`SELECT COUNT(*) n FROM users u ${where}`,p);
  const [rows]=await pool.query(`SELECT u.id,u.name,u.email,u.role,u.status,u.created_at,u.school_id,s.name AS school
    FROM users u LEFT JOIN schools s ON s.id=u.school_id ${where} ORDER BY u.id DESC LIMIT ? OFFSET ?`,[...p,pg.limit,pg.offset]);
  res.json({rows,total:t.n,page:pg.page,size:pg.limit});
});
r.post('/users',async(req,res)=>{
  const b=req.body||{},name=String(b.name||'').trim(),email=String(b.email||'').trim().toLowerCase(),role=b.role;
  if(name.length<2||!/^\S+@\S+\.\S+$/.test(email)||!ROLES.includes(role))return res.status(400).json({error:'Enter a name, a valid email and a role.'});
  let sid=null;
  if(role==='learner'||role==='teacher'){
    if(!(await school(+b.school_id)))return res.status(400).json({error:'Choose a school for this account.'});
    sid=+b.school_id;
  }
  const password=genPassword();
  try{
    const [x]=await pool.query('INSERT INTO users(name,email,password_hash,role,school_id,status) VALUES(?,?,?,?,?,?)',[name,email,await bcrypt.hash(password,10),role,sid,'active']);
    if(role==='learner')await pool.query('INSERT INTO books(learner_id,data) VALUES(?,?)',[x.insertId,'{}']);
    await audit(req,'user_created',role+' '+email);
    res.status(201).json({id:x.insertId,temporaryPassword:password});
  }catch(e){if(e.code==='ER_DUP_ENTRY')return res.status(409).json({error:'That email is already registered.'});throw e}
});
r.patch('/users/:id',async(req,res)=>{
  const target=await userById(id(req));if(!target)return res.status(404).json({error:'User not found.'});
  const b=req.body||{},ch={};
  if(b.name!==undefined){ch.name=String(b.name).trim();if(ch.name.length<2)return res.status(400).json({error:'Enter the name.'})}
  if(b.role!==undefined){if(!ROLES.includes(b.role))return res.status(400).json({error:'Invalid role.'});ch.role=b.role}
  if(b.status!==undefined){if(!STATUSES.includes(b.status))return res.status(400).json({error:'Invalid status.'});ch.status=b.status}
  if(b.school_id!==undefined){
    if(b.school_id===null||b.school_id===''){ch.school_id=null}
    else{if(!(await school(+b.school_id)))return res.status(400).json({error:'School not found.'});ch.school_id=+b.school_id}
  }
  if(!Object.keys(ch).length)return res.status(400).json({error:'Nothing to change.'});
  const err=checkUserChange({actorId:req.user.id,target,changes:ch,activeAdmins:await activeAdmins()});
  if(err)return res.status(409).json({error:err});
  const cols=Object.keys(ch);
  await pool.query(`UPDATE users SET ${cols.map(c=>c+'=?').join(',')} WHERE id=?`,[...cols.map(c=>ch[c]),target.id]);
  if(ch.role==='learner')await pool.query('INSERT IGNORE INTO books(learner_id,data) VALUES(?,?)',[target.id,'{}']);
  forget(target.id);
  await audit(req,'user_updated',`user ${target.id}: ${cols.map(c=>c==='school_id'?'school':c+'='+ch[c]).join(', ')}`);
  res.json({ok:true});
});
r.post('/users/:id/reset-password',async(req,res)=>{
  const target=await userById(id(req));if(!target)return res.status(404).json({error:'User not found.'});
  const password=genPassword();
  await pool.query('UPDATE users SET password_hash=? WHERE id=?',[await bcrypt.hash(password,10),target.id]);
  await audit(req,'password_reset','user '+target.id);
  res.json({temporaryPassword:password});
});
r.delete('/users/:id',async(req,res)=>{
  const target=await userById(id(req));if(!target)return res.status(404).json({error:'User not found.'});
  const err=checkUserDelete({actorId:req.user.id,target,activeAdmins:await activeAdmins()});
  if(err)return res.status(409).json({error:err});
  await pool.query('DELETE FROM users WHERE id=?',[target.id]);
  forget(target.id);
  await audit(req,'user_deleted',`${target.role} ${target.email}`);
  res.json({ok:true});
});
// kept for the pending-teachers shortcut
r.get('/teachers/pending',async(req,res)=>{
  const [rows]=await pool.query("SELECT u.id,u.name,u.email,s.name AS school FROM users u LEFT JOIN schools s ON s.id=u.school_id WHERE u.role='teacher' AND u.status='pending' ORDER BY u.id");
  res.json({teachers:rows});
});
r.post('/teachers/:id/approve',async(req,res)=>{
  await pool.query("UPDATE users SET status='active' WHERE id=? AND role='teacher' AND status='pending'",[id(req)]);forget(id(req));
  await audit(req,'teacher_approved','user '+id(req));res.json({ok:true});
});
r.delete('/teachers/:id',async(req,res)=>{
  await pool.query("DELETE FROM users WHERE id=? AND role='teacher' AND status='pending'",[id(req)]);forget(id(req));
  await audit(req,'teacher_rejected','user '+id(req));res.json({ok:true});
});

// ---------- schools ----------
r.get('/stats',async(req,res)=>{
  const [[a]]=await pool.query("SELECT SUM(role='learner') learners,SUM(role='teacher' AND status='active') teachers,SUM(role='company') companies FROM users");
  const [[s]]=await pool.query('SELECT COUNT(*) AS schools FROM schools');
  res.json({learners:+a.learners||0,teachers:+a.teachers||0,companies:+a.companies||0,schools:s.schools});
});
r.get('/schools',async(req,res)=>{
  const [rows]=await pool.query(`SELECT s.id,s.name,s.district,s.verified,
    (SELECT COUNT(*) FROM users u WHERE u.school_id=s.id AND u.role='learner') AS learners,
    (SELECT COUNT(*) FROM users u WHERE u.school_id=s.id AND u.role='teacher' AND u.status='active') AS teachers
    FROM schools s ORDER BY s.verified,s.name`);
  res.json({schools:rows});
});
r.post('/schools',async(req,res)=>{
  const name=String(req.body?.name||'').replace(/\s+/g,' ').trim().slice(0,160),district=String(req.body?.district||'').trim().slice(0,80)||null;
  if(name.length<2)return res.status(400).json({error:'Enter the school name.'});
  try{await pool.query('INSERT INTO schools(name,district) VALUES(?,?)',[name,district]);await audit(req,'school_added',name);res.status(201).json({ok:true})}
  catch(e){if(e.code==='ER_DUP_ENTRY')return res.status(409).json({error:'This school already exists.'});throw e}
});
r.post('/schools/import',async(req,res)=>{
  // one school per line: "Name" or "Name; District" (use ; or a tab if the name has a comma)
  const lines=String(req.body?.text||'').split(/\r?\n/).map(l=>l.trim()).filter(Boolean).slice(0,2000);
  let added=0,updated=0;
  for(const l of lines){
    const sep=l.includes(';')?';':l.includes('\t')?'\t':',';
    const [n0,d0]=l.split(sep).map(x=>x.replace(/\s+/g,' ').trim());
    if(!n0||n0.length<3||n0.length>160)continue;
    const dist=d0?d0.slice(0,80):null;
    const [[ex]]=await pool.query('SELECT id FROM schools WHERE name=?',[n0]);
    if(ex){await pool.query('UPDATE schools SET verified=1,district=COALESCE(?,district) WHERE id=?',[dist,ex.id]);updated++}
    else{await pool.query('INSERT INTO schools(name,district,verified) VALUES(?,?,1)',[n0,dist]);added++}
  }
  await audit(req,'schools_imported',added+' added, '+updated+' updated');
  res.json({added,updated});
});
r.patch('/schools/:id',async(req,res)=>{
  if(!(await school(id(req))))return res.status(404).json({error:'School not found.'});
  const b=req.body||{},cols=[],vals=[];
  if(b.name!==undefined){const n=String(b.name).replace(/\s+/g,' ').trim().slice(0,160);if(n.length<2)return res.status(400).json({error:'Enter the school name.'});cols.push('name=?');vals.push(n)}
  if(b.district!==undefined){cols.push('district=?');vals.push(String(b.district).trim().slice(0,80)||null)}
  if(b.verified!==undefined){cols.push('verified=?');vals.push(b.verified?1:0)}
  if(!cols.length)return res.status(400).json({error:'Nothing to change.'});
  try{await pool.query(`UPDATE schools SET ${cols.join(',')} WHERE id=?`,[...vals,id(req)])}
  catch(e){if(e.code==='ER_DUP_ENTRY')return res.status(409).json({error:'A school with this name already exists. Use Merge instead.'});throw e}
  await audit(req,'school_updated','school '+id(req));res.json({ok:true});
});
r.post('/schools/:id/verify',async(req,res)=>{
  await pool.query('UPDATE schools SET verified=1 WHERE id=?',[id(req)]);
  await audit(req,'school_verified','school '+id(req));res.json({ok:true});
});
// Moves every user of this school to another one and removes this school (for duplicates such as "Muhura" and "Lycée de Muhura").
r.post('/schools/:id/merge',async(req,res)=>{
  const from=id(req),into=+req.body?.into||0;
  if(from===into)return res.status(400).json({error:'Choose a different school to merge into.'});
  if(!(await school(from))||!(await school(into)))return res.status(404).json({error:'School not found.'});
  const c=await pool.getConnection();
  try{
    await c.beginTransaction();
    const [m]=await c.query('UPDATE users SET school_id=? WHERE school_id=?',[into,from]);
    await c.query('DELETE FROM schools WHERE id=?',[from]);
    await c.commit();
    for(const u of (await pool.query('SELECT id FROM users WHERE school_id=?',[into]))[0])forget(u.id);
    await audit(req,'schools_merged',`school ${from} into ${into}, ${m.affectedRows} users moved`);
    res.json({moved:m.affectedRows});
  }catch(e){await c.rollback();throw e}finally{c.release()}
});
r.delete('/schools/:id',async(req,res)=>{
  const [[u]]=await pool.query('SELECT COUNT(*) n FROM users WHERE school_id=?',[id(req)]);
  if(u.n)return res.status(409).json({error:`This school has ${u.n} users. Merge it into another school instead.`});
  await pool.query('DELETE FROM schools WHERE id=?',[id(req)]);
  await audit(req,'school_deleted','school '+id(req));res.json({ok:true});
});

// ---------- learners and certificates ----------
r.get('/learners',async(req,res)=>{
  const w=["u.role='learner'"],p=[];
  if(req.query.q){w.push('(u.name LIKE ? OR u.email LIKE ?)');p.push(like(req.query.q),like(req.query.q))}
  if(+req.query.school_id){w.push('u.school_id=?');p.push(+req.query.school_id)}
  const pg=page(req.query.page),from=`FROM users u JOIN books b ON b.learner_id=u.id LEFT JOIN schools s ON s.id=u.school_id LEFT JOIN certificates c ON c.learner_id=u.id WHERE ${w.join(' AND ')}`;
  const [[t]]=await pool.query(`SELECT COUNT(*) n ${from}`,p);
  const [rows]=await pool.query(`SELECT u.id,u.name,u.email,u.status,s.name AS school,s.district,b.days_recorded,b.hours,b.eval_score,b.final_mark,b.updated_at,c.code AS certificate,c.revoked_at
    ${from} ORDER BY u.name LIMIT ? OFFSET ?`,[...p,pg.limit,pg.offset]);
  res.json({rows,total:t.n,page:pg.page,size:pg.limit});
});
r.get('/certificates',async(req,res)=>{
  const pg=page(req.query.page);
  const [[t]]=await pool.query('SELECT COUNT(*) n FROM certificates');
  const [rows]=await pool.query(`SELECT c.code,c.issued_at,c.revoked_at,u.name,s.name AS school,JSON_UNQUOTE(JSON_EXTRACT(c.snapshot,'$.trade')) AS trade
    FROM certificates c JOIN users u ON u.id=c.learner_id LEFT JOIN schools s ON s.id=u.school_id ORDER BY c.issued_at DESC LIMIT ? OFFSET ?`,[pg.limit,pg.offset]);
  res.json({rows,total:t.n,page:pg.page,size:pg.limit});
});
r.post('/certificates/:code/revoke',async(req,res)=>{
  const [x]=await pool.query('UPDATE certificates SET revoked_at=NOW() WHERE code=? AND revoked_at IS NULL',[String(req.params.code).slice(0,16)]);
  if(!x.affectedRows)return res.status(404).json({error:'Certificate not found or already withdrawn.'});
  await audit(req,'certificate_revoked',req.params.code);res.json({ok:true});
});
r.post('/certificates/:code/restore',async(req,res)=>{
  const [x]=await pool.query('UPDATE certificates SET revoked_at=NULL WHERE code=? AND revoked_at IS NOT NULL',[String(req.params.code).slice(0,16)]);
  if(!x.affectedRows)return res.status(404).json({error:'Certificate not found or not withdrawn.'});
  await audit(req,'certificate_restored',req.params.code);res.json({ok:true});
});

// ---------- system settings ----------
r.get('/settings',async(req,res)=>{
  const c=await getSettings();
  res.json({registration_open:c.registration_open==='1',allow_new_schools:c.allow_new_schools==='1',maintenance:c.maintenance==='1',announcement:c.announcement});
});
r.put('/settings',async(req,res)=>{
  const {values,error}=cleanSettings(req.body);
  if(error)return res.status(400).json({error});
  if(!Object.keys(values).length)return res.status(400).json({error:'Nothing to change.'});
  await saveSettings(values);
  await audit(req,'settings_changed',Object.entries(values).map(([k,v])=>k==='announcement'?'announcement':k+'='+v).join(', '));
  res.json({ok:true});
});

// ---------- activity log ----------
function auditFilter(q){
  const w=[],p=[];
  if(q.action){w.push('a.action=?');p.push(String(q.action).slice(0,60))}
  if(q.q){w.push('(a.detail LIKE ? OR u.name LIKE ? OR u.email LIKE ?)');p.push(like(q.q),like(q.q),like(q.q))}
  if(/^\d{4}-\d{2}-\d{2}$/.test(q.from||'')){w.push('a.created_at>=?');p.push(q.from)}
  if(/^\d{4}-\d{2}-\d{2}$/.test(q.to||'')){w.push('a.created_at<DATE_ADD(?,INTERVAL 1 DAY)');p.push(q.to)}
  return {where:w.length?'WHERE '+w.join(' AND '):'',p};
}
const auditFrom='FROM audit_log a LEFT JOIN users u ON u.id=a.user_id';
r.get('/audit',async(req,res)=>{
  const {where,p}=auditFilter(req.query),pg=page(req.query.page,50);
  const [[t]]=await pool.query(`SELECT COUNT(*) n ${auditFrom} ${where}`,p);
  const [rows]=await pool.query(`SELECT a.id,a.action,a.detail,a.ip,a.created_at,u.name ${auditFrom} ${where} ORDER BY a.id DESC LIMIT ? OFFSET ?`,[...p,pg.limit,pg.offset]);
  const [acts]=await pool.query('SELECT DISTINCT action FROM audit_log ORDER BY action');
  res.json({rows,total:t.n,page:pg.page,size:pg.limit,actions:acts.map(x=>x.action)});
});
r.get('/audit.csv',async(req,res)=>{
  const {where,p}=auditFilter(req.query);
  const [rows]=await pool.query(`SELECT a.created_at,u.name,u.email,a.action,a.detail,a.ip ${auditFrom} ${where} ORDER BY a.id DESC LIMIT 5000`,p);
  const head=['time','name','email','action','detail','ip'];
  const lines=[head.join(','),...rows.map(x=>[x.created_at instanceof Date?x.created_at.toISOString():x.created_at,x.name,x.email,x.action,x.detail,x.ip].map(csvCell).join(','))];
  await audit(req,'audit_exported',rows.length+' rows');
  res.setHeader('Content-Type','text/csv; charset=utf-8');
  res.setHeader('Content-Disposition','attachment; filename="iap-activity-log.csv"');
  res.send('﻿'+lines.join('\r\n'));
});
export default r;
