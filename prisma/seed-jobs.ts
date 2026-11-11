import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { Prisma } from "../src/generated/prisma/client";

const ADMIN_ID = "cmw76j3zd0006ycf9t1eyx516";
console.log({
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_USER: process.env.DB_USER,
  DB_NAME: process.env.DB_NAME,
  DB_PASSWORD_LOADED: process.env.DB_PASSWORD !== undefined,
});
async function main() {
  console.log("Starting job seed...");

  // 1. Verify admin
  const admin = await prisma.user.findUnique({
    where: { id: ADMIN_ID },
    select: { id: true, name: true, role: true, isActive: true },
  });

  if (!admin || admin.role !== "ADMIN" || !admin.isActive) {
    throw new Error("Admin not found, inactive, or invalid role.");
  }

  console.log(`Admin verified: ${admin.name ?? admin.id}`);

  // 2. Ensure company exists
  const company = await prisma.company.upsert({
    where: { slug: "demo-tech-solutions" },
    update: {},
    create: {
      name: "Demo Tech Solutions",
      slug: "demo-tech-solutions",
      overview: "A demo technology company for job portal testing.",
      industry: "Information Technology",
      location: "Kolkata, West Bengal",
      website: "https://example.com",
    },
  });

  // 3. Ensure category exists
  const category = await prisma.category.upsert({
    where: { slug: "software-development" },
    update: {},
    create: {
      name: "Software Development",
      slug: "software-development",
      description: "Software engineering and development jobs.",
      isActive: true,
    },
  });

  console.log("Company and category verified.");

  // 4. Prepare published jobs
  const now = new Date();
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + 30);

  type JobSeedData = Omit<
  Prisma.JobUncheckedCreateInput,
  "companyId" | "categoryId" | "postedById"
>;

const jobs: JobSeedData[] = [
    {
      slug: "frontend-developer-kolkata-demo",
      title: "Frontend Developer",
      shortDescription: "Build modern and responsive web applications.",
      role: "Developer",
      detailedTitle: "Frontend Developer - React and Next.js",
      description:
        "We are looking for a frontend developer skilled in HTML, CSS, JavaScript, React and Next.js.",
      location: "Kolkata, West Bengal",
      employmentType: "FULL_TIME",
      experienceLevel: "FRESHER",
      experienceYears: 0,
      salaryMin: 18000,
      salaryMax: 25000,
      salaryPeriod: "MONTHLY",
      skills: ["HTML", "CSS", "JavaScript", "React", "Next.js"],
      status: "PUBLISHED",
      applicationMethod: "INTERNAL",
      allowGuestApply: false,
      publishedAt: now,
      deadline,
    },
    {
      slug: "php-developer-kolkata-demo",
      title: "PHP Developer",
      shortDescription: "Develop and maintain PHP web applications.",
      role: "Developer",
      detailedTitle: "PHP and MySQL Backend Developer",
      description:
        "Looking for a PHP developer with knowledge of Core PHP, MySQL, REST APIs and Git.",
      location: "Kolkata, West Bengal",
      employmentType: "FULL_TIME",
      experienceLevel: "FRESHER",
      experienceYears: 0,
      salaryMin: 15000,
      salaryMax: 22000,
      salaryPeriod: "MONTHLY",
      skills: ["PHP", "MySQL", "JavaScript", "REST API", "Git"],
      status: "PUBLISHED",
      applicationMethod: "INTERNAL",
      allowGuestApply: false,
      publishedAt: now,
      deadline,
    },
    {
      slug: "react-developer-bangalore-demo",
      title: "React Developer",
      shortDescription: "Create reusable frontend components.",
      role: "Developer",
      detailedTitle: "React.js Frontend Engineer",
      description:
        "Build scalable frontend applications using React, TypeScript and modern frontend tools.",
      location: "Bangalore, Karnataka",
      employmentType: "FULL_TIME",
      experienceLevel: "EXPERIENCED",
      experienceYears: 2,
      salaryMin: 35000,
      salaryMax: 50000,
      salaryPeriod: "MONTHLY",
      skills: ["React", "TypeScript", "JavaScript", "CSS"],
      status: "PUBLISHED",
      applicationMethod: "INTERNAL",
      allowGuestApply: false,
      publishedAt: now,
      deadline,
    },
    {
      slug: "junior-backend-developer-demo",
      title: "Junior Backend Developer",
      shortDescription: "Work on backend services and APIs.",
      role: "Developer",
      detailedTitle: "Junior Node.js Backend Developer",
      description:
        "Assist in developing backend APIs, database integrations and server-side applications.",
      location: "Remote",
      employmentType: "INTERNSHIP",
      experienceLevel: "FRESHER",
      experienceYears: 0,
      salaryMin: 10000,
      salaryMax: 15000,
      salaryPeriod: "MONTHLY",
      skills: ["Node.js", "Express", "MySQL", "REST API"],
      status: "PUBLISHED",
      applicationMethod: "INTERNAL",
      allowGuestApply: false,
      publishedAt: now,
      deadline,
    },
    {
      slug: "qa-engineer-pune-demo",
      title: "QA Engineer",
      shortDescription: "Test applications and identify software defects.",
      role: "QA Engineer",
      detailedTitle: "Software Quality Assurance Engineer",
      description:
        "Perform manual testing, write test cases and report software defects.",
      location: "Pune, Maharashtra",
      employmentType: "FULL_TIME",
      experienceLevel: "FRESHER",
      experienceYears: 0,
      salaryMin: 18000,
      salaryMax: 28000,
      salaryPeriod: "MONTHLY",
      skills: ["Manual Testing", "Postman", "SQL", "Test Cases"],
      status: "PUBLISHED",
      applicationMethod: "INTERNAL",
      allowGuestApply: false,
      publishedAt: now,
      deadline,
    },
    {
      slug: "ui-ux-designer-remote-demo",
      title: "UI UX Designer",
      shortDescription: "Design intuitive digital experiences.",
      role: "Designer",
      detailedTitle: "Junior UI UX Product Designer",
      description:
        "Design user interfaces, prototypes and user flows for web applications.",
      location: "Remote",
      employmentType: "PART_TIME",
      experienceLevel: "FRESHER",
      experienceYears: 0,
      salaryMin: 12000,
      salaryMax: 20000,
      salaryPeriod: "MONTHLY",
      skills: ["Figma", "UI Design", "UX Research", "Prototyping"],
      status: "PUBLISHED",
      applicationMethod: "INTERNAL",
      allowGuestApply: false,
      publishedAt: now,
      deadline,
    },
  ];

  // 5. Upsert jobs without creating duplicates
  let createdOrUpdated = 0;

  for (const job of jobs) {
    await prisma.job.upsert({
      where: { slug: job.slug },
      update: {
        ...job,
        companyId: company.id,
        categoryId: category.id,
        postedById: admin.id,
      },
      create: {
        ...job,
        companyId: company.id,
        categoryId: category.id,
        postedById: admin.id,
      },
    });

    createdOrUpdated++;
    console.log(`Seeded: ${job.title}`);
  }

  console.log(`\n${createdOrUpdated} jobs seeded successfully.`);
  console.log(`Company: ${company.name}`);
  console.log(`Posted by: ${admin.name ?? admin.id}`);
}

main()
  .catch((error) => {
    console.error("Job seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
