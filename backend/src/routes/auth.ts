import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { getOrCreateUser } from '../services/userService';
import { findTraderByUserId } from '../services/traderService';

const router = Router();

// In-memory OTP store (use Redis in production)
const otpStore = new Map<string, { otp: string; expires: number }>();

// POST /api/auth/otp - Send OTP to phone
router.post('/otp', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }

    // Generate OTP (fixed in dev, random in prod)
    const otp = process.env.NODE_ENV === 'development' ? '123456' : Math.random().toString().slice(2, 8);

    // Store OTP with 5 minute expiry
    otpStore.set(phone, { otp, expires: Date.now() + 5 * 60 * 1000 });

    // TODO: Send via Twilio in production
    console.log(`📱 OTP for ${phone}: ${otp}`);

    res.json({ message: 'OTP sent', phone });
  } catch (error) {
    console.error('OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// POST /api/auth/verify - Verify OTP and get JWT
router.post('/verify', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP required' });
    }

    // Verify OTP
    const stored = otpStore.get(phone);
    if (!stored || stored.expires < Date.now()) {
      return res.status(401).json({ error: 'OTP expired or not found' });
    }
    if (stored.otp !== otp) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    // Clear used OTP
    otpStore.delete(phone);

    const isAdmin = (process.env.ADMIN_PHONE_NUMBERS || '').includes(phone);

    let user: any;
    let trader: any = null;
    let isTrader = false;

    try {
      // Try to get or create user in database
      user = await getOrCreateUser(phone, isAdmin);
      trader = await findTraderByUserId(user.id);
      isTrader = trader?.status === 'active';
    } catch (dbError) {
      // Database not available - use mock user for development
      console.log('⚠️ Database not available, using mock user');
      const { v4: uuidv4 } = await import('uuid');
      user = {
        id: uuidv4(),
        phone,
        display_name: null,
        avatar_url: null,
        is_admin: isAdmin,
        is_trader: false
      };
    }

    const secret = process.env.JWT_SECRET || 'dev-secret';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    const token = jwt.sign(
      {
        id: user.id,
        phone: user.phone || phone,
        isTrader,
        isAdmin: user.is_admin || isAdmin
      },
      secret,
      { expiresIn } as jwt.SignOptions
    );

    res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone || phone,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        isTrader,
        isAdmin: user.is_admin || isAdmin,
        traderId: trader?.id
      }
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// POST /api/auth/refresh - Refresh JWT
router.post('/refresh', async (req, res) => {
  // TODO: Implement token refresh
  res.status(501).json({ error: 'Not implemented' });
});

// DELETE /api/auth/logout - Logout
router.delete('/logout', async (req, res) => {
  // TODO: Invalidate token in Redis
  res.json({ message: 'Logged out' });
});

export default router;
