import { Router } from 'express';
import adsRouter from './ads';
import ordersRouter from './orders';
import socialRouter from './social';
import walletRouter from './wallet';

const router = Router();

// Mount sub-routers
router.use('/ads', adsRouter);
router.use('/orders', ordersRouter);
router.use('/social', socialRouter);
router.use('/wallet', walletRouter);

export default router;
