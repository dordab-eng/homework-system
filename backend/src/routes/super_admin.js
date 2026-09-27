import express from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../auth.js';

const router = express.Router();
const prisma = new PrismaClient();
const onlySuper = requireAuth('super_admin');

router.get('/stats', onlySuper, async (_req, res) => {
  const [schools, admins, teachers, students, tasks, submissions] = await Promise.all([
    prisma.school.count(),
    prisma.user.count({ where: { role: 'admin' } }),
    prisma.user.count({ where: { role: 'teacher' } }),
    prisma.user.count({ where: { role: 'student' } }),
    prisma.task.count(),
    prisma.submission.count(),
  ]);
  res.json({ schools, admins, teachers, students, tasks, submissions });
});

router.get('/schools', onlySuper, async (_req, res) => {
  res.json(await prisma.school.findMany({
    include: {
      admins: { select: { id: true, name: true, nationalId: true } },
      grades: { include: { grade: true } },
      _count: { select: { tasks: true, assignments: true } },
    },
    orderBy: { createdAt: 'desc' },
  }));
});

router.post('/schools', onlySuper, async (req, res) => {
  const { name, code, address, phone, gradeIds = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'نام مدرسه لازم است' });
  const school = await prisma.school.create({
    data: { name, code, address, phone, grades: { create: gradeIds.map((g) => ({ gradeId: g })) } },
  });
  res.json(school);
});

router.delete('/schools/:id', onlySuper, async (req, res) => {
  await prisma.school.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

router.get('/grades/all', onlySuper, async (_req, res) => {
  res.json(await prisma.grade.findMany({ orderBy: { order: 'asc' } }));
});

router.post('/grades', onlySuper, async (req, res) => {
  const { name, order = 0 } = req.body;
  res.json(await prisma.grade.create({ data: { name, order } }));
});

router.post('/schools/:id/admins', onlySuper, async (req, res) => {
  const { name, nationalId, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  res.json(await prisma.user.create({
    data: { name, nationalId, role: 'admin', passwordHash: hash, schoolId: req.params.id },
  }));
});

router.get('/teachers', onlySuper, async (_req, res) => {
  res.json(await prisma.user.findMany({
    where: { role: 'teacher' },
    include: { teacherAssignments: { include: { school: true, grade: true } } },
    orderBy: { name: 'asc' },
  }));
});

router.post('/teachers', onlySuper, async (req, res) => {
  try {
    const { name, nationalId, password, assignments = [] } = req.body;
    if (!name || !nationalId || !password) {
      return res.status(400).json({ error: 'اطلاعات ناقص' });
    }

    for (const a of assignments) {
      if (!a.schoolId || !a.gradeId) {
        return res.status(400).json({ error: 'مدرسه یا پایه نامعتبر' });
      }
      const g = await prisma.grade.findUnique({ where: { id: a.gradeId } });
      if (!g) return res.status(400).json({ error: 'پایه نامعتبر' });
      const s = await prisma.school.findUnique({ where: { id: a.schoolId } });
      if (!s) return res.status(400).json({ error: 'مدرسه نامعتبر' });
    }

    const existing = await prisma.user.findUnique({ where: { nationalId } });
    if (existing) {
      return res.status(400).json({ error: 'این کد ملی قبلاً ثبت شده' });
    }

    const hash = await bcrypt.hash(password, 10);
    const teacher = await prisma.user.create({
      data: {
        name, nationalId, role: 'teacher', passwordHash: hash,
        teacherAssignments: { create: assignments },
      },
    });
    res.json(teacher);
  } catch (e) {
    console.error('Teacher create error:', e.message);
    res.status(500).json({ error: e.message || 'خطای سرور' });
  }
});

router.get('/analytics/schools', onlySuper, async (_req, res) => {
  const schools = await prisma.school.findMany({ select: { id: true, name: true } });
  const data = await Promise.all(schools.map(async (s) => {
    const [tasks, submissions, students, teachers] = await Promise.all([
      prisma.task.count({ where: { schoolId: s.id } }),
      prisma.submission.count({ where: { task: { schoolId: s.id } } }),
      prisma.user.count({ where: { role: 'student', schoolId: s.id } }),
      prisma.teacherAssignment.findMany({
        where: { schoolId: s.id }, select: { teacherId: true }, distinct: ['teacherId'],
      }).then((r) => r.length),
    ]);
    const expected = students * tasks;
    const submitRate = expected > 0 ? Math.round((submissions / expected) * 100) : 0;
    return { id: s.id, name: s.name, students, teachers, tasks, submissions, submitRate };
  }));
  res.json(data);
});

router.get('/analytics/teachers', onlySuper, async (_req, res) => {
  const teachers = await prisma.user.findMany({ where: { role: 'teacher' }, select: { id: true, name: true } });
  const data = await Promise.all(teachers.map(async (t) => {
    const [tasksCount, submissionsCount, gradedCount, schools] = await Promise.all([
      prisma.task.count({ where: { teacherId: t.id } }),
      prisma.submission.count({ where: { task: { teacherId: t.id } } }),
      prisma.submission.count({ where: { task: { teacherId: t.id }, score: { not: null } } }),
      prisma.teacherAssignment.findMany({
        where: { teacherId: t.id }, select: { schoolId: true }, distinct: ['schoolId'],
      }).then((r) => r.length),
    ]);
    const gradeRate = submissionsCount > 0 ? Math.round((gradedCount / submissionsCount) * 100) : 0;
    const avg = await prisma.submission.aggregate({
      where: { task: { teacherId: t.id }, score: { not: null } },
      _avg: { score: true },
    });
    return {
      id: t.id, name: t.name, tasks: tasksCount, submissions: submissionsCount,
      graded: gradedCount, gradeRate, schools,
      avgScore: avg._avg.score ? Number(avg._avg.score.toFixed(2)) : null,
    };
  }));
  data.sort((a, b) => b.tasks - a.tasks);
  res.json(data);
});

export default router;
