import jwt from 'jsonwebtoken';

export function sign(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      name: user.name,
      schoolId: user.schoolId || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function requireAuth(...allowedRoles) {
  return (req, res, next) => {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'توکن نامعتبر' });

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload;
      if (allowedRoles.length && !allowedRoles.includes(payload.role)) {
        return res.status(403).json({ error: 'دسترسی ندارید' });
      }
      next();
    } catch {
      return res.status(401).json({ error: 'توکن نامعتبر' });
    }
  };
}

export const auth = requireAuth;
