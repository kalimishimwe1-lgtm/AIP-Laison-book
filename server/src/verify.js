import {Router} from 'express';
import {pool} from './db.js';
const r=Router();
// Public: anyone scanning the certificate QR code can check it. Returns only what is printed on the certificate.
r.get('/:code',async(req,res)=>{
  const [[c]]=await pool.query('SELECT snapshot,issued_at,revoked_at FROM certificates WHERE code=?',[String(req.params.code).toUpperCase().slice(0,16)]);
  if(!c||c.revoked_at)return res.status(404).json({valid:false,error:c?'This certificate has been withdrawn.':'No certificate found with this code.'});
  const s=typeof c.snapshot==='string'?JSON.parse(c.snapshot):c.snapshot;
  res.json({valid:true,issued_at:c.issued_at,...s});
});
export default r;
