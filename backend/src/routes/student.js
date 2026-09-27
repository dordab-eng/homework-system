import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../auth.js';
import { upload, uploadToCloudinary } from '../upload.js';
import { uploadLimiter } from '../rateLimit.js';

const router = express.Router();
const prisma = new PrismaClient();
const onlyStudent = requireAuth('student');

router.get('/me', onlyStudent, async (req, res) => {
  res.json(await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { school: true, grade: true },
  }));
});

router.get('/tasks', onlyStudent, async (req, res) => {
  const me = await prisma.user.findUnique({ where: { id: req.user.id } });
  res.json(await prisma.task.findMany({
    where: { schoolId: me.schoolId, gradeId: me.gradeId, status: { not: 'closed' } },
    include: {
      teacher: { select: { id: true, name: true } },
      school: { select: { name: true } },
      grade: { select: { name: true } },
      submissions: { where: { studentId: me.id } },
    },
    orderBy: { deadline: 'asc' },
  }));
});

router.post('/tasks/:taskId/submit', onlyStudent, uploadLimiter, upload.single('image'), async (req, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
  if (!task) return res.status(404).json({ error: 'تکلیف یافت نشد' });
  const me = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (task.schoolId !== me.schoolId || task.gradeId !== me.gradeId)
    return res.status(403).json({ error: 'دسترسی ندارید' });
  if (task.status !== 'active' || new Date(task.deadline) < new Date())
    return res.status(400).json({ error: 'مهلت تکلیف تمام شده' });
  if (!req.file) return res.status(400).json({ error: 'عکس ارسال نشد' });

  const url = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
  const existing = await prisma.submission.findUnique({
    where: { taskId_studentId: { taskId: task.id, studentId: me.id } },
  });
  const sub = existing
    ? await prisma.submission.update({
        where: { id: existing.id },
        data: { imageUrl: url, submittedAt: new Date(), status: 'submitted' },
      })
    : await prisma.submission.create({
        data: { taskId: task.id, studentId: me.id, imageUrl: url },
      });
  res.json(sub);
});

router.get('/report', onlyStudent, async (req, res) => {
  const student = await prisma.user.findUnique({
    where: { id: req.user.id }, include: { school: true, grade: true },
  });
  const submissions = await prisma.submission.findMany({
    where: { studentId: req.user.id },
    include: { task: { include: { teacher: { select: { id: true, name: true } } } } },
    orderBy: { submittedAt: 'desc' },
  });
  const graded = submissions.filter((s) => s.score != null);
  const avg = graded.length ? graded.reduce((a, s) => a + s.score, 0) / graded.length : null;
  const byTeacher = {};
  graded.forEach((s) => {
    const t = s.task.teacher;
    if (!byTeacher[t.id]) byTeacher[t.id] = { name: t.name, scores: [] };
    byTeacher[t.id].scores.push(s.score);
  });
  const teacherStats = Object.entries(byTeacher).map(([id, v]) => ({
    teacherId: id, teacherName: v.name, count: v.scores.length,
    avg: Number((v.scores.reduce((a, b) => a + b, 0) / v.scores.length).toFixed(2)),
  }));
  res.json({
    student, submissions,
    summary: {
      total: submissions.length, graded: graded.length,
      pending: submissions.length - graded.length,
      average: avg ? Number(avg.toFixed(2)) : null,
    },
    teacherStats,
  });
});

export default router;
