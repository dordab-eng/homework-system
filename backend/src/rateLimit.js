import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'تلاش‌های زیادی انجام شده. لطفاً بعداً امتحان کنید.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'تعداد ارسال‌ها زیاد است.' },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'تعداد درخواست‌ها زیاد است.' },
  standardHeaders: true,
  legacyHeaders: false,
});
