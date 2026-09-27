import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../auth.js';
import { upload, uploadToCloudinary } from '../upload.js';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/teacher/chats', requireAuth('teacher'), async (req, res) => {
  const teacherId = req.user.id;
  const messages = await prisma.message.findMany({
    where: { teacherId },
    orderBy: { createdAt: 'desc' },
    include: {
      student: { select: { id: true, name: true, school: { select: { name: true } } } },
      task: { select: { id: true, title: true } },
    },
  });
  const map = new Map();
  for (const m of messages) {
    const key = `${m.studentId}-${m.taskId || 'general'}`;
    if (!map.has(key)) {
      const unread = await prisma.message.count({
        where: { studentId: m.studentId, teacherId, taskId: m.taskId, senderRole: 'student', readAt: null },
      });
      map.set(key, {
        studentId: m.studentId, studentName: m.student.name,
        schoolName: m.student.school?.name,
        taskId: m.taskId, taskTitle: m.task?.title,
        lastMessage: m.text || '📎 فایل', lastAt: m.createdAt, unread,
      });
    }
  }
  res.json([...map.values()]);
});

router.get('/messages', requireAuth('teacher', 'student'), async (req, res) => {
  const { studentId, taskId } = req.query;
  const teacherId = req.user.role === 'teacher' ? req.user.id : null;
  const sid = req.user.role === 'student' ? req.user.id : studentId;
  if (!sid) return res.status(400).json({ error: 'studentId لازم است' });

  let tid = teacherId;
  if (!tid && taskId) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    tid = task?.teacherId;
  }
  const where = { studentId: sid, ...(tid && { teacherId: tid }), ...(taskId && { taskId }) };
  const list = await prisma.message.findMany({ where, orderBy: { createdAt: 'asc' }, take: 200 });
  await prisma.message.updateMany({
    where: { ...where, senderId: { not: req.user.id }, readAt: null },
    data: { readAt: new Date() },
  });
  res.json(list);
});

router.get('/student/chats', requireAuth('student'), async (req, res) => {
  const studentId = req.user.id;
  const messages = await prisma.message.findMany({
    where: { studentId }, orderBy: { createdAt: 'desc' },
    include: {
      teacher: { select: { id: true, name: true } },
      task: { select: { id: true, title: true } },
    },
  });
  const map = new Map();
  for (const m of messages) {
    const key = `${m.teacherId}-${m.taskId || 'general'}`;
    if (!map.has(key)) {
      const unread = await prisma.message.count({
        where: { teacherId: m.teacherId, studentId, taskId: m.taskId, senderRole: 'teacher', readAt: null },
      });
      map.set(key, {
        teacherId: m.teacherId, teacherName: m.teacher.name,
        taskId: m.taskId, taskTitle: m.task?.title,
        lastMessage: m.text || '📎 فایل', lastAt: m.createdAt, unread,
      });
    }
  }
  res.json([...map.values()]);
});

router.post('/messages/upload', requireAuth('teacher', 'student'), upload.single('file'), async (req, res) => {
  const { taskId, studentId, teacherId, text = '' } = req.body;
  if (!req.file && !text.trim()) return res.status(400).json({ error: 'فایل یا متن لازم است' });
  const sid = req.user.role === 'student' ? req.user.id : studentId;
  const tid = req.user.role === 'teacher' ? req.user.id : teacherId;
  if (!sid || !tid) return res.status(400).json({ error: 'اطلاعات ناقص' });

  let fileUrl = null, fileType = null, fileName = null;
  if (req.file) {
    fileUrl = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
    fileName = req.file.originalname;
    fileType = req.file.mimetype.startsWith('image/') ? 'image'
             : req.file.mimetype === 'application/pdf' ? 'pdf' : 'file';
  }
  const msg = await prisma.message.create({
    data: {
      taskId: taskId || null, studentId: sid, teacherId: tid,
      senderId: req.user.id, senderRole: req.user.role,
      text: text.trim() || null,
      attachmentUrl: fileUrl, attachmentType: fileType, attachmentName: fileName,
    },
  });
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${sid}`).emit('message:new', msg);
    io.to(`user:${tid}`).emit('message:new', msg);
  }
  res.json(msg);
});

export default router;
