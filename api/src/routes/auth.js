import { Router } from 'express';
import { pool } from '../db/client.js';
import { sign, publicUser } from '../lib/auth.js';
import {hashPassword, verifyPassword} from '../lib/password.js';
import {validate} from '../lib/validate.js'
import { wrap } from '../lib/wrap.js'
import { loginSchema, registerSchema } from '../lib/schemas.js'



export const authRouter = Router();

authRouter.post('/login',
  validate(loginSchema),
  wrap(async (req, res) => {
  const { email, password } = req.body;
  const result = await pool.query('select * from users where email = $1', [email]);
  const user = result.rows[0];

  const ok = await verifyPassword(password, user?.password_hash);
    if (!user || !ok) return res.status(401).json({ error: 'fel e-post eller lösenord' });
    res.json({ token: sign(user), user: publicUser(user) });
}));

authRouter.post('/register',
   validate(registerSchema),
   wrap(
  async (req, res) => {
  const { email, password, displayName } = req.body;
  const exists = await pool.query('select 1 from users where email = $1', [email])
  if(exists.rows[0]) return res.status(409).json({error: 'e-posten finns redan'});
  const passwordsHash = await hashPassword(password);
  try{
  const result = await pool.query(
    'insert into users (email, password_hash, display_name) values ($1,$2,$3) returning *',
    [email, passwordsHash, displayName],
  );
  const user = result.rows[0];
  res.status(201).json({token: sign(user), user: publicUser(user)})
} catch (err){
  if(err.code === '23505') return res.status(409).json({error: 'e-posten finns redan'})
  throw err
}

}));
