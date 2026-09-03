import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  'Account and Access',
  'Hardware',
  'Software',
  'Network',
];

const relatedSystems = [
  'Corporate Laptop',
  'Email',
  'Campus Wi-Fi',
  'VPN',
  'LEB2 App',
  'Grade Submission App',
  'Printer',
];

const requesters = [
  {
    name: 'Jennifer Anderson',
    email: 'jennifer.anderson@toktickit.local',
    department: 'Human Resources',
    isActive: true,
  },
  {
    name: 'Michael Brown',
    email: 'michael.brown@toktickit.local',
    department: 'Engineering',
    isActive: true,
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@toktickit.local',
    department: 'Finance & Operations',
    isActive: true,
  },
  {
    name: 'David Lee',
    email: 'david.lee@toktickit.local',
    department: 'Academic Affairs',
    isActive: true,
  },
  {
    name: 'John Doe (Inactive)',
    email: 'john.doe@toktickit.local',
    department: 'Former Employee',
    isActive: false,
  },
];

async function main() {
  console.log('Seeding categories...');
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }

  console.log('Seeding related systems...');
  for (const name of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }

  console.log('Seeding development requesters...');
  for (const requester of requesters) {
    await prisma.requesterUser.upsert({
      where: { email: requester.email },
      update: {
        name: requester.name,
        department: requester.department,
        isActive: requester.isActive,
      },
      create: requester,
    });
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
