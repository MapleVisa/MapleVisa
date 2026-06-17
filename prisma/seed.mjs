import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const accounts = [
    {
      email: "admin@maplevisa.test",
      fullName: "Case Officer (Admin)",
      role: "ADMIN",
      password: "admin1234",
    },
    {
      email: "lawyer@maplevisa.test",
      fullName: "Sarah Whitfield, RCIC",
      role: "LAWYER",
      password: "lawyer1234",
    },
    {
      email: "applicant@maplevisa.test",
      fullName: "Hamed Izadian",
      role: "APPLICANT",
      password: "applicant1234",
    },
  ];

  for (const acc of accounts) {
    const passwordHash = await bcrypt.hash(acc.password, 10);
    await prisma.user.upsert({
      where: { email: acc.email },
      update: { fullName: acc.fullName, role: acc.role, passwordHash },
      create: {
        email: acc.email,
        fullName: acc.fullName,
        role: acc.role,
        passwordHash,
      },
    });
    console.log(`Seeded ${acc.role}: ${acc.email} / ${acc.password}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
