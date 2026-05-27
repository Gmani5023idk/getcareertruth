import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clear existing data (optional, but good for a fresh start)
  // await prisma.booking.deleteMany();
  // await prisma.user.deleteMany();

  const passwordHash = '$2b$10$qbEAmzq69jDk7C7WLgkwz.GmsH4Z5nl9WTV94eRtaZQ12Ci6ayGZK'; // hash for 'password123'

  // 1. Create Student
  const student = await prisma.user.upsert({
    where: { email: 'student@test.com' },
    update: {},
    create: {
      email: 'student@test.com',
      passwordHash,
      role: 'STUDENT',
      studentProfile: {
        create: {
          fullName: 'Test Student',
          educationType: 'COLLEGE',
          collegeName: 'Test University',
          degree: 'B.Tech',
          branch: 'CSE',
        },
      },
    },
  });
  console.log('Created student:', student.email);

  // 2. Create Employee
  const employee = await prisma.user.upsert({
    where: { email: 'employee@test.com' },
    update: {},
    create: {
      email: 'employee@test.com',
      passwordHash,
      role: 'EMPLOYEE',
      employeeProfile: {
        create: {
          fullName: 'Test Employee',
          company: 'Test Corp',
          jobTitle: 'Software Engineer',
          industry: 'Tech',
          yearsExp: 5,
          bio: 'Passionate about helping students.',
          pricePerCall: 29900, // ₹299.00
          availabilitySlots: [
            { day: 'Monday', slots: ['09:00', '10:00', '11:00', '14:00', '15:00'] },
            { day: 'Tuesday', slots: ['09:00', '10:00', '11:00', '14:00', '15:00'] },
            { day: 'Wednesday', slots: ['09:00', '10:00', '11:00', '14:00', '15:00'] },
            { day: 'Thursday', slots: ['09:00', '10:00', '11:00', '14:00', '15:00'] },
            { day: 'Friday', slots: ['09:00', '10:00', '11:00', '14:00', '15:00'] },
            { day: 'Saturday', slots: ['10:00', '11:00'] },
            { day: 'Sunday', slots: ['10:00', '11:00'] },
          ],
          topics: ['Career Path', 'Interview Prep', 'Resume Review'],
        },
      },
    },
  });
  console.log('Created employee:', employee.email);

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
