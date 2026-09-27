import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../auth.js';
import { sendToStudents } from '../push.js';

const router = express.Router();
const prisma = new PrismaClient();
const onlyTeacher = requireAuth('teacher');

router.get('/me', onlyTeacher, async (req, res) => {
  const me = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { teacherAssignments: { include: { school: true, grade: true } } },
  });
  const schools = [...new Map(me.teacherAssignments.map((a) => [a.schoolId, a.school])).values()];
  res.json({
    id: me.id, name: me.name, nationalId: me.nationalId,
    schools,
    assignments: me.teacherAssignments.map((a) => ({
      id: a.id, schoolId: a.schoolId, schoolName: a.school.name,
      gradeId: a.gradeId, gradeName: a.grade.name,
    })),
  });
});

router.get('/tasks', onlyTeacher, async (req, res) => {
  const { schoolId } = req.query;
  if (schoolId) {
    const ok = await prisma.teacherAssignment.findFirst({ where: { teacherId: req.user.id, schoolId } });
    if (!ok) return res.status(403).json({ error: 'دسترسی ندارید' });
  }
  res.json(await prisma.task.findMany({
    where: { teacherId: req.user.id, ...(schoolId && { schoolId }) },
    include: { school: true, grade: true, _count: { select: { submissions: true } } },
    orderBy: { createdAt: 'desc' },
  }));
});

router.post('/tasks', onlyTeacher, async (req, res) => {
  const { schoolId, gradeId, title, description, startDate, deadline } = req.body;
  const allowed = await prisma.teacherAssignment.findFirst({
    where: { teacherId: req.user.id, schoolId, gradeId },
  });
  if (!allowed) return res.status(403).json({ error: 'دسترسی ندارید' });

  const task = await prisma.task.create({
    data: {
      teacherId: req.user.id, schoolId, gradeId, title, description,
      startDate: new Date(startDate), deadline: new Date(deadline),
    },
  });

  prisma.user.findMany({
    where: { role: 'student', schoolId, gradeId }, select: { id: true },
  }).then((students) => {
    sendToStudents(students.map((s) => s.id), {
      title: '📚 تکلیف جدید', body: title, url: '/student',
    }).catch(() => {});
  });

  res.json(task);
});

router.get('/task/:id/submissions', onlyTeacher, async (req, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task || task.teacherId !== req.user.id)
    return res.status(403).json({ error: 'دسترسی ندارید' });
  const submissions = await prisma.submission.findMany({
    where: { taskId: req.params.id },
    include: { student: { include: { grade: true } } },
    orderBy: { submittedAt: 'desc' },
  });
  res.json({ task, submissions });
});

export default router;
