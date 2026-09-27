import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

import authRoutes from './routes/auth.js';
import superRoutes from './routes/super_admin.js';
import adminRoutes from './routes/admin.js';
import teacherRoutes from './routes/teacher.js';
import studentRoutes from './routes/student.js';
import publicRoutes from './routes/public.js';
import passwordRoutes from './routes/passwords.js';
import excelRoutes from './routes/excel.js';
import gradingRoutes from './routes/grading.js';
import messagesRoutes from './routes/messages.js';
import shareRoutes from './routes/share.js';
import { apiLimiter } from './rateLimit.js';
import { initSocket } from './socket.js';

cloudinary.config({ secure: true });

const prisma = new PrismaClient();
const app = express();

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '10mb' }));

async function ensureSuperAdmin() {
  const exists = await prisma.user.findFirst({ where: { role: 'super_admin' } });
  if (!exists) {
    await prisma.user.create({
      data: {
        name: 'مدیر کل سامانه',
        nationalId: 'super-admin',
        role: 'super_admin',
        passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || '550400113837', 10),
      },
    });
    console.log('✅ مدیر کل ساخته شد');
  }
}
ensureSuperAdmin().catch(console.error);

app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/super', superRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api', apiLimiter, passwordRoutes);
app.use('/api', apiLimiter, excelRoutes);
app.use('/api', apiLimiter, gradingRoutes);
app.use('/api', apiLimiter, messagesRoutes);
app.use('/api', apiLimiter, shareRoutes);

app.get('/', (_req, res) => res.json({ ok: true, service: 'homework-api' }));

const server = http.createServer(app);
const io = initSocket(server, process.env.CORS_ORIGIN || '*');
app.set('io', io);

server.listen(process.env.PORT || 4000, () =>
  console.log(`🚀 API ready on ${process.env.PORT || 4000}`)
);
