import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.put('/submissions/:id/grade', requireAuth('teacher', 'super_admin'), async (req, res) => {
  const { score, feedback } = req.body;
  if (score != null && (score < 0 || score > 100))
    return res.status(400).json({ error: 'نمره باید بین ۰ تا ۱۰۰ باشد' });
  const sub = await prisma.submission.findUnique({
    where: { id: req.params.id }, include: { task: true },
  });
  if (!sub) return res.status(404).json({ error: 'یافت نشد' });
  if (req.user.role === 'teacher' && sub.task.teacherId !== req.user.id)
    return res.status(403).json({ error: 'دسترسی ندارید' });
  res.json(await prisma.submission.update({
    where: { id: sub.id },
    data: {
      score: score != null ? Number(score) : null,
      feedback: feedback || null,
      gradedAt: new Date(),
      gradedBy: req.user.id,
    },
  }));
});

router.get('/students/:id/report', requireAuth('teacher', 'admin', 'super_admin'), async (req, res) => {
  const student = await prisma.user.findUnique({
    where: { id: req.params.id }, include: { school: true, grade: true },
  });
  if (!student || student.role !== 'student')
    return res.status(404).json({ error: 'دانش‌آموز یافت نشد' });
  const subs = await prisma.submission.findMany({
    where: { studentId: student.id },
    include: { task: { include: { teacher: { select: { name: true } } } } },
    orderBy: { submittedAt: 'desc' },
  });
  res.json({ student, submissions: subs });
});

export default router;
