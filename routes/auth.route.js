import express from 'express';
import { addCoin, googleAuth, logout, refundCoins, useCoins } from '../controllers/auth.controller.js';

const authRouter = express.Router();

authRouter.post('/login', googleAuth)
authRouter.get('/logout', logout)
authRouter.post('/use-coins', useCoins)
authRouter.post('/add-coins', addCoin)
authRouter.post("/refund-coins",refundCoins)


export default authRouter
