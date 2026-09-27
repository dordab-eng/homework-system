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
