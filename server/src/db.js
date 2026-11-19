import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import {DEFAULTS} from './settingsDefaults.js';
const {DB_HOST='localhost',DB_PORT=3306,DB_USER='root',DB_PASSWORD='',DB_NAME='iap_liaison'}=process.env;
export let pool;
export async function initDb(){
  const boot=await mysql.createConnection({host:DB_HOST,port:+DB_PORT,user:DB_USER,password:DB_PASSWORD});
  await boot.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4`);
  await boot.end();
  pool=mysql.createPool({host:DB_HOST,port:+DB_PORT,user:DB_USER,password:DB_PASSWORD,database:DB_NAME,connectionLimit:10});
  await pool.query(`CREATE TABLE IF NOT EXISTS users(
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    role ENUM('learner','teacher','company') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) CHARACTER SET utf8mb4`);
  await pool.query(`CREATE TABLE IF NOT EXISTS books(
    learner_id INT PRIMARY KEY,
    data JSON NOT NULL,
    school_email VARCHAR(190) NULL,
    company_email VARCHAR(190) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX(school_email), INDEX(company_email),
    FOREIGN KEY(learner_id) REFERENCES users(id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4`);
  await pool.query(`CREATE TABLE IF NOT EXISTS schools(
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(160) NOT NULL UNIQUE,
    district VARCHAR(80) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) CHARACTER SET utf8mb4`);
  for(const q of [
    "ALTER TABLE users MODIFY role ENUM('learner','teacher','company','admin') NOT NULL",
    "ALTER TABLE users ADD COLUMN school_id INT NULL",
    "ALTER TABLE schools ADD COLUMN verified TINYINT(1) NOT NULL DEFAULT 1",
    "ALTER TABLE users ADD COLUMN status ENUM('active','pending') NOT NULL DEFAULT 'active'"]){
    try{await pool.query(q)}catch(e){if(e.code!=='ER_DUP_FIELDNAME')throw e}
  }
  // Starter list. The admin can add the full official list from the Administration page (Import schools).
  for(const n of ['Lycée Saint Alexandre Sauli de Muhura','Collège Saint Marie Zaccarie','IPRC Kigali','IPRC Musanze','IPRC Huye','IPRC Tumba','IPRC Karongi','IPRC Ngoma','IPRC Gishari','IPRC Kitabi'])
    await pool.query('INSERT IGNORE INTO schools(name,verified) VALUES(?,1)',[n]);
  await pool.query("ALTER TABLE users MODIFY status ENUM('active','pending','disabled') NOT NULL DEFAULT 'active'");
  await pool.query(`CREATE TABLE IF NOT EXISTS settings(
    k VARCHAR(40) PRIMARY KEY,
    v VARCHAR(1000) NOT NULL
  ) CHARACTER SET utf8mb4`);
  for(const [k,v] of Object.entries(DEFAULTS))await pool.query('INSERT IGNORE INTO settings(k,v) VALUES(?,?)',[k,v]);
  for(const q of [
    "ALTER TABLE books ADD COLUMN days_recorded INT NOT NULL DEFAULT 0",
    "ALTER TABLE books ADD COLUMN hours DECIMAL(7,1) NOT NULL DEFAULT 0",
    "ALTER TABLE books ADD COLUMN eval_score DECIMAL(5,1) NOT NULL DEFAULT 0",
    "ALTER TABLE books ADD COLUMN final_mark DECIMAL(5,1) NOT NULL DEFAULT 0"]){
    try{await pool.query(q)}catch(e){if(e.code!=='ER_DUP_FIELDNAME')throw e}
  }
  await pool.query(`CREATE TABLE IF NOT EXISTS certificates(
    code VARCHAR(16) PRIMARY KEY,
    learner_id INT NOT NULL UNIQUE,
    issued_by INT NOT NULL,
    snapshot JSON NOT NULL,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(learner_id) REFERENCES users(id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4`);
  try{await pool.query('ALTER TABLE certificates ADD COLUMN revoked_at TIMESTAMP NULL')}catch(e){if(e.code!=='ER_DUP_FIELDNAME')throw e}
  await pool.query(`CREATE TABLE IF NOT EXISTS audit_log(
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(60) NOT NULL,
    detail VARCHAR(255) NULL,
    ip VARCHAR(64) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX(created_at), INDEX(user_id)
  ) CHARACTER SET utf8mb4`);
  const {ADMIN_EMAIL,ADMIN_PASSWORD}=process.env;
  if(ADMIN_EMAIL&&ADMIN_PASSWORD){
    if(process.env.NODE_ENV==='production'&&ADMIN_PASSWORD==='ChangeMe12345')throw Object.assign(new Error('Change ADMIN_PASSWORD before running in production'),{code:'WEAK_ADMIN_PASSWORD'});
    const [[a]]=await pool.query("SELECT id FROM users WHERE role='admin' LIMIT 1");
    if(!a){
      await pool.query("INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,'admin')",['RTB Administrator',ADMIN_EMAIL.trim().toLowerCase(),await bcrypt.hash(ADMIN_PASSWORD,10)]);
      console.log('Admin account created for '+ADMIN_EMAIL);
    }
  }
}

// Writes a line to audit_log. Never throws: logging must not break a request.
export async function audit(req,action,detail=null,userId=null){
  try{await pool.query('INSERT INTO audit_log(user_id,action,detail,ip) VALUES(?,?,?,?)',[userId??req?.user?.id??null,action,detail&&String(detail).slice(0,255),req?.ip||null])}catch(e){console.error('audit failed',e.code||e.message)}
}
