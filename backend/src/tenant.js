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
