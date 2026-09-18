import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

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

const defaultPasswordHash = bcrypt.hashSync('Password123!', 10);

const users: {
  name: string;
  email: string;
  department: string;
  role: Role;
  isActive: boolean;
  isPasswordChangeRequired: boolean;
}[] = [
  // Requesters
  {
    name: 'Jennifer Anderson',
    email: 'jennifer.anderson@toktickit.local',
    department: 'Human Resources',
    role: Role.REQUESTER,
    isActive: true,
    isPasswordChangeRequired: true,
  },
  {
    name: 'Michael Brown',
    email: 'michael.brown@toktickit.local',
    department: 'Engineering',
    role: Role.REQUESTER,
    isActive: true,
    isPasswordChangeRequired: true,
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@toktickit.local',
    department: 'Finance & Operations',
    role: Role.REQUESTER,
    isActive: true,
    isPasswordChangeRequired: true,
  },
  {
    name: 'David Lee',
    email: 'david.lee@toktickit.local',
    department: 'Academic Affairs',
    role: Role.REQUESTER,
    isActive: true,
    isPasswordChangeRequired: true,
  },
  {
    name: 'John Doe (Inactive)',
    email: 'john.doe@toktickit.local',
    department: 'Former Employee',
    role: Role.REQUESTER,
    isActive: false,
    isPasswordChangeRequired: true,
  },

  // IT Staff
  {
    name: 'Alex Thompson',
    email: 'alex.thompson@toktickit.local',
    department: 'IT Support',
    role: Role.IT_STAFF,
    isActive: true,
    isPasswordChangeRequired: true,
  },
  {
    name: 'Emily Watson',
    email: 'emily.watson@toktickit.local',
    department: 'IT Operations',
    role: Role.IT_STAFF,
    isActive: true,
    isPasswordChangeRequired: true,
  },
  {
    name: 'Carlos Garcia',
    email: 'carlos.garcia@toktickit.local',
    department: 'Network Infrastructure',
    role: Role.IT_STAFF,
    isActive: true,
    isPasswordChangeRequired: true,
  },
  {
    name: 'Robert Taylor (Inactive)',
    email: 'robert.taylor@toktickit.local',
    department: 'Former IT Staff',
    role: Role.IT_STAFF,
    isActive: false,
    isPasswordChangeRequired: true,
  },

  // Administrators
  {
    name: 'Administrator',
    email: 'admin@toktickit.local',
    department: 'IT Administration',
    role: Role.ADMINISTRATOR,
    isActive: true,
    isPasswordChangeRequired: false,
  },
  {
    name: 'Support Admin',
    email: 'admin.support@toktickit.local',
    department: 'IT Administration',
    role: Role.ADMINISTRATOR,
    isActive: true,
    isPasswordChangeRequired: true,
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

  console.log('Seeding users (Requesters, IT Staff, Administrators)...');
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        department: u.department,
        role: u.role,
        isActive: u.isActive,
        isPasswordChangeRequired: u.isPasswordChangeRequired,
        passwordHash: defaultPasswordHash,
      },
      create: {
        ...u,
        passwordHash: defaultPasswordHash,
      },
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
