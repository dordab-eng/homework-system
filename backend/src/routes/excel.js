import express from 'express';
import ExcelJS from 'exceljs';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/tasks/:id/excel', requireAuth('teacher', 'admin', 'super_admin'), async (req, res) => {
  const task = await prisma.task.findUnique({
    where: { id: req.params.id },
    include: {
      teacher: true, school: true, grade: true,
      submissions: { include: { student: true } },
    },
  });
  if (!task) return res.status(404).json({ error: 'یافت نشد' });
  if (req.user.role === 'teacher' && task.teacherId !== req.user.id)
    return res.status(403).json({ error: 'دسترسی ندارید' });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('ارسال‌ها', { views: [{ rightToLeft: true }] });
  ws.columns = [
    { header: 'ردیف', key: 'n', width: 8 },
    { header: 'نام دانش‌آموز', key: 'name', width: 25 },
    { header: 'زمان ارسال', key: 'time', width: 22 },
    { header: 'نمره', key: 'score', width: 10 },
    { header: 'بازخورد', key: 'feedback', width: 30 },
    { header: 'لینک عکس', key: 'url', width: 60 },
  ];
  ws.getRow(1).font = { bold: true };
  task.submissions.forEach((s, i) => {
    ws.addRow({
      n: i + 1, name: s.student.name,
      time: new Date(s.submittedAt).toLocaleString('fa-IR'),
      score: s.score ?? '', feedback: s.feedback || '', url: s.imageUrl,
    });
  });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="task-${task.id}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

router.get('/admin/excel/all', requireAuth('admin', 'super_admin'), async (req, res) => {
  const schoolId = req.user.role === 'super_admin' ? req.query.schoolId : req.user.schoolId;
  const subs = await prisma.submission.findMany({
    where: schoolId ? { task: { schoolId } } : {},
    include: { student: true, task: { include: { school: true, grade: true, teacher: true } } },
    orderBy: { submittedAt: 'desc' },
    take: 1000,
  });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('ارسال‌ها', { views: [{ rightToLeft: true }] });
  ws.columns = [
    { header: 'ردیف', key: 'n', width: 8 },
    { header: 'دانش‌آموز', key: 'student', width: 25 },
    { header: 'مدرسه', key: 'school', width: 22 },
    { header: 'پایه', key: 'grade', width: 12 },
    { header: 'عنوان', key: 'title', width: 30 },
    { header: 'دبیر', key: 'teacher', width: 22 },
    { header: 'زمان', key: 'time', width: 22 },
    { header: 'نمره', key: 'score', width: 10 },
  ];
  ws.getRow(1).font = { bold: true };
  subs.forEach((s, i) => {
    ws.addRow({
      n: i + 1, student: s.student.name,
      school: s.task.school.name, grade: s.task.grade.name,
      title: s.task.title, teacher: s.task.teacher.name,
      time: new Date(s.submittedAt).toLocaleString('fa-IR'),
      score: s.score ?? '',
    });
  });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="all-submissions.xlsx"');
  await wb.xlsx.write(res);
  res.end();
});

export default router;
