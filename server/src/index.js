import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {initDb,pool} from './db.js';
import admin from './admin.js';
import reports,{integration} from './reports.js';
import verify from './verify.js';
import {getSettings} from './settings.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import auth from './auth.js';
import books from './books.js';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
// First run: create server/.env (from .env.example) and generate a private JWT_SECRET automatically.
const js=process.env.JWT_SECRET;
if(!js||js.startsWith('replace-with')){
  if(process.env.NODE_ENV==='production'){console.error('\nSet JWT_SECRET in the environment.\n');process.exit(1)}
  const envPath=fileURLToPath(new URL('../.env',import.meta.url));
  const examplePath=fileURLToPath(new URL('../.env.example',import.meta.url));
  const secret=crypto.randomBytes(48).toString('hex');
  let txt=fs.existsSync(envPath)?fs.readFileSync(envPath,'utf8'):(fs.existsSync(examplePath)?fs.readFileSync(examplePath,'utf8'):'');
  txt=/^JWT_SECRET=.*$/m.test(txt)?txt.replace(/^JWT_SECRET=.*$/m,'JWT_SECRET='+secret):txt+(txt&&!txt.endsWith('\n')?'\n':'')+'JWT_SECRET='+secret+'\n';
  fs.writeFileSync(envPath,txt);
  process.env.JWT_SECRET=secret;
  console.log('Generated a private JWT_SECRET and saved it in server/.env');
}
const app=express();
let dbReady=false;
if(process.env.TRUST_PROXY)app.set('trust proxy',process.env.TRUST_PROXY==='true'?1:process.env.TRUST_PROXY);
app.use(helmet());
const origins=(process.env.CLIENT_ORIGIN||'http://localhost:5173').split(',').map(x=>x.trim());
app.use(cors({origin:origins}));
const limit=(windowMin,max)=>rateLimit({windowMs:windowMin*60000,limit:max,standardHeaders:true,legacyHeaders:false,message:{error:'Too many requests. Please wait a few minutes and try again.'}});
app.use('/api',limit(1,300));
app.use('/api/auth/login',limit(15,20));
app.use('/api/auth/register',limit(60,20));
app.use('/api/verify',limit(1,30));
app.use(express.json({limit:'1mb'}));
app.get('/api/health',(q,s)=>s.json({ok:true,database:dbReady}));
app.use('/api',(req,res,next)=>dbReady?next():res.status(503).json({error:'The database is not connected. Start MySQL and check DB_USER and DB_PASSWORD in server/.env.'}));
app.get('/api/schools',async(q,s)=>{const [rows]=await pool.query('SELECT id,name,district FROM schools WHERE verified=1 ORDER BY name');s.json({schools:rows})});
app.get('/api/settings',async(q,s)=>{const c=await getSettings();s.json({announcement:c.announcement,registration_open:c.registration_open==='1',maintenance:c.maintenance==='1'})});
app.use('/api/auth',auth);
app.use('/api/admin/reports',reports);
app.use('/api/admin',admin);
app.use('/api/verify',verify);
app.use('/api/integration',integration);
app.use('/api/books',books);
app.use((err,req,res,next)=>{console.error(err);res.status(500).json({error:'Server error: '+(err.code||err.message)})});
const port=process.env.PORT||5000;
app.listen(port,()=>console.log('API running on port '+port));
(async function connect(){
  try{await initDb();dbReady=true;console.log('MySQL connected.')}
  catch(e){
    if(e.code==='WEAK_ADMIN_PASSWORD'){console.error('\n'+e.message+'\n');process.exit(1)}
    if(e.code==='ER_ACCESS_DENIED_ERROR'){
      console.error('\nMySQL refused the login for user "'+(process.env.DB_USER||'root')+'".\nOpen server/.env and set DB_USER and DB_PASSWORD to your MySQL login, then run npm run dev again.\n');
      process.exit(1);
    }
    const why=e.code==='ECONNREFUSED'?'MySQL is not running on '+(process.env.DB_HOST||'localhost')+':'+(process.env.DB_PORT||3306)+'. Start the MySQL service.':e.code||e.message;
    console.error('MySQL connection failed: '+why+' Retrying in 5 s...');
    setTimeout(connect,5000);
  }
})();
