import express from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.put('/super/password', requireAuth('super_admin'), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ error: 'رمز جدید حداقل ۶ کاراکتر باشد' });
  const admin = await prisma.user.findFirst({ where: { role: 'super_admin' } });
  const ok = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!ok) return res.status(401).json({ error: 'رمز فعلی اشتباه است' });
  await prisma.user.update({
    where: { id: admin.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 10) },
  });
  res.json({ ok: true });
});

router.put('/admin/password', requireAuth('admin'), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ error: 'رمز جدید حداقل ۶ کاراکتر باشد' });
  const u = await prisma.user.findUnique({ where: { id: req.user.id } });
  const ok = await bcrypt.compare(currentPassword, u.passwordHash || '');
  if (!ok) return res.status(401).json({ error: 'رمز فعلی اشتباه است' });
  await prisma.user.update({
    where: { id: u.id }, data: { passwordHash: await bcrypt.hash(newPassword, 10) },
  });
  res.json({ ok: true });
});

router.put('/teacher/password', requireAuth('teacher'), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ error: 'رمز جدید حداقل ۶ کاراکتر باشد' });
  const t = await prisma.user.findUnique({ where: { id: req.user.id } });
  const ok = await bcrypt.compare(currentPassword, t.passwordHash || '');
  if (!ok) return res.status(401).json({ error: 'رمز فعلی اشتباه است' });
  await prisma.user.update({
    where: { id: t.id }, data: { passwordHash: await bcrypt.hash(newPassword, 10) },
  });
  res.json({ ok: true });
});

router.put('/admin/teachers/:id/password', requireAuth('admin', 'super_admin'), async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ error: 'رمز باید حداقل ۶ کاراکتر باشد' });
  await prisma.user.update({
    where: { id: req.params.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 10) },
  });
  res.json({ ok: true });
});

export default router;
