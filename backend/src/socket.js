import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { sendToUser } from './push.js';

const prisma = new PrismaClient();

export function initSocket(httpServer, corsOrigin = '*') {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('no token'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    socket.join(`user:${user.id}`);

    socket.on('message:send', async (payload, ack) => {
      try {
        const { taskId, studentId, teacherId, text } = payload;
        if (!text || !text.trim()) return ack?.({ error: 'پیام خالی است' });
        if (text.length > 1000) return ack?.({ error: 'پیام طولانی است' });

        if (user.role === 'student' && user.id !== studentId)
          return ack?.({ error: 'دسترسی ندارید' });
        if (user.role === 'teacher' && user.id !== teacherId)
          return ack?.({ error: 'دسترسی ندارید' });
        if (!['student', 'teacher'].includes(user.role))
          return ack?.({ error: 'نقش نامعتبر' });

        const msg = await prisma.message.create({
          data: {
            taskId: taskId || null,
            studentId, teacherId,
            senderId: user.id,
            senderRole: user.role,
            text: text.trim(),
          },
        });

        io.to(`user:${studentId}`).emit('message:new', msg);
        io.to(`user:${teacherId}`).emit('message:new', msg);

        const recipientId = user.role === 'student' ? teacherId : studentId;
        sendToUser(recipientId, {
          title: user.role === 'student' ? '💬 پیام جدید از دانش‌آموز' : '💬 پیام جدید از دبیر',
          body: text.slice(0, 60),
          url: user.role === 'student' ? '/teacher' : '/student',
        }).catch(() => {});

        ack?.({ ok: true, message: msg });
      } catch (e) {
        console.error(e);
        ack?.({ error: 'خطای سرور' });
      }
    });

    socket.on('message:read', async ({ taskId, studentId, teacherId }) => {
      try {
        await prisma.message.updateMany({
          where: {
            taskId: taskId || undefined,
            studentId, teacherId,
            senderId: { not: user.id },
            readAt: null,
          },
          data: { readAt: new Date() },
        });
        io.to(`user:${studentId}`).emit('message:read:update', { taskId, studentId, teacherId });
        io.to(`user:${teacherId}`).emit('message:read:update', { taskId, studentId, teacherId });
      } catch (e) { console.error(e); }
    });
  });

  return io;
}
