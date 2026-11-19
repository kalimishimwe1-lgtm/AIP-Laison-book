import 'dotenv/config';
import {Router} from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {pool,audit} from './db.js';
import {getSettings} from './settings.js';
const ROLES=['learner','teacher','company'];
export const sign=u=>jwt.sign({id:u.id,role:u.role,email:u.email,name:u.name,school_id:u.school_id??null},process.env.JWT_SECRET,{expiresIn:'7d'});
// The account is read from the database (cached 10 s) so a disabled account or a changed role takes effect at once.
const live=new Map();
export const forget=id=>live.delete(+id);
async function current(id){
  const c=live.get(id);if(c&&Date.now()-c.at<10000)return c.row;
  const [[u]]=await pool.query('SELECT id,name,email,role,status,school_id FROM users WHERE id=?',[id]);
  live.set(id,{at:Date.now(),row:u||null});return u||null;
}
export const requireAuth=roles=>async(req,res,next)=>{
  let t;
  try{t=jwt.verify((req.headers.authorization||'').slice(7),process.env.JWT_SECRET)}
  catch{return res.status(401).json({error:'Please log in.'})}
  const u=await current(t.id);
  if(!u||u.status!=='active')return res.status(401).json({error:'Please log in.'});
  if(u.role!=='admin'&&(await getSettings()).maintenance==='1')
    return res.status(503).json({error:'The system is under maintenance. Please try again later.',maintenance:true});
  if(roles&&!roles.includes(u.role))return res.status(403).json({error:'You are not allowed to do this.'});
  req.user={id:u.id,name:u.name,email:u.email,role:u.role,school_id:u.school_id};
  next();
};
// Finds the school by id or by name (case and accent insensitive). A new name creates an unverified school for the admin to check.
async function resolveSchool(id,name,allowNew){
  if(+id){const [[x]]=await pool.query('SELECT id FROM schools WHERE id=?',[+id]);if(x)return x.id}
  const n=String(name||'').replace(/\s+/g,' ').trim();
  if(n.length<3||n.length>160)return null;
  const find=async()=>(await pool.query('SELECT id FROM schools WHERE name=?',[n]))[0][0]?.id;
  const have=await find();if(have)return have;
  if(!allowNew)return null;
  try{const [r]=await pool.query('INSERT INTO schools(name,verified) VALUES(?,0)',[n]);return r.insertId}
  catch(e){if(e.code==='ER_DUP_ENTRY')return find();throw e}
}
const pub=u=>({id:u.id,name:u.name,email:u.email,role:u.role,school_id:u.school_id??null});
const r=Router();
r.post('/register',async(req,res)=>{
  const {name='',email='',password='',role='learner',school_id=null,school_name=''}=req.body||{};
  const e=String(email).trim().toLowerCase(),n=String(name).trim();
  if(n.length<2||!/^\S+@\S+\.\S+$/.test(e)||String(password).length<8||!ROLES.includes(role))
    return res.status(400).json({error:'Enter your name, a valid email, a password of 8+ characters and a role.'});
  const cfg=await getSettings();
  if(cfg.registration_open!=='1')return res.status(403).json({error:'New registrations are closed. Contact the administrator.'});
  const [[dup]]=await pool.query('SELECT id FROM users WHERE email=?',[e]);
  if(dup)return res.status(409).json({error:'That email is already registered.'});
  let sid=null;
  if(role!=='company'){
    sid=await resolveSchool(school_id,school_name,cfg.allow_new_schools==='1');
    if(!sid)return res.status(400).json({error:cfg.allow_new_schools==='1'?'Type or choose your school (at least 3 letters).':'Choose your school from the list. Ask the administrator to add it if it is missing.'});
  }
  const status=role==='teacher'?'pending':'active';
  try{
    const [x]=await pool.query('INSERT INTO users(name,email,password_hash,role,school_id,status) VALUES(?,?,?,?,?,?)',[n,e,await bcrypt.hash(password,10),role,sid,status]);
    if(role==='learner')await pool.query('INSERT INTO books(learner_id,data) VALUES(?,?)',[x.insertId,'{}']);
    await audit(req,'register',role+' '+e,x.insertId);
    if(status==='pending')return res.status(201).json({pending:true});
    const user=pub({id:x.insertId,name:n,email:e,role,school_id:sid});
    res.status(201).json({token:sign(user),user});
  }catch(err){
    if(err.code==='ER_DUP_ENTRY')return res.status(409).json({error:'That email is already registered.'});
    throw err;
  }
});
r.post('/login',async(req,res)=>{
  const e=String(req.body?.email||'').trim().toLowerCase();
  const [[u]]=await pool.query('SELECT * FROM users WHERE email=?',[e]);
  if(!u||!(await bcrypt.compare(String(req.body?.password||''),u.password_hash))){
    await audit(req,'login_failed',e);
    return res.status(401).json({error:'Wrong email or password.'});
  }
  if(u.status==='disabled')return res.status(403).json({error:'Your account has been disabled. Contact the administrator.'});
  if(u.role!=='admin'&&(await getSettings()).maintenance==='1')return res.status(503).json({error:'The system is under maintenance. Please try again later.',maintenance:true});
  if(u.status==='pending')return res.status(403).json({error:'Your account is waiting for approval by the administrator.'});
  const user=pub(u);
  await audit(req,'login',null,u.id);
  res.json({token:sign(user),user});
});
r.get('/me',requireAuth(),(req,res)=>res.json({user:pub(req.user)}));
export default r;
