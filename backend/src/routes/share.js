import express from 'express';
import { nanoid } from 'nanoid';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.post('/tasks/:id/share', requireAuth('teacher', 'admin', 'super_admin'), async (req, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ error: 'تکلیف یافت نشد' });
  if (req.user.role === 'teacher' && task.teacherId !== req.user.id)
    return res.status(403).json({ error: 'دسترسی ندارید' });
  const { expiresInDays } = req.body;
  const slug = nanoid(8);
  const link = await prisma.shareLink.create({
    data: {
      slug, taskId: task.id, createdBy: req.user.id,
      expiresAt: expiresInDays ? new Date(Date.now() + Number(expiresInDays) * 86400000) : null,
    },
  });
  res.json({ slug: link.slug, url: `/share/${link.slug}` });
});

router.get('/public/share/:slug', async (req, res) => {
  const link = await prisma.shareLink.findUnique({
    where: { slug: req.params.slug },
    include: {
      task: {
        include: {
          teacher: { select: { name: true } },
          school: { select: { name: true } },
          grade: { select: { name: true } },
        },
      },
    },
  });
  if (!link) return res.status(404).json({ error: 'لینک یافت نشد' });
  if (link.expiresAt && new Date(link.expiresAt) < new Date())
    return res.status(410).json({ error: 'لینک منقضی شده' });
  await prisma.shareLink.update({ where: { id: link.id }, data: { views: { increment: 1 } } });
  res.json({
    title: link.task.title, description: link.task.description,
    deadline: link.task.deadline, startDate: link.task.startDate,
    teacher: link.task.teacher.name, school: link.task.school.name,
    grade: link.task.grade.name, status: link.task.status,
  });
});

export default router;
