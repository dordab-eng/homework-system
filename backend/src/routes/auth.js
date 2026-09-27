import express from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { sign } from '../auth.js';
import { loginLimiter } from '../rateLimit.js';

const router = express.Router();
const prisma = new PrismaClient();

router.post('/super/login', loginLimiter, async (req, res) => {
  const { password } = req.body;
  const admin = await prisma.user.findFirst({ where: { role: 'super_admin' } });
  if (!admin) return res.status(500).json({ error: 'مدیر کل یافت نشد' });
  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return res.status(401).json({ error: 'رمز اشتباه است' });
  res.json({ token: sign(admin), name: admin.name, role: admin.role });
});

router.post('/admin/login', loginLimiter, async (req, res) => {
  const { nationalId, password } = req.body;
  const a = await prisma.user.findUnique({ where: { nationalId } });
  if (!a || a.role !== 'admin' || a.status !== 'active')
    return res.status(401).json({ error: 'کاربر یافت نشد' });
  const ok = await bcrypt.compare(password, a.passwordHash || '');
  if (!ok) return res.status(401).json({ error: 'رمز اشتباه است' });
  res.json({ token: sign(a), name: a.name, role: a.role, schoolId: a.schoolId });
});

router.post('/teacher/login', loginLimiter, async (req, res) => {
  const { nationalId, password } = req.body;
  const t = await prisma.user.findUnique({ where: { nationalId } });
  if (!t || t.role !== 'teacher' || t.status !== 'active')
    return res.status(401).json({ error: 'کاربر یافت نشد' });
  const ok = await bcrypt.compare(password, t.passwordHash || '');
  if (!ok) return res.status(401).json({ error: 'رمز اشتباه است' });
  res.json({ token: sign(t), name: t.name, role: t.role });
});

router.post('/student/login', loginLimiter, async (req, res) => {
  const { name, schoolId, gradeId } = req.body;
  if (!name || !schoolId || !gradeId)
    return res.status(400).json({ error: 'اطلاعات ناقص است' });

  const sg = await prisma.schoolGrade.findFirst({ where: { schoolId, gradeId } });
  if (!sg) return res.status(400).json({ error: 'این پایه در مدرسه فعال نیست' });

  let student = await prisma.user.findFirst({
    where: { role: 'student', name, schoolId, gradeId },
  });

  if (!student) {
    student = await prisma.user.create({
      data: {
        name, role: 'student',
        nationalId: `std-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        schoolId, gradeId,
      },
    });
  }

  res.json({ token: sign(student), name: student.name, role: student.role });
});

export default router;
