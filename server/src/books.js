import {Router} from 'express';
import crypto from 'node:crypto';
import {pool,audit} from './db.js';
import {requireAuth} from './auth.js';
import {summarize} from './scoring.js';
const r=Router();
const clean=d=>d&&typeof d==='object'&&!Array.isArray(d)?d:null;
const mail=v=>String(v||'').trim().toLowerCase().slice(0,190)||null;
const col=u=>u.role==='teacher'?'school_email':'company_email';
// a teacher only reaches learners of their own school; a company supervisor is matched by email
const mine="(? <> 'teacher' OR u.school_id=(SELECT school_id FROM users WHERE id=?))";
const owned=async(u,id)=>(await pool.query(`SELECT b.data FROM books b JOIN users u ON u.id=b.learner_id WHERE b.learner_id=? AND b.${col(u)}=? AND ${mine}`,[id,u.email,u.role,u.id]))[0][0];
const parse=v=>typeof v==='string'?JSON.parse(v):v;
const write=(db,id,d)=>{
  const s=summarize(d);
  return db.query('UPDATE books SET data=?,school_email=?,company_email=?,days_recorded=?,hours=?,eval_score=?,final_mark=? WHERE learner_id=?',
    [JSON.stringify(d),mail(d.p_supmail),mail(d.c_supmail),s.days,s.hours,s.evalScore,s.finalMark,id]);
};
// body {data} replaces the whole book; body {changes} merges only the listed fields (safe when two people edit)
async function apply(id,body,res){
  const full=clean(body?.data),ch=clean(body?.changes);
  if(!full&&!ch)return res.status(400).json({error:'Invalid data.'});
  if(full){await write(pool,id,full);return res.json({ok:true})}
  const c=await pool.getConnection();
  try{
    await c.beginTransaction();
    const [[b]]=await c.query('SELECT data FROM books WHERE learner_id=? FOR UPDATE',[id]);
    await write(c,id,{...parse(b?.data||'{}'),...ch});
    await c.commit();res.json({ok:true});
  }catch(e){await c.rollback();throw e}finally{c.release()}
}

r.get('/me',requireAuth(['learner']),async(req,res)=>{
  const [[b]]=await pool.query('SELECT data FROM books WHERE learner_id=?',[req.user.id]);
  res.json({data:b?.data||{}});
});
r.put('/me',requireAuth(['learner']),(req,res)=>apply(req.user.id,req.body,res));
r.patch('/me',requireAuth(['learner']),(req,res)=>apply(req.user.id,req.body,res));

r.get('/',requireAuth(['teacher','company']),async(req,res)=>{
  const [rows]=await pool.query(`SELECT u.id,u.name,u.email,b.updated_at,b.days_recorded,b.hours,b.final_mark,JSON_UNQUOTE(JSON_EXTRACT(b.data,'$.l_trade')) AS trade
    FROM books b JOIN users u ON u.id=b.learner_id WHERE b.${col(req.user)}=? AND ${mine} ORDER BY u.name`,[req.user.email,req.user.role,req.user.id]);
  res.json({learners:rows});
});

// ---- certificates ----
const certOf=async id=>(await pool.query('SELECT code,issued_at,revoked_at FROM certificates WHERE learner_id=?',[id]))[0][0]||null;
r.get('/me/certificate',requireAuth(['learner']),async(req,res)=>res.json({certificate:await certOf(req.user.id)}));
r.get('/:id/certificate',requireAuth(['teacher','company']),async(req,res)=>{
  if(!(await owned(req.user,+req.params.id)))return res.status(404).json({error:'Learner not found.'});
  res.json({certificate:await certOf(+req.params.id)});
});
r.post('/:id/certificate',requireAuth(['teacher']),async(req,res)=>{
  const id=+req.params.id,b=await owned(req.user,id);
  if(!b)return res.status(404).json({error:'Learner not found.'});
  const old=await certOf(id);if(old)return res.json({certificate:old});
  const d=parse(b.data);
  const snap={name:d.l_name,school:d.p_name,trade:d.l_trade,rqf:d.l_rqf,company:d.c_name,start:d.d_start,end:d.d_end};
  if(!snap.name||!snap.school||!snap.trade||!snap.company||!snap.start||!snap.end)
    return res.status(400).json({error:'The learner must first fill name, school, trade, company and the start and end dates in Profile and Competences.'});
  const code=crypto.randomBytes(5).toString('hex').toUpperCase();
  await pool.query('INSERT INTO certificates(code,learner_id,issued_by,snapshot) VALUES(?,?,?,?)',[code,id,req.user.id,JSON.stringify(snap)]);
  await audit(req,'certificate_issued','learner '+id+' code '+code);
  res.status(201).json({certificate:await certOf(id)});
});

// ---- supervisor access to one learner ----
r.get('/:id',requireAuth(['teacher','company']),async(req,res)=>{
  const b=await owned(req.user,+req.params.id);
  if(!b)return res.status(404).json({error:'Learner not found.'});
  await audit(req,'book_opened','learner '+req.params.id);
  res.json({data:b.data});
});
const edit=async(req,res)=>{
  if(!(await owned(req.user,+req.params.id)))return res.status(404).json({error:'Learner not found.'});
  // supervisors send field changes only, and cannot change who has access to the book
  const ch=clean(req.body?.changes);
  if(!ch)return res.status(400).json({error:'Send {changes}.'});
  delete ch.p_supmail;delete ch.c_supmail;
  await audit(req,'book_edited','learner '+req.params.id);
  return apply(+req.params.id,{changes:ch},res);
};
r.put('/:id',requireAuth(['teacher','company']),edit);
r.patch('/:id',requireAuth(['teacher','company']),edit);
export default r;
