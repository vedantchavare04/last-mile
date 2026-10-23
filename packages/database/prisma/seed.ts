import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.operationalEvent.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.shelterDemand.deleteMany();
  await prisma.donationBatch.deleteMany();
  await prisma.volunteer.deleteMany();
  await prisma.receiver.deleteMany();
  await prisma.donor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.compatibilityRule.deleteMany();
  await prisma.compatibilityRule.createMany({ data: [
    { category: "READY_TO_EAT", maxTransitMinutes: 90 },
    { category: "RAW_RATION", requiresCleanWater: true, requiresCooking: true, requiresFuel: true },
    { category: "MEDICAL", requiresColdStorage: true, authorizedReceiver: true },
    { category: "INFANT", authorizedReceiver: true },
    { category: "HYGIENE" },
    { category: "EMERGENCY_ESSENTIAL" },
  ] });
  console.log("Seed rules created. Add demo entities through your deployment seed or Prisma Studio.");
}

main().finally(() => prisma.$disconnect());
