import express from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../auth.js';

const router = express.Router();
const prisma = new PrismaClient();
const onlyAdmin = requireAuth('admin', 'super_admin');

function getSchoolId(req) {
  return req.user.role === 'super_admin' ? (req.query.schoolId || req.body.schoolId) : req.user.schoolId;
}

router.get('/stats', onlyAdmin, async (req, res) => {
  const schoolId = getSchoolId(req);
  if (!schoolId) return res.status(400).json({ error: 'مدرسه مشخص نیست' });
  const [teachers, students, tasks, submissions] = await Promise.all([
    prisma.teacherAssignment.findMany({ where: { schoolId }, select: { teacherId: true }, distinct: ['teacherId'] }).then((r) => r.length),
    prisma.user.count({ where: { role: 'student', schoolId } }),
    prisma.task.count({ where: { schoolId } }),
    prisma.submission.count({ where: { task: { schoolId } } }),
  ]);
  res.json({ teachers, students, tasks, submissions });
});

router.get('/school', onlyAdmin, async (req, res) => {
  const schoolId = getSchoolId(req);
  res.json(await prisma.school.findUnique({
    where: { id: schoolId },
    include: { grades: { include: { grade: true } } },
  }));
});

router.get('/teachers', onlyAdmin, async (req, res) => {
  const schoolId = getSchoolId(req);
  res.json(await prisma.user.findMany({
    where: { role: 'teacher', teacherAssignments: { some: { schoolId } } },
    include: { teacherAssignments: { where: { schoolId }, include: { grade: true } } },
    orderBy: { name: 'asc' },
  }));
});

router.post('/teachers', onlyAdmin, async (req, res) => {
  const schoolId = getSchoolId(req);
  const { name, nationalId, password, gradeIds = [] } = req.body;
  const hash = await bcrypt.hash(password, 10);
  res.json(await prisma.user.create({
    data: {
      name, nationalId, role: 'teacher', passwordHash: hash,
      teacherAssignments: { create: gradeIds.map((g) => ({ schoolId, gradeId: g })) },
    },
  }));
});

router.delete('/teachers/:id/school', onlyAdmin, async (req, res) => {
  const schoolId = getSchoolId(req);
  await prisma.teacherAssignment.deleteMany({ where: { teacherId: req.params.id, schoolId } });
  const remaining = await prisma.teacherAssignment.count({ where: { teacherId: req.params.id } });
  if (remaining === 0) await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

router.get('/tasks', onlyAdmin, async (req, res) => {
  const schoolId = getSchoolId(req);
  res.json(await prisma.task.findMany({
    where: { schoolId },
    include: { teacher: true, grade: true, _count: { select: { submissions: true } } },
    orderBy: { createdAt: 'desc' },
  }));
});

router.delete('/tasks/:id', onlyAdmin, async (req, res) => {
  const schoolId = getSchoolId(req);
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task || task.schoolId !== schoolId) return res.status(403).json({ error: 'دسترسی ندارید' });
  await prisma.task.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

router.get('/students', onlyAdmin, async (req, res) => {
  const schoolId = getSchoolId(req);
  res.json(await prisma.user.findMany({
    where: { role: 'student', schoolId },
    include: { grade: true, _count: { select: { submissions: true } } },
    orderBy: { name: 'asc' },
    take: 300,
  }));
});

router.get('/analytics/teachers', onlyAdmin, async (req, res) => {
  const schoolId = getSchoolId(req);
  const assignments = await prisma.teacherAssignment.findMany({
    where: { schoolId }, select: { teacherId: true }, distinct: ['teacherId'],
    include: { teacher: { select: { id: true, name: true } } },
  });
  const data = await Promise.all(assignments.map(async (a) => {
    const [tasksCount, submissionsCount, gradedCount, avg] = await Promise.all([
      prisma.task.count({ where: { teacherId: a.teacherId, schoolId } }),
      prisma.submission.count({ where: { task: { teacherId: a.teacherId, schoolId } } }),
      prisma.submission.count({ where: { task: { teacherId: a.teacherId, schoolId }, score: { not: null } } }),
      prisma.submission.aggregate({
        where: { task: { teacherId: a.teacherId, schoolId }, score: { not: null } },
        _avg: { score: true },
      }),
    ]);
    const gradeRate = submissionsCount > 0 ? Math.round((gradedCount / submissionsCount) * 100) : 0;
    return {
      id: a.teacher.id, name: a.teacher.name, tasks: tasksCount,
      submissions: submissionsCount, graded: gradedCount, gradeRate,
      avgScore: avg._avg.score ? Number(avg._avg.score.toFixed(2)) : null,
    };
  }));
  res.json(data);
});

router.get('/analytics/timeline', onlyAdmin, async (req, res) => {
  const schoolId = getSchoolId(req);
  const days = Number(req.query.days) || 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const subs = await prisma.submission.findMany({
    where: { task: { schoolId }, submittedAt: { gte: since } },
    select: { submittedAt: true },
  });
  const byDay = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    byDay[d.toISOString().slice(0, 10)] = 0;
  }
  subs.forEach((s) => {
    const key = new Date(s.submittedAt).toISOString().slice(0, 10);
    if (byDay[key] !== undefined) byDay[key]++;
  });
  res.json(Object.entries(byDay).map(([date, count]) => ({ date, count })));
});

export default router;
