import { PrismaClient } from '@prisma/client';

// Create a test database client
const prisma = new PrismaClient();

// Clean up database before each test suite
beforeAll(async () => {
  // Connect to database
  await prisma.$connect();
});

// Clean up after all tests
afterAll(async () => {
  await prisma.$disconnect();
});

// Export prisma for use in tests
export { prisma };
