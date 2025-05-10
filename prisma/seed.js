/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-undef */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Create default system roles
  const systemRoles = [
    {
      name: 'SYSTEM_ADMIN',
      description: 'System Administrator with full access to all features',
      permissions: ['*'],
    },
    {
      name: 'SYSTEM_AUDITOR',
      description: 'Read-only access to system data and audit logs',
      permissions: [
        'system.audit.read',
        'system.reports.read',
        'system.users.read',
        'system.organizations.read',
      ],
    },
    {
      name: 'SYSTEM_SUPPORT',
      description: 'Customer support with limited system access',
      permissions: [
        'system.support.*',
        'system.users.read',
        'system.organizations.read',
      ],
    },
  ];

  for (const role of systemRoles) {
    await prisma.systemRole.upsert({
      where: { name: role.name },
      update: {
        description: role.description,
        permissions: role.permissions,
      },
      create: {
        name: role.name,
        description: role.description,
        permissions: role.permissions,
      },
    });
  }

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error('Error in seed script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
