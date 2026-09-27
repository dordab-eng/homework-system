// ================================================
//  اسکریپت ساخت خودکار پروژه سامانه مدیریت تکالیف
//  فقط یک‌بار این فایل رو اجرا کن
// ================================================

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

function mkdir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}
function write(p, content) {
  const full = path.join(ROOT, p);
  mkdir(path.dirname(full));
  fs.writeFileSync(full, content.trim() + '\n', 'utf8');
  console.log('✅', p);
}

console.log('\n🚀 شروع ساخت پروژه...\n');

// ---------- BACKEND ----------
mkdir('backend/src/routes');
mkdir('backend/prisma');
mkdir('frontend/src/pages');
mkdir('frontend/src/components');
mkdir('frontend/public');

write('backend/package.json', `
{
  "name": "homework-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js",
    "migrate": "prisma migrate deploy",
    "generate": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^5.20.0",
    "bcryptjs": "^2.4.3",
    "cloudinary": "^2.5.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "exceljs": "^4.4.0",
    "express": "^4.21.0",
    "express-rate-limit": "^7.4.0",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "nanoid": "^5.0.7",
    "socket.io": "^4.8.0",
    "web-push": "^3.6.7"
  },
  "devDependencies": {
    "prisma": "^5.20.0"
  }
}
`);

write('backend/.env', `
DATABASE_URL="postgresql://user:password@localhost:5432/homework"
JWT_SECRET="change-this-to-a-long-random-string"
ADMIN_PASSWORD="550400113837"
CLOUDINARY_URL="cloudinary://KEY:SECRET@CLOUD_NAME"
VAPID_PUBLIC=""
VAPID_PRIVATE=""
VAPID_SUBJECT="mailto:admin@example.com"
CORS_ORIGIN="*"
PORT=4000
`);

write('backend/prisma/schema.prisma', `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  name         String
  nationalId   String   @unique
  role         String
  passwordHash String?
  status       String   @default("active")
  schoolId     String?
  gradeId      String?
  createdAt    DateTime @default(now())

  school             School?  @relation("SchoolMembers", fields: [schoolId], references: [id])
  grade              Grade?   @relation(fields: [gradeId], references: [id])
  teacherAssignments TeacherAssignment[]
  tasks              Task[]
  submissions        Submission[]
  pushSubscription   PushSubscription?
  messagesAsStudent  Message[] @relation("StudentMessages")
  messagesAsTeacher  Message[] @relation("TeacherMessages")

  @@index([role, schoolId])
}

model School {
  id        String   @id @default(cuid())
  name      String
  code      String?  @unique
  address   String?
  phone     String?
  status    String   @default("active")
  createdAt DateTime @default(now())

  admins      User[]              @relation("SchoolMembers")
  grades      SchoolGrade[]
  assignments TeacherAssignment[]
  tasks       Task[]
}

model Grade {
  id           String @id @default(cuid())
  name         String @unique
  order        Int    @default(0)
  schoolGrades SchoolGrade[]
  students     User[]
}

model SchoolGrade {
  id       String @id @default(cuid())
  schoolId String
  gradeId  String
  school   School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  grade    Grade  @relation(fields: [gradeId], references: [id], onDelete: Cascade)
  @@unique([schoolId, gradeId])
}

model TeacherAssignment {
  id        String @id @default(cuid())
  teacherId String
  schoolId  String
  gradeId   String
  teacher   User   @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  school    School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  grade     Grade  @relation(fields: [gradeId], references: [id], onDelete: Cascade)
  @@unique([teacherId, schoolId, gradeId])
}

model Task {
  id          String   @id @default(cuid())
  teacherId   String
  schoolId    String
  gradeId     String
  title       String
  description String
  startDate   DateTime
  deadline    DateTime
  status      String   @default("active")
  createdAt   DateTime @default(now())

  teacher     User       @relation(fields: [teacherId], references: [id])
  school      School     @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  grade       Grade      @relation(fields: [gradeId], references: [id])
  submissions Submission[]
  messages    Message[]
  shareLinks  ShareLink[]

  @@index([schoolId, gradeId, status])
}

model Submission {
  id          String   @id @default(cuid())
  taskId      String
  studentId   String
  imageUrl    String
  score       Int?
  feedback    String?
  gradedAt    DateTime?
  gradedBy    String?
  submittedAt DateTime @default(now())
  status      String   @default("submitted")
  task        Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  student     User     @relation(fields: [studentId], references: [id], onDelete: Cascade)
  @@unique([taskId, studentId])
}

model Message {
  id             String   @id @default(cuid())
  taskId         String?
  studentId      String
  teacherId      String
  senderId       String
  senderRole     String
  text           String?
  attachmentUrl  String?
  attachmentType String?
  attachmentName String?
  readAt         DateTime?
  createdAt      DateTime @default(now())

  task    Task? @relation(fields: [taskId], references: [id], onDelete: Cascade)
  student User  @relation("StudentMessages", fields: [studentId], references: [id], onDelete: Cascade)
  teacher User  @relation("TeacherMessages", fields: [teacherId], references: [id], onDelete: Cascade)

  @@index([taskId, studentId])
  @@index([teacherId, studentId])
}

model ShareLink {
  id        String   @id @default(cuid())
  slug      String   @unique
  taskId    String
  createdBy String
  expiresAt DateTime?
  views     Int      @default(0)
  createdAt DateTime @default(now())
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  @@index([slug])
}

model PushSubscription {
  id        String   @id @default(cuid())
  userId    String   @unique
  data      Json
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
`);

write('backend/src/auth.js', `
import jwt from 'jsonwebtoken';

export function sign(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      name: user.name,
      schoolId: user.schoolId || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function requireAuth(...allowedRoles) {
  return (req, res, next) => {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'توکن نامعتبر' });

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload;
      if (allowedRoles.length && !allowedRoles.includes(payload.role)) {
        return res.status(403).json({ error: 'دسترسی ندارید' });
      }
      next();
    } catch {
      return res.status(401).json({ error: 'توکن نامعتبر' });
    }
  };
}

export const auth = requireAuth;
`);

write('backend/src/rateLimit.js', `
import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'تلاش‌های زیادی انجام شده. لطفاً بعداً امتحان کنید.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'تعداد ارسال‌ها زیاد است.' },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'تعداد درخواست‌ها زیاد است.' },
  standardHeaders: true,
  legacyHeaders: false,
});
`);

write('backend/src/upload.js', `
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
    cb(ok ? null : new Error('فرمت فایل پشتیبانی نمی‌شود'), ok);
  },
});

export async function uploadToCloudinary(buffer, mimeType = 'image/jpeg') {
  const resourceType = mimeType === 'application/pdf' ? 'raw' : 'image';
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'homework', resource_type: resourceType },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    ).end(buffer);
  });
}
`);

write('backend/src/tenant.js', `
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function allowedSchools(user) {
  if (user.role === 'super_admin') {
    return (await prisma.school.findMany({ select: { id: true } })).map((s) => s.id);
  }
  if (user.role === 'admin') {
    return user.schoolId ? [user.schoolId] : [];
  }
  if (user.role === 'teacher') {
    const rows = await prisma.teacherAssignment.findMany({
      where: { teacherId: user.id },
      select: { schoolId: true },
      distinct: ['schoolId'],
    });
    return rows.map((r) => r.schoolId);
  }
  return [];
}

export async function canAccessSchool(user, schoolId) {
  const list = await allowedSchools(user);
  return list.includes(schoolId);
}
`);

write('backend/src/push.js', `
import webpush from 'web-push';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

if (process.env.VAPID_PUBLIC && process.env.VAPID_PRIVATE) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC,
    process.env.VAPID_PRIVATE
  );
}

export function getPublicKey() {
  return process.env.VAPID_PUBLIC || '';
}

export async function saveSubscription(userId, subscription) {
  await prisma.pushSubscription.upsert({
    where: { userId },
    update: { data: subscription },
    create: { userId, data: subscription },
  });
}

export async function sendToUser(userId, payload) {
  if (!process.env.VAPID_PUBLIC) return null;
  const sub = await prisma.pushSubscription.findUnique({ where: { userId } });
  if (!sub) return null;
  try {
    await webpush.sendNotification(sub.data, JSON.stringify(payload));
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      await prisma.pushSubscription.delete({ where: { userId } });
    }
  }
}

export async function sendToUsers(userIds, payload) {
  await Promise.allSettled(userIds.map((id) => sendToUser(id, payload)));
}

export const sendToStudents = sendToUsers;
`);

write('backend/src/socket.js', `
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
    socket.join(\`user:\${user.id}\`);

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

        io.to(\`user:\${studentId}\`).emit('message:new', msg);
        io.to(\`user:\${teacherId}\`).emit('message:new', msg);

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
        io.to(\`user:\${studentId}\`).emit('message:read:update', { taskId, studentId, teacherId });
        io.to(\`user:\${teacherId}\`).emit('message:read:update', { taskId, studentId, teacherId });
      } catch (e) { console.error(e); }
    });
  });

  return io;
}
`);

write('backend/src/index.js', `
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
  console.log(\`🚀 API ready on \${process.env.PORT || 4000}\`)
);
`);

write('backend/src/routes/auth.js', `
import express from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { sign } from '../auth.js';
import { loginLimiter } from '../rateLimit.js';

const router = express.Router();
const prisma = new PrismaClient();

router.post('/super/login', loginLimiter, async (req, res) => {
  const { password } = req.body;
  const admin = await prisma.user.findFirst({ where: { role: 'super_admin' } });
  if (!admin) return res.status(500).json({ error: 'مدیر کل یافت نشد' });
  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return res.status(401).json({ error: 'رمز اشتباه است' });
  res.json({ token: sign(admin), name: admin.name, role: admin.role });
});

router.post('/admin/login', loginLimiter, async (req, res) => {
  const { nationalId, password } = req.body;
  const a = await prisma.user.findUnique({ where: { nationalId } });
  if (!a || a.role !== 'admin' || a.status !== 'active')
    return res.status(401).json({ error: 'کاربر یافت نشد' });
  const ok = await bcrypt.compare(password, a.passwordHash || '');
  if (!ok) return res.status(401).json({ error: 'رمز اشتباه است' });
  res.json({ token: sign(a), name: a.name, role: a.role, schoolId: a.schoolId });
});

router.post('/teacher/login', loginLimiter, async (req, res) => {
  const { nationalId, password } = req.body;
  const t = await prisma.user.findUnique({ where: { nationalId } });
  if (!t || t.role !== 'teacher' || t.status !== 'active')
    return res.status(401).json({ error: 'کاربر یافت نشد' });
  const ok = await bcrypt.compare(password, t.passwordHash || '');
  if (!ok) return res.status(401).json({ error: 'رمز اشتباه است' });
  res.json({ token: sign(t), name: t.name, role: t.role });
});

router.post('/student/login', loginLimiter, async (req, res) => {
  const { name, schoolId, gradeId } = req.body;
  if (!name || !schoolId || !gradeId)
    return res.status(400).json({ error: 'اطلاعات ناقص است' });

  const sg = await prisma.schoolGrade.findFirst({ where: { schoolId, gradeId } });
  if (!sg) return res.status(400).json({ error: 'این پایه در مدرسه فعال نیست' });

  let student = await prisma.user.findFirst({
    where: { role: 'student', name, schoolId, gradeId },
  });

  if (!student) {
    student = await prisma.user.create({
      data: {
        name, role: 'student',
        nationalId: \`std-\${Date.now()}-\${Math.random().toString(36).slice(2, 6)}\`,
        schoolId, gradeId,
      },
    });
  }

  res.json({ token: sign(student), name: student.name, role: student.role });
});

export default router;
`);

write('backend/src/routes/public.js', `
import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/schools', async (_req, res) => {
  const schools = await prisma.school.findMany({
    where: { status: 'active' },
    include: { grades: { include: { grade: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(schools.map((s) => ({
    id: s.id, name: s.name,
    grades: s.grades.map((g) => g.grade).sort((a, b) => a.order - b.order)
      .map((g) => ({ id: g.id, name: g.name })),
  })));
});

export default router;
`);

write('backend/src/routes/super_admin.js', `
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
  const { name, nationalId, password, assignments = [] } = req.body;
  const hash = await bcrypt.hash(password, 10);
  res.json(await prisma.user.create({
    data: {
      name, nationalId, role: 'teacher', passwordHash: hash,
      teacherAssignments: { create: assignments },
    },
  }));
});

router.delete('/teachers/:id', onlySuper, async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
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
`);

write('backend/src/routes/admin.js', `
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
`);

write('backend/src/routes/teacher.js', `
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
`);

write('backend/src/routes/student.js', `
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
`);

write('backend/src/routes/passwords.js', `
import express from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.put('/super/password', requireAuth('super_admin'), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ error: 'رمز جدید حداقل ۶ کاراکتر باشد' });
  const admin = await prisma.user.findFirst({ where: { role: 'super_admin' } });
  const ok = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!ok) return res.status(401).json({ error: 'رمز فعلی اشتباه است' });
  await prisma.user.update({
    where: { id: admin.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 10) },
  });
  res.json({ ok: true });
});

router.put('/admin/password', requireAuth('admin'), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ error: 'رمز جدید حداقل ۶ کاراکتر باشد' });
  const u = await prisma.user.findUnique({ where: { id: req.user.id } });
  const ok = await bcrypt.compare(currentPassword, u.passwordHash || '');
  if (!ok) return res.status(401).json({ error: 'رمز فعلی اشتباه است' });
  await prisma.user.update({
    where: { id: u.id }, data: { passwordHash: await bcrypt.hash(newPassword, 10) },
  });
  res.json({ ok: true });
});

router.put('/teacher/password', requireAuth('teacher'), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ error: 'رمز جدید حداقل ۶ کاراکتر باشد' });
  const t = await prisma.user.findUnique({ where: { id: req.user.id } });
  const ok = await bcrypt.compare(currentPassword, t.passwordHash || '');
  if (!ok) return res.status(401).json({ error: 'رمز فعلی اشتباه است' });
  await prisma.user.update({
    where: { id: t.id }, data: { passwordHash: await bcrypt.hash(newPassword, 10) },
  });
  res.json({ ok: true });
});

router.put('/admin/teachers/:id/password', requireAuth('admin', 'super_admin'), async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ error: 'رمز باید حداقل ۶ کاراکتر باشد' });
  await prisma.user.update({
    where: { id: req.params.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 10) },
  });
  res.json({ ok: true });
});

export default router;
`);

write('backend/src/routes/grading.js', `
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
`);

write('backend/src/routes/messages.js', `
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
    const key = \`\${m.studentId}-\${m.taskId || 'general'}\`;
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
    const key = \`\${m.teacherId}-\${m.taskId || 'general'}\`;
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
    io.to(\`user:\${sid}\`).emit('message:new', msg);
    io.to(\`user:\${tid}\`).emit('message:new', msg);
  }
  res.json(msg);
});

export default router;
`);

write('backend/src/routes/share.js', `
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
  res.json({ slug: link.slug, url: \`/share/\${link.slug}\` });
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
`);

write('backend/src/routes/excel.js', `
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
  res.setHeader('Content-Disposition', \`attachment; filename="task-\${task.id}.xlsx"\`);
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
`);

// ---------- FRONTEND ----------
write('frontend/package.json', `
{
  "name": "homework-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.7.7",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2",
    "recharts": "^2.13.0",
    "socket.io-client": "^4.8.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.2",
    "vite": "^5.4.8",
    "vite-plugin-pwa": "^0.20.5"
  }
}
`);

write('frontend/index.html', `
<!doctype html>
<html lang="fa" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>سامانه مدیریت و ارسال تکالیف</title>
    <link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`);

write('frontend/vite.config.js', `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:4000' } },
});
`);

write('frontend/src/styles.css', `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Vazirmatn', system-ui, sans-serif; background: #f5f7fb; color: #1e293b; }
.container { max-width: 900px; margin: 0 auto; padding: 20px; }
.home { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; gap: 32px; }
.home h1 { font-size: 26px; text-align: center; color: #0f172a; }
.roles { display: flex; flex-direction: column; gap: 16px; width: 100%; max-width: 380px; }
.role-btn { display: flex; align-items: center; gap: 14px; background: #fff; border: 2px solid #e2e8f0; border-radius: 16px; padding: 20px; font-size: 18px; font-weight: 600; cursor: pointer; transition: .2s; color: #0f172a; font-family: inherit; }
.role-btn:hover { border-color: #6366f1; box-shadow: 0 8px 24px rgba(99,102,241,.15); }
.role-btn .emoji { font-size: 32px; }
.card { background: #fff; border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,.05); margin-bottom: 16px; }
input, textarea, select { width: 100%; padding: 14px; border-radius: 12px; border: 1.5px solid #e2e8f0; font-family: inherit; font-size: 16px; background: #fff; }
input:focus, textarea:focus, select:focus { outline: none; border-color: #6366f1; }
label { display: block; margin: 12px 0 6px; font-weight: 500; font-size: 14px; }
.btn { background: #6366f1; color: #fff; border: none; border-radius: 12px; padding: 14px 20px; font-size: 16px; font-weight: 600; cursor: pointer; width: 100%; font-family: inherit; margin-top: 12px; }
.btn:hover { background: #4f46e5; }
.btn.secondary { background: #e2e8f0; color: #0f172a; }
.btn.danger { background: #ef4444; }
.grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(150px,1fr)); gap: 12px; }
.stat { background: #fff; padding: 16px; border-radius: 14px; text-align: center; }
.stat .num { font-size: 28px; font-weight: 700; color: #6366f1; }
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: #fff; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 10; }
.topbar h2 { font-size: 18px; }
.task-card { background: #fff; border-radius: 14px; padding: 16px; margin-bottom: 12px; border-right: 4px solid #6366f1; }
.task-card h3 { margin-bottom: 6px; font-size: 17px; }
.task-card p { color: #64748b; font-size: 14px; }
.badge { display: inline-block; padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 600; }
.badge.ok { background: #dcfce7; color: #166534; }
.badge.warn { background: #fef3c7; color: #92400e; }
.badge.dang { background: #fee2e2; color: #991b1b; }
.submission { background: #fff; border-radius: 14px; padding: 16px; margin-bottom: 20px; }
.submission img { width: 100%; border-radius: 10px; margin-top: 10px; max-height: 400px; object-fit: contain; }
nav.tabs { display: flex; gap: 8px; overflow-x: auto; padding: 12px 20px; background: #fff; border-bottom: 1px solid #e2e8f0; }
nav.tabs button { padding: 10px 16px; border-radius: 10px; border: none; background: transparent; font-family: inherit; font-size: 14px; cursor: pointer; white-space: nowrap; }
nav.tabs button.active { background: #6366f1; color: #fff; }
.chat-box { background: #fff; border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; height: 380px; }
.chat-messages { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 8px; background: #f8fafc; }
.chat-bubble { max-width: 78%; padding: 8px 12px; border-radius: 14px; font-size: 14px; line-height: 1.55; word-wrap: break-word; }
.chat-bubble.mine { background: #6366f1; color: #fff; align-self: flex-end; }
.chat-bubble.theirs { background: #fff; color: #0f172a; align-self: flex-start; border: 1px solid #e2e8f0; }
.chat-time { font-size: 10px; margin-top: 4px; opacity: .75; }
.chat-input { display: flex; gap: 8px; padding: 10px; background: #fff; border-top: 1px solid #e2e8f0; }
.chat-input input { flex: 1; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.calendar-head { text-align: center; font-weight: 600; font-size: 13px; color: #64748b; padding: 8px 0; }
.calendar-cell { aspect-ratio: 1; background: #f8fafc; border-radius: 10px; padding: 6px; position: relative; font-size: 14px; }
.calendar-cell.empty { background: transparent; }
.calendar-cell.today { background: #eef2ff; border: 2px solid #6366f1; }
.calendar-cell.has-tasks { background: #fef3c7; }
.calendar-badge { position: absolute; bottom: 4px; left: 4px; background: #6366f1; color: #fff; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; }
`);

write('frontend/src/api.js', `
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('token');
  if (t) cfg.headers.Authorization = \`Bearer \${t}\`;
  return cfg;
});

export function setToken(t) {
  if (t) localStorage.setItem('token', t);
  else localStorage.removeItem('token');
}
export function getToken() { return localStorage.getItem('token'); }
`);

write('frontend/src/socket.js', `
import { io } from 'socket.io-client';
import { getToken } from './api.js';

let socket = null;

export function getSocket() {
  if (!socket) {
    const url = (import.meta.env.VITE_API_URL || '').replace('/api', '') || window.location.origin;
    socket = io(url, { auth: { token: getToken() }, transports: ['websocket'] });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}
`);

write('frontend/src/main.jsx', `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
`);

write('frontend/src/App.jsx', `
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import SuperLogin from './pages/SuperLogin.jsx';
import SuperDashboard from './pages/SuperDashboard.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import TeacherLogin from './pages/TeacherLogin.jsx';
import TeacherDashboard from './pages/TeacherDashboard.jsx';
import StudentLogin from './pages/StudentLogin.jsx';
import StudentHome from './pages/StudentHome.jsx';
import StudentReport from './pages/StudentReport.jsx';
import TaskDetail from './pages/TaskDetail.jsx';
import PublicTask from './pages/PublicTask.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/super/login" element={<SuperLogin />} />
      <Route path="/super/*" element={<SuperDashboard />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/*" element={<AdminDashboard />} />
      <Route path="/teacher/login" element={<TeacherLogin />} />
      <Route path="/teacher/*" element={<TeacherDashboard />} />
      <Route path="/student/login" element={<StudentLogin />} />
      <Route path="/student" element={<StudentHome />} />
      <Route path="/student/report" element={<StudentReport />} />
      <Route path="/student/task/:id" element={<TaskDetail />} />
      <Route path="/share/:slug" element={<PublicTask />} />
    </Routes>
  );
}
`);

write('frontend/src/pages/Home.jsx', `
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const nav = useNavigate();
  return (
    <div className="home">
      <h1>سامانه مدیریت و ارسال تکالیف</h1>
      <div className="roles">
        <button className="role-btn" onClick={() => nav('/student/login')}>
          <span className="emoji">👨‍🎓</span> ورود دانش‌آموز
        </button>
        <button className="role-btn" onClick={() => nav('/teacher/login')}>
          <span className="emoji">👨‍🏫</span> ورود دبیر
        </button>
        <button className="role-btn" onClick={() => nav('/admin/login')}>
          <span className="emoji">🏫</span> ورود مدیر مدرسه
        </button>
        <button className="role-btn" style={{ borderColor: '#cbd5e1', fontSize: 15 }} onClick={() => nav('/super/login')}>
          <span className="emoji">🛡️</span> ورود مدیر کل
        </button>
      </div>
    </div>
  );
}
`);

write('frontend/src/pages/SuperLogin.jsx', `
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api.js';

export default function SuperLogin() {
  const nav = useNavigate();
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  async function login() {
    try {
      const { data } = await api.post('/auth/super/login', { password });
      setToken(data.token);
      localStorage.setItem('role', 'super_admin');
      nav('/super');
    } catch (e) { setErr(e.response?.data?.error || 'خطا'); }
  }

  return (
    <div className="container" style={{ maxWidth: 400, marginTop: 60 }}>
      <div className="card">
        <h2 style={{ marginBottom: 16 }}>🛡️ ورود مدیر کل</h2>
        <label>رمز عبور</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login()} />
        {err && <p style={{ color: 'red', marginTop: 8 }}>{err}</p>}
        <button className="btn" onClick={login}>ورود</button>
      </div>
    </div>
  );
}
`);

write('frontend/src/pages/AdminLogin.jsx', `
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api.js';

export default function AdminLogin() {
  const nav = useNavigate();
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  async function login() {
    try {
      const { data } = await api.post('/auth/admin/login', { nationalId, password });
      setToken(data.token);
      localStorage.setItem('role', 'admin');
      nav('/admin');
    } catch (e) { setErr(e.response?.data?.error || 'خطا'); }
  }

  return (
    <div className="container" style={{ maxWidth: 400, marginTop: 60 }}>
      <div className="card">
        <h2 style={{ marginBottom: 16 }}>🏫 ورود مدیر مدرسه</h2>
        <label>کد ملی</label>
        <input value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
        <label>رمز عبور</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login()} />
        {err && <p style={{ color: 'red', marginTop: 8 }}>{err}</p>}
        <button className="btn" onClick={login}>ورود</button>
      </div>
    </div>
  );
}
`);

write('frontend/src/pages/TeacherLogin.jsx', `
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api.js';

export default function TeacherLogin() {
  const nav = useNavigate();
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  async function login() {
    try {
      const { data } = await api.post('/auth/teacher/login', { nationalId, password });
      setToken(data.token);
      localStorage.setItem('role', 'teacher');
      nav('/teacher');
    } catch (e) { setErr(e.response?.data?.error || 'خطا'); }
  }

  return (
    <div className="container" style={{ maxWidth: 400, marginTop: 60 }}>
      <div className="card">
        <h2 style={{ marginBottom: 16 }}>👨‍🏫 ورود دبیر</h2>
        <label>کد ملی</label>
        <input value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
        <label>رمز عبور</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login()} />
        {err && <p style={{ color: 'red', marginTop: 8 }}>{err}</p>}
        <button className="btn" onClick={login}>ورود</button>
      </div>
    </div>
  );
}
`);

write('frontend/src/pages/StudentLogin.jsx', `
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api.js';

export default function StudentLogin() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [schools, setSchools] = useState([]);
  const [schoolId, setSchoolId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/public/schools').then((r) => setSchools(r.data)).catch(() => setErr('خطا در اتصال به سرور'));
  }, []);

  const grades = useMemo(() => {
    const school = schools.find((s) => s.id === schoolId);
    return school?.grades || [];
  }, [schoolId, schools]);

  async function login() {
    try {
      const { data } = await api.post('/auth/student/login', { name, schoolId, gradeId });
      setToken(data.token);
      localStorage.setItem('role', 'student');
      nav('/student');
    } catch (e) { setErr(e.response?.data?.error || 'خطا'); }
  }

  return (
    <div className="container" style={{ maxWidth: 400, marginTop: 60 }}>
      <div className="card">
        <h2 style={{ marginBottom: 16 }}>👨‍🎓 ورود دانش‌آموز</h2>
        <label>نام و نام خانوادگی</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <label>مدرسه</label>
        <select value={schoolId} onChange={(e) => { setSchoolId(e.target.value); setGradeId(''); }}>
          <option value="">انتخاب کنید</option>
          {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <label>پایه</label>
        <select value={gradeId} onChange={(e) => setGradeId(e.target.value)} disabled={!schoolId}>
          <option value="">انتخاب کنید</option>
          {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        {err && <p style={{ color: 'red', marginTop: 8 }}>{err}</p>}
        <button className="btn" onClick={login}>ورود</button>
      </div>
    </div>
  );
}
`);

write('frontend/src/pages/SuperDashboard.jsx', `
import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function SuperDashboard() {
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState({});
  const [schools, setSchools] = useState([]);
  const [grades, setGrades] = useState([]);
  const [teachers, setTeachers] = useState([]);

  async function load() {
    const [s, sc, g, t] = await Promise.all([
      api.get('/super/stats'),
      api.get('/super/schools'),
      api.get('/super/grades/all'),
      api.get('/super/teachers'),
    ]);
    setStats(s.data); setSchools(sc.data); setGrades(g.data); setTeachers(t.data);
  }
  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="topbar">
        <h2>🛡️ پنل مدیر کل</h2>
        <button className="btn secondary" style={{ width: 'auto', margin: 0, padding: '8px 14px' }} onClick={() => { localStorage.clear(); location.href = '/'; }}>خروج</button>
      </div>
      <nav className="tabs">
        {[['stats','📊 داشبورد'],['schools','🏫 مدارس'],['grades','📚 پایه‌ها'],['teachers','👨‍🏫 دبیران']].map(([k,l]) => (
          <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </nav>
      <div className="container">
        {tab === 'stats' && (
          <div className="grid">
            <div className="stat"><div className="num">{stats.schools || 0}</div>مدارس</div>
            <div className="stat"><div className="num">{stats.admins || 0}</div>مدیران</div>
            <div className="stat"><div className="num">{stats.teachers || 0}</div>دبیران</div>
            <div className="stat"><div className="num">{stats.students || 0}</div>دانش‌آموزان</div>
            <div className="stat"><div className="num">{stats.tasks || 0}</div>تکالیف</div>
            <div className="stat"><div className="num">{stats.submissions || 0}</div>ارسال‌ها</div>
          </div>
        )}
        {tab === 'schools' && <SchoolsTab schools={schools} grades={grades} onChange={load} />}
        {tab === 'grades' && <GradesTab grades={grades} onChange={load} />}
        {tab === 'teachers' && <TeachersTab teachers={teachers} schools={schools} onChange={load} />}
      </div>
    </div>
  );
}

function SchoolsTab({ schools, grades, onChange }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', gradeIds: [], admin: { name: '', nationalId: '', password: '' } });

  function toggleGrade(id) {
    setForm((f) => ({ ...f, gradeIds: f.gradeIds.includes(id) ? f.gradeIds.filter((x) => x !== id) : [...f.gradeIds, id] }));
  }

  async function save() {
    if (!form.name) return alert('نام مدرسه را وارد کنید');
    const { admin, ...school } = form;
    const { data: created } = await api.post('/super/schools', school);
    if (admin.name && admin.nationalId && admin.password) {
      await api.post(\`/super/schools/\${created.id}/admins\`, admin);
    }
    setShowForm(false);
    setForm({ name: '', code: '', gradeIds: [], admin: { name: '', nationalId: '', password: '' } });
    onChange();
  }

  async function remove(id) {
    if (confirm('حذف مدرسه و همه داده‌هایش؟')) { await api.delete(\`/super/schools/\${id}\`); onChange(); }
  }

  return (
    <>
      <button className="btn" style={{ marginBottom: 16 }} onClick={() => setShowForm(!showForm)}>
        {showForm ? 'بستن' : '+ افزودن مدرسه'}
      </button>
      {showForm && (
        <div className="card">
          <label>نام مدرسه</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <label>کد (اختیاری)</label>
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <label>پایه‌های فعال</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {grades.map((g) => (
              <button key={g.id} type="button" className="btn secondary"
                style={{ width: 'auto', margin: 0, padding: '8px 14px', background: form.gradeIds.includes(g.id) ? '#6366f1' : undefined, color: form.gradeIds.includes(g.id) ? '#fff' : undefined }}
                onClick={() => toggleGrade(g.id)}>{g.name}</button>
            ))}
          </div>
          <h3 style={{ marginTop: 20 }}>مدیر مدرسه (اختیاری)</h3>
          <label>نام مدیر</label>
          <input value={form.admin.name} onChange={(e) => setForm({ ...form, admin: { ...form.admin, name: e.target.value } })} />
          <label>کد ملی مدیر</label>
          <input value={form.admin.nationalId} onChange={(e) => setForm({ ...form, admin: { ...form.admin, nationalId: e.target.value } })} />
          <label>رمز مدیر</label>
          <input value={form.admin.password} onChange={(e) => setForm({ ...form, admin: { ...form.admin, password: e.target.value } })} />
          <button className="btn" onClick={save}>ذخیره مدرسه</button>
        </div>
      )}
      {schools.map((s) => (
        <div key={s.id} className="card" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <h3>{s.name}</h3>
            <p style={{ marginTop: 6, fontSize: 14 }}><b>پایه‌ها:</b> {s.grades.map((g) => g.grade.name).join('، ') || '—'}</p>
            <p style={{ fontSize: 14 }}><b>دبیران:</b> {s._count.assignments} | <b>تکالیف:</b> {s._count.tasks}</p>
            <p style={{ fontSize: 14 }}><b>مدیران:</b> {s.admins.map((a) => a.name).join('، ') || 'تعیین نشده'}</p>
          </div>
          <button className="btn danger" style={{ width: 'auto', margin: 0, padding: '8px 14px' }} onClick={() => remove(s.id)}>حذف</button>
        </div>
      ))}
    </>
  );
}

function GradesTab({ grades, onChange }) {
  const [name, setName] = useState('');
  const [order, setOrder] = useState(0);
  async function add() {
    if (!name) return;
    await api.post('/super/grades', { name, order: Number(order) });
    setName(''); setOrder(0); onChange();
  }
  return (
    <>
      <div className="card">
        <label>نام پایه</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: دهم ریاضی" />
        <label>ترتیب نمایش</label>
        <input type="number" value={order} onChange={(e) => setOrder(e.target.value)} />
        <button className="btn" onClick={add}>افزودن پایه</button>
      </div>
      {grades.map((g) => (
        <div key={g.id} className="card" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{g.name} (ترتیب: {g.order})</span>
        </div>
      ))}
    </>
  );
}

function TeachersTab({ teachers, schools, onChange }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', nationalId: '', password: '', assignments: [] });
  const [sel, setSel] = useState({ schoolId: '', gradeId: '' });
  const availableGrades = schools.find((s) => s.id === sel.schoolId)?.grades || [];

  function addAssignment() {
    if (sel.schoolId && sel.gradeId) {
      const exists = form.assignments.some((a) => a.schoolId === sel.schoolId && a.gradeId === sel.gradeId);
      if (exists) return alert('قبلاً اضافه شده');
      setForm({ ...form, assignments: [...form.assignments, sel] });
    }
    setSel({ schoolId: '', gradeId: '' });
  }

  async function save() {
    if (!form.name || !form.nationalId || !form.password) return alert('اطلاعات ناقص');
    if (form.assignments.length === 0) return alert('حداقل یک مدرسه/پایه اضافه کن');
    await api.post('/super/teachers', form);
    setShowForm(false);
    setForm({ name: '', nationalId: '', password: '', assignments: [] });
    onChange();
  }

  async function remove(id) {
    if (confirm('حذف دبیر؟')) { await api.delete(\`/super/teachers/\${id}\`); onChange(); }
  }

  return (
    <>
      <button className="btn" style={{ marginBottom: 16 }} onClick={() => setShowForm(!showForm)}>
        {showForm ? 'بستن' : '+ افزودن دبیر'}
      </button>
      {showForm && (
        <div className="card">
          <label>نام و نام خانوادگی</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <label>کد ملی</label>
          <input value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} />
          <label>رمز عبور</label>
          <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <label>اختصاص مدرسه / پایه</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={sel.schoolId} onChange={(e) => setSel({ schoolId: e.target.value, gradeId: '' })} style={{ flex: 1, minWidth: 160 }}>
              <option value="">مدرسه</option>
              {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={sel.gradeId} onChange={(e) => setSel({ ...sel, gradeId: e.target.value })} style={{ flex: 1, minWidth: 130 }} disabled={!sel.schoolId}>
              <option value="">پایه</option>
              {availableGrades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <button className="btn secondary" style={{ width: 'auto', margin: 0 }} onClick={addAssignment}>افزودن</button>
          </div>
          <ul style={{ marginTop: 12, paddingRight: 20 }}>
            {form.assignments.map((a, i) => {
              const sc = schools.find((s) => s.id === a.schoolId);
              const gr = sc?.grades.find((g) => g.id === a.gradeId);
              return <li key={i}>{sc?.name} → {gr?.name}</li>;
            })}
          </ul>
          <button className="btn" onClick={save}>ذخیره دبیر</button>
        </div>
      )}
      {teachers.map((t) => (
        <div key={t.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <h3>{t.name}</h3>
              <p style={{ color: '#64748b', fontSize: 13 }}>کد ملی: {t.nationalId}</p>
              <div style={{ marginTop: 8 }}>
                {t.teacherAssignments.map((a, i) => (
                  <span key={i} style={{ display: 'inline-block', marginLeft: 8, marginTop: 4, padding: '4px 10px', background: '#eef2ff', borderRadius: 8, fontSize: 13 }}>
                    {a.school.name} • {a.grade.name}
                  </span>
                ))}
              </div>
            </div>
            <button className="btn danger" style={{ width: 'auto', margin: 0, padding: '8px 14px' }} onClick={() => remove(t.id)}>حذف</button>
          </div>
        </div>
      ))}
    </>
  );
}
`);

write('frontend/src/pages/AdminDashboard.jsx', `
import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function AdminDashboard() {
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState({});
  const [school, setSchool] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [students, setStudents] = useState([]);

  async function load() {
    const [s, sc, t, tk, st] = await Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/school'),
      api.get('/admin/teachers'),
      api.get('/admin/tasks'),
      api.get('/admin/students'),
    ]);
    setStats(s.data); setSchool(sc.data); setTeachers(t.data); setTasks(tk.data); setStudents(st.data);
  }
  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="topbar">
        <h2>🏫 {school?.name || 'پنل مدیر مدرسه'}</h2>
        <button className="btn secondary" style={{ width: 'auto', margin: 0, padding: '8px 14px' }} onClick={() => { localStorage.clear(); location.href = '/'; }}>خروج</button>
      </div>
      <nav className="tabs">
        {[['stats','📊 داشبورد'],['teachers','👨‍🏫 دبیران'],['students','👨‍🎓 دانش‌آموزان'],['tasks','📝 تکالیف']].map(([k,l]) => (
          <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </nav>
      <div className="container">
        {tab === 'stats' && (
          <div className="grid">
            <div className="stat"><div className="num">{stats.teachers || 0}</div>دبیران</div>
            <div className="stat"><div className="num">{stats.students || 0}</div>دانش‌آموزان</div>
            <div className="stat"><div className="num">{stats.tasks || 0}</div>تکالیف</div>
            <div className="stat"><div className="num">{stats.submissions || 0}</div>ارسال‌ها</div>
          </div>
        )}
        {tab === 'teachers' && <TeachersTab teachers={teachers} school={school} onChange={load} />}
        {tab === 'students' && <StudentsTab students={students} school={school} />}
        {tab === 'tasks' && <TasksTab tasks={tasks} onChange={load} />}
      </div>
    </div>
  );
}

function TeachersTab({ teachers, school, onChange }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', nationalId: '', password: '', gradeIds: [] });
  const grades = school?.grades.map((g) => g.grade) || [];
  function toggleGrade(id) {
    setForm((f) => ({ ...f, gradeIds: f.gradeIds.includes(id) ? f.gradeIds.filter((x) => x !== id) : [...f.gradeIds, id] }));
  }
  async function save() {
    if (!form.name || !form.nationalId || !form.password) return alert('اطلاعات ناقص');
    if (form.gradeIds.length === 0) return alert('حداقل یک پایه انتخاب کن');
    await api.post('/admin/teachers', form);
    setShowForm(false);
    setForm({ name: '', nationalId: '', password: '', gradeIds: [] });
    onChange();
  }
  async function removeFromSchool(id) {
    if (confirm('حذف دبیر از این مدرسه؟')) { await api.delete(\`/admin/teachers/\${id}/school\`); onChange(); }
  }
  return (
    <>
      <button className="btn" style={{ marginBottom: 16 }} onClick={() => setShowForm(!showForm)}>
        {showForm ? 'بستن' : '+ افزودن دبیر به این مدرسه'}
      </button>
      {showForm && (
        <div className="card">
          <label>نام و نام خانوادگی</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <label>کد ملی</label>
          <input value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} />
          <label>رمز عبور</label>
          <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <label>پایه‌های تدریس</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {grades.map((g) => (
              <button key={g.id} type="button" className="btn secondary"
                style={{ width: 'auto', margin: 0, padding: '8px 14px', background: form.gradeIds.includes(g.id) ? '#6366f1' : undefined, color: form.gradeIds.includes(g.id) ? '#fff' : undefined }}
                onClick={() => toggleGrade(g.id)}>{g.name}</button>
            ))}
          </div>
          <button className="btn" onClick={save}>ذخیره</button>
        </div>
      )}
      {teachers.map((t) => (
        <div key={t.id} className="card" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <h3>{t.name}</h3>
            <p style={{ fontSize: 13, color: '#64748b' }}>کد ملی: {t.nationalId}</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>پایه‌ها: {t.teacherAssignments.map((a) => a.grade.name).join('، ')}</p>
          </div>
          <button className="btn danger" style={{ width: 'auto', margin: 0, padding: '8px 14px' }} onClick={() => removeFromSchool(t.id)}>حذف از مدرسه</button>
        </div>
      ))}
    </>
  );
}

function StudentsTab({ students, school }) {
  const [q, setQ] = useState('');
  const filtered = students.filter((s) => !q || s.name.includes(q));
  return (
    <>
      <div className="card">
        <input placeholder="جستجوی نام..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {filtered.map((s) => (
        <div key={s.id} className="card" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <h3>{s.name}</h3>
            <p style={{ fontSize: 13, color: '#64748b' }}>{s.grade.name}</p>
          </div>
          <span className="badge ok">{s._count.submissions} ارسال</span>
        </div>
      ))}
    </>
  );
}

function TasksTab({ tasks, onChange }) {
  async function remove(id) {
    if (confirm('حذف تکلیف؟')) { await api.delete(\`/admin/tasks/\${id}\`); onChange(); }
  }
  return (
    <>
      {tasks.map((t) => (
        <div key={t.id} className="task-card">
          <h3>{t.title}</h3>
          <p>{t.teacher.name} • {t.grade.name}</p>
          <p>مهلت: {new Date(t.deadline).toLocaleString('fa-IR')}</p>
          <p style={{ marginTop: 6 }}><span className="badge ok">{t._count.submissions} ارسال</span></p>
          <button className="btn danger" style={{ width: 'auto', marginTop: 10, padding: '8px 14px' }} onClick={() => remove(t.id)}>حذف تکلیف</button>
        </div>
      ))}
    </>
  );
}
`);

write('frontend/src/pages/TeacherDashboard.jsx', `
import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function TeacherDashboard() {
  const [tab, setTab] = useState('tasks');
  const [me, setMe] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [schoolId, setSchoolId] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);

  async function load() {
    const { data: m } = await api.get('/teacher/me');
    setMe(m);
    const stored = localStorage.getItem('activeSchool');
    const valid = m.schools.find((s) => s.id === stored);
    const active = valid?.id || m.schools[0]?.id || '';
    setSchoolId(active);
    localStorage.setItem('activeSchool', active);
    if (active) {
      const { data } = await api.get(\`/teacher/tasks?schoolId=\${active}\`);
      setTasks(data);
    }
  }
  useEffect(() => { load(); }, []);

  async function switchSchool(id) {
    setSchoolId(id);
    localStorage.setItem('activeSchool', id);
    const { data } = await api.get(\`/teacher/tasks?schoolId=\${id}\`);
    setTasks(data);
    setSelectedTask(null);
  }

  if (!me) return <div className="container" style={{ marginTop: 40 }}>در حال بارگذاری...</div>;
  const activeSchool = me.schools.find((s) => s.id === schoolId);
  const activeGrades = me.assignments.filter((a) => a.schoolId === schoolId).map((a) => ({ id: a.gradeId, name: a.gradeName }));

  return (
    <div>
      <div className="topbar">
        <div>
          <h2 style={{ fontSize: 16 }}>👨‍🏫 {me.name}</h2>
          {me.schools.length > 1 ? (
            <select value={schoolId} onChange={(e) => switchSchool(e.target.value)} style={{ marginTop: 6, padding: '6px 10px', fontSize: 14 }}>
              {me.schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          ) : (
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{activeSchool?.name}</p>
          )}
        </div>
        <button className="btn secondary" style={{ width: 'auto', margin: 0, padding: '8px 14px' }} onClick={() => { localStorage.clear(); location.href = '/'; }}>خروج</button>
      </div>
      <nav className="tabs">
        {[['tasks','📋 تکالیف'],['new','📝 ایجاد تکلیف']].map(([k,l]) => (
          <button key={k} className={tab === k ? 'active' : ''} onClick={() => { setTab(k); setSelectedTask(null); }}>{l}</button>
        ))}
      </nav>
      <div className="container">
        {tab === 'tasks' && !selectedTask && (
          <>
            {tasks.length === 0 && <p>تکلیفی ندارید.</p>}
            {tasks.map((t) => (
              <div key={t.id} className="task-card">
                <h3>{t.title}</h3>
                <p>{t.grade.name}</p>
                <p>مهلت: {new Date(t.deadline).toLocaleString('fa-IR')}</p>
                <p style={{ marginTop: 6 }}>
                  <span className={\`badge \${new Date(t.deadline) > new Date() ? 'ok' : 'warn'}\`}>
                    {new Date(t.deadline) > new Date() ? 'فعال' : 'منقضی'}
                  </span>{' '}
                  <span className="badge ok">{t._count.submissions} ارسال</span>
                </p>
                <button className="btn" style={{ marginTop: 10 }} onClick={() => setSelectedTask(t)}>مشاهده ارسال‌ها</button>
              </div>
            ))}
          </>
        )}
        {tab === 'tasks' && selectedTask && <Submissions task={selectedTask} onBack={() => setSelectedTask(null)} />}
        {tab === 'new' && <NewTask schoolId={schoolId} grades={activeGrades} onCreated={load} />}
      </div>
    </div>
  );
}

function NewTask({ schoolId, grades, onCreated }) {
  const [gradeId, setGradeId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [msg, setMsg] = useState('');
  async function save() {
    if (!gradeId || !title || !deadline) return alert('اطلاعات ناقص');
    await api.post('/teacher/tasks', {
      schoolId, gradeId, title, description,
      startDate: startDate || new Date().toISOString(), deadline,
    });
    setMsg('✅ تکلیف ایجاد شد');
    setTitle(''); setDescription(''); setDeadline('');
    setTimeout(onCreated, 800);
  }
  return (
    <div className="card">
      <h3 style={{ marginBottom: 12 }}>ایجاد تکلیف جدید</h3>
      <label>پایه</label>
      <select value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
        <option value="">انتخاب کنید</option>
        {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
      <label>عنوان</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <label>توضیحات</label>
      <textarea rows="4" value={description} onChange={(e) => setDescription(e.target.value)} />
      <label>تاریخ شروع</label>
      <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      <label>مهلت پایان</label>
      <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      {msg && <p style={{ color: 'green', marginTop: 10 }}>{msg}</p>}
      <button className="btn" onClick={save}>🚀 انتشار</button>
    </div>
  );
}

function Submissions({ task, onBack }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get(\`/teacher/task/\${task.id}/submissions\`).then((r) => setData(r.data));
  }, [task.id]);
  return (
    <>
      <button className="btn secondary" style={{ marginBottom: 12 }} onClick={onBack}>← بازگشت</button>
      <div className="card">
        <h3>{task.title}</h3>
        <p style={{ color: '#64748b', marginTop: 6 }}>{task.grade.name} • مهلت: {new Date(task.deadline).toLocaleString('fa-IR')}</p>
      </div>
      {!data && <p>در حال بارگذاری...</p>}
      {data && data.submissions?.length === 0 && <p>ارسالی نیست.</p>}
      {data && data.submissions?.map((s) => (
        <div key={s.id} className="submission">
          <h3>👨‍🎓 {s.student.name}</h3>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>زمان: {new Date(s.submittedAt).toLocaleString('fa-IR')}</p>
          <img src={s.imageUrl} alt="ارسال" loading="lazy" />
          {s.score != null && <p style={{ marginTop: 10, color: '#166534', fontWeight: 700 }}>نمره: {s.score} / ۱۰۰</p>}
          {s.feedback && <p style={{ color: '#166534', fontSize: 14 }}>💬 {s.feedback}</p>}
        </div>
      ))}
    </>
  );
}
`);

write('frontend/src/pages/StudentHome.jsx', `
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function StudentHome() {
  const nav = useNavigate();
  const [me, setMe] = useState(null);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    api.get('/student/me').then((r) => setMe(r.data));
    api.get('/student/tasks').then((r) => setTasks(r.data));
  }, []);

  return (
    <div>
      <div className="topbar">
        <h2>تکالیف من {me && \`— \${me.name}\`}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn secondary" style={{ width: 'auto', margin: 0, padding: '8px 14px' }} onClick={() => nav('/student/report')}>🎓 کارنامه</button>
          <button className="btn secondary" style={{ width: 'auto', margin: 0, padding: '8px 14px' }} onClick={() => { localStorage.clear(); location.href = '/'; }}>خروج</button>
        </div>
      </div>
      <div className="container">
        {tasks.length === 0 && <p style={{ marginTop: 20 }}>تکلیفی برای شما ثبت نشده.</p>}
        {tasks.map((t) => {
          const submitted = t.submissions.length > 0;
          const expired = new Date(t.deadline) < new Date();
          return (
            <div key={t.id} className="task-card" onClick={() => nav(\`/student/task/\${t.id}\`)} style={{ cursor: 'pointer' }}>
              <h3>{t.title}</h3>
              <p>{t.teacher.name}</p>
              <p>مهلت: {new Date(t.deadline).toLocaleString('fa-IR')}</p>
              <p style={{ marginTop: 8 }}>
                {submitted && <span className="badge ok">✅ ارسال شد</span>}
                {!submitted && expired && <span className="badge dang">مهلت تمام شد</span>}
                {!submitted && !expired && <span className="badge warn">در انتظار ارسال</span>}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
`);

write('frontend/src/pages/TaskDetail.jsx', `
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';

export default function TaskDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [task, setTask] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');
  const inputRef = useRef();

  async function load() {
    const { data } = await api.get('/student/tasks');
    setTask(data.find((x) => x.id === id));
  }
  useEffect(() => { load(); }, [id]);

  if (!task) return <div className="container" style={{ marginTop: 40 }}>در حال بارگذاری...</div>;
  const submitted = task.submissions[0];
  const expired = new Date(task.deadline) < new Date();

  function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function send() {
    if (!file) return alert('عکس را انتخاب کنید');
    setSending(true); setMsg('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      await api.post(\`/student/tasks/\${task.id}/submit\`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMsg('✅ ارسال شد');
      setFile(null); setPreview(null);
      await load();
    } catch (e) {
      setMsg(e.response?.data?.error || 'خطا');
    } finally { setSending(false); }
  }

  return (
    <div>
      <div className="topbar">
        <button className="btn secondary" style={{ width: 'auto', margin: 0, padding: '8px 14px' }} onClick={() => nav('/student')}>← بازگشت</button>
        <h2>جزئیات تکلیف</h2>
      </div>
      <div className="container">
        <div className="card">
          <h2>{task.title}</h2>
          <p style={{ marginTop: 8 }}><b>دبیر:</b> {task.teacher.name}</p>
          <p><b>مدرسه:</b> {task.school.name}</p>
          <p><b>پایه:</b> {task.grade.name}</p>
          <p style={{ marginTop: 8 }}><b>توضیحات:</b> {task.description}</p>
          <p style={{ marginTop: 8 }}><b>مهلت:</b> {new Date(task.deadline).toLocaleString('fa-IR')}</p>
        </div>

        {submitted && !file && (
          <div className="card" style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0' }}>
            <p style={{ color: '#166534', fontWeight: 600 }}>✅ ارسال شده</p>
            <img src={submitted.imageUrl} alt="ارسال" style={{ width: '100%', borderRadius: 12, marginTop: 10 }} />
            {submitted.score != null && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontWeight: 700, color: '#166534' }}>نمره: {submitted.score} / ۱۰۰</p>
                {submitted.feedback && <p style={{ marginTop: 6, color: '#166534' }}>💬 {submitted.feedback}</p>}
              </div>
            )}
          </div>
        )}

        {!expired && (
          <div className="card">
            <h3 style={{ marginBottom: 10 }}>📸 ارسال تکلیف</h3>
            <input ref={inputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onFile} />
            <button className="btn" onClick={() => inputRef.current.click()}>انتخاب عکس از گالری / دوربین</button>
            {preview && (
              <div style={{ marginTop: 16 }}>
                <img src={preview} alt="پیش‌نمایش" style={{ width: '100%', borderRadius: 12, maxHeight: 400, objectFit: 'contain' }} />
                <button className="btn" disabled={sending} onClick={send}>
                  {sending ? 'در حال ارسال...' : '✅ ثبت و ارسال'}
                </button>
              </div>
            )}
            {msg && <p style={{ marginTop: 10, color: msg.startsWith('✅') ? 'green' : 'red' }}>{msg}</p>}
          </div>
        )}

        {expired && !submitted && (
          <div className="card" style={{ background: '#fef2f2' }}>
            <p style={{ color: '#991b1b' }}>⏰ مهلت تمام شده</p>
          </div>
        )}
      </div>
    </div>
  );
}
`);

write('frontend/src/pages/StudentReport.jsx', `
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../api.js';

export default function StudentReport() {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/student/report').then((r) => setData(r.data)); }, []);
  if (!data) return <div className="container" style={{ marginTop: 40 }}>در حال بارگذاری...</div>;
  const { student, submissions, summary, teacherStats } = data;
  const progress = submissions.filter((s) => s.score != null)
    .slice().sort((a, b) => new Date(a.gradedAt || a.submittedAt) - new Date(b.gradedAt || b.submittedAt))
    .map((s, i) => ({ index: i + 1, score: s.score }));

  return (
    <div>
      <div className="topbar">
        <button className="btn secondary" style={{ width: 'auto', margin: 0, padding: '8px 14px' }} onClick={() => nav('/student')}>← بازگشت</button>
        <h2>🎓 کارنامه من</h2>
      </div>
      <div className="container">
        <div className="card">
          <h3>{student.name}</h3>
          <p style={{ color: '#64748b', marginTop: 4 }}>{student.school?.name} • {student.grade?.name}</p>
        </div>
        <div className="grid">
          <div className="stat"><div className="num">{summary.total}</div>کل</div>
          <div className="stat"><div className="num">{summary.graded}</div>تصحیح‌شده</div>
          <div className="stat"><div className="num">{summary.pending}</div>در انتظار</div>
          <div className="stat"><div className="num">{summary.average ?? '—'}</div>میانگین</div>
        </div>
        {progress.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>📈 نمودار پیشرفت</h3>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={progress}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="index" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip contentStyle={{ fontFamily: 'Vazirmatn', direction: 'rtl' }} />
                  <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {teacherStats.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>👨‍🏫 میانگین هر دبیر</h3>
            {teacherStats.map((t) => (
              <div key={t.teacherId} style={{ padding: 12, background: '#f8fafc', borderRadius: 10, marginBottom: 8 }}>
                <b>{t.teacherName}</b>: {t.avg} / ۱۰۰ ({t.count} تکلیف)
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
`);

write('frontend/src/pages/PublicTask.jsx', `
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';

export default function PublicTask() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api.get(\`/public/share/\${slug}\`).then((r) => setData(r.data)).catch((e) => setErr(e.response?.data?.error || 'خطا'));
  }, [slug]);
  if (err) return <div className="container" style={{ marginTop: 60, textAlign: 'center' }}><h2>❌ {err}</h2></div>;
  if (!data) return <div className="container" style={{ marginTop: 60 }}>در حال بارگذاری...</div>;
  return (
    <div className="container" style={{ marginTop: 40, maxWidth: 600 }}>
      <div className="card">
        <h1 style={{ fontSize: 22, marginBottom: 12 }}>{data.title}</h1>
        <p style={{ color: '#475569', lineHeight: 1.9, marginBottom: 16 }}>{data.description}</p>
        <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12 }}>
          <p><b>دبیر:</b> {data.teacher}</p>
          <p style={{ marginTop: 6 }}><b>مدرسه:</b> {data.school}</p>
          <p style={{ marginTop: 6 }}><b>پایه:</b> {data.grade}</p>
          <p style={{ marginTop: 6 }}><b>مهلت:</b> {new Date(data.deadline).toLocaleString('fa-IR')}</p>
        </div>
      </div>
    </div>
  );
}
`);

console.log('\\n🎉 تمام فایل‌ها ساخته شد!\\n');
console.log('📊 تعداد فایل‌ها: 40+');
console.log('\\nمراحل بعدی:');
console.log('1. در ترمینال VS Code برو به پوشه backend: cd backend');
console.log('2. اجرا کن: npm install');
console.log('3. سپس: npx prisma generate');
console.log('4. برگرد به ریشه و برو frontend: cd ../frontend');
console.log('5. اجرا کن: npm install');
console.log('\\n✅ آماده برای مرحله ۴');