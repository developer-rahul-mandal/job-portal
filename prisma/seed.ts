import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST ?? "localhost",
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: process.env.DATABASE_USER ?? "root",
  password: process.env.DATABASE_PASSWORD ?? "",
  database: process.env.DATABASE_NAME ?? "job_portal",
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });

// import {
//   EmploymentType,
//   ExperienceLevel,
//   JobStatus,
//   SalaryPeriod,
//   ApplicationMethod,
// } from "../src/generated/prisma/client";

// // Add this after your Company and Category seed data.

// const jobs = [
//   {
//     slug: "junior-php-developer-kolkata",
//     title: "Junior PHP Developer",
//     role: "Developer",
//     detailedTitle: "Junior PHP Developer - Core PHP & MySQL",
//     shortDescription:
//       "Build and maintain dynamic web applications using PHP and MySQL.",
//     description:
//       "We are looking for a junior PHP developer to build, maintain, and optimize web applications. Candidates should have knowledge of PHP, MySQL, JavaScript, HTML, and CSS.",
//     location: "Kolkata, West Bengal",
//     employmentType: EmploymentType.FULL_TIME,
//     experienceLevel: ExperienceLevel.FRESHER,
//     experienceYears: 0,
//     salaryMin: 12000,
//     salaryMax: 20000,
//     companySlug: "technova-solutions",
//     categorySlug: "it-software",
//     skills: ["PHP", "MySQL", "JavaScript", "HTML", "CSS"],
//     keywords: ["PHP Developer", "Junior Developer", "Core PHP"],
//   },
//   {
//     slug: "frontend-developer-intern-kolkata",
//     title: "Frontend Developer Intern",
//     role: "Developer",
//     detailedTitle: "Frontend Developer Intern - React",
//     shortDescription:
//       "Create responsive and user-friendly interfaces with React.",
//     description:
//       "Join our frontend team to build responsive websites. Knowledge of HTML, CSS, JavaScript, and React fundamentals is required.",
//     location: "Kolkata, West Bengal",
//     employmentType: EmploymentType.INTERNSHIP,
//     experienceLevel: ExperienceLevel.FRESHER,
//     experienceYears: 0,
//     salaryMin: 8000,
//     salaryMax: 15000,
//     companySlug: "pixelcraft-studio",
//     categorySlug: "it-software",
//     skills: ["HTML", "CSS", "JavaScript", "React", "Git"],
//     keywords: ["Frontend Intern", "React Intern", "Web Development"],
//   },
//   {
//     slug: "full-stack-developer",
//     title: "Full Stack Developer",
//     role: "Developer",
//     detailedTitle: "Full Stack Developer - Node.js & React",
//     shortDescription: "Develop scalable frontend and backend web applications.",
//     description:
//       "Work on full-stack applications using React, Node.js, REST APIs, and databases. Collaborate with product and design teams.",
//     location: "Bengaluru, Karnataka",
//     employmentType: EmploymentType.FULL_TIME,
//     experienceLevel: ExperienceLevel.EXPERIENCED,
//     experienceYears: 2,
//     salaryMin: 40000,
//     salaryMax: 70000,
//     companySlug: "technova-solutions",
//     categorySlug: "it-software",
//     skills: ["React", "Node.js", "MySQL", "REST API", "Git"],
//     keywords: ["Full Stack", "Node Developer", "React Developer"],
//   },
//   {
//     slug: "software-testing-trainee",
//     title: "Software Testing Trainee",
//     role: "Tester",
//     detailedTitle: "Software QA Testing Trainee",
//     shortDescription: "Assist in manual testing and quality assurance.",
//     description:
//       "Execute test cases, identify bugs, document defects, and work with developers to improve software quality.",
//     location: "Kolkata, West Bengal",
//     employmentType: EmploymentType.FULL_TIME,
//     experienceLevel: ExperienceLevel.FRESHER,
//     experienceYears: 0,
//     salaryMin: 10000,
//     salaryMax: 18000,
//     companySlug: "brightpath-careers",
//     categorySlug: "it-software",
//     skills: ["Manual Testing", "Test Cases", "Bug Reporting", "SQL"],
//     keywords: ["QA Tester", "Software Testing", "Fresher"],
//   },
//   {
//     slug: "data-analyst",
//     title: "Data Analyst",
//     role: "Analyst",
//     detailedTitle: "Data Analyst - Excel & SQL",
//     shortDescription: "Analyze business data and prepare insightful reports.",
//     description:
//       "Analyze datasets, build reports, create dashboards, and support business decisions using SQL, Excel, and visualization tools.",
//     location: "Bengaluru, Karnataka",
//     employmentType: EmploymentType.FULL_TIME,
//     experienceLevel: ExperienceLevel.EXPERIENCED,
//     experienceYears: 2,
//     salaryMin: 35000,
//     salaryMax: 60000,
//     companySlug: "technova-solutions",
//     categorySlug: "it-software",
//     skills: ["SQL", "Excel", "Power BI", "Python"],
//     keywords: ["Data Analyst", "SQL Analyst", "Business Intelligence"],
//   },
//   {
//     slug: "banking-relationship-executive",
//     title: "Relationship Executive",
//     role: "Executive",
//     detailedTitle: "Banking Relationship Executive",
//     shortDescription:
//       "Build customer relationships and promote banking products.",
//     description:
//       "Handle customer queries, promote financial products, and maintain customer relationships.",
//     location: "Kolkata, West Bengal",
//     employmentType: EmploymentType.FULL_TIME,
//     experienceLevel: ExperienceLevel.FRESHER,
//     experienceYears: 0,
//     salaryMin: 18000,
//     salaryMax: 28000,
//     companySlug: "finedge-technologies",
//     categorySlug: "banking-finance",
//     skills: ["Communication", "Customer Service", "Sales", "MS Excel"],
//     keywords: ["Banking Jobs", "Relationship Executive", "Finance"],
//   },
//   {
//     slug: "financial-analyst",
//     title: "Financial Analyst",
//     role: "Analyst",
//     detailedTitle: "Financial Analyst - Corporate Finance",
//     shortDescription: "Support financial planning and business analysis.",
//     description:
//       "Prepare financial reports, analyze financial performance, and assist with forecasting and budgeting.",
//     location: "Mumbai, Maharashtra",
//     employmentType: EmploymentType.FULL_TIME,
//     experienceLevel: ExperienceLevel.EXPERIENCED,
//     experienceYears: 3,
//     salaryMin: 50000,
//     salaryMax: 85000,
//     companySlug: "finedge-technologies",
//     categorySlug: "banking-finance",
//     skills: ["Financial Modeling", "Excel", "Accounting", "Analysis"],
//     keywords: ["Financial Analyst", "Corporate Finance", "Finance Jobs"],
//   },
//   {
//     slug: "government-data-entry-operator",
//     title: "Data Entry Operator",
//     role: "Operator",
//     detailedTitle: "Government Data Entry Operator",
//     shortDescription:
//       "Maintain records and enter data into government systems.",
//     description:
//       "Perform data entry, maintain digital records, and ensure accuracy of official documentation.",
//     location: "Bhopal, Madhya Pradesh",
//     employmentType: EmploymentType.FULL_TIME,
//     experienceLevel: ExperienceLevel.FRESHER,
//     experienceYears: 0,
//     salaryMin: 18000,
//     salaryMax: 25000,
//     companySlug: "brightpath-careers",
//     categorySlug: "government-jobs",
//     skills: ["Typing", "MS Excel", "MS Word", "Data Entry"],
//     keywords: ["Government Job", "Data Entry", "Computer Operator"],
//   },
//   {
//     slug: "digital-marketing-executive",
//     title: "Digital Marketing Executive",
//     role: "Executive",
//     detailedTitle: "Digital Marketing Executive - SEO",
//     shortDescription: "Manage SEO, campaigns, and online marketing activities.",
//     description:
//       "Plan and execute digital marketing campaigns, optimize SEO performance, and monitor website analytics.",
//     location: "Kolkata, West Bengal",
//     employmentType: EmploymentType.FULL_TIME,
//     experienceLevel: ExperienceLevel.FRESHER,
//     experienceYears: 0,
//     salaryMin: 15000,
//     salaryMax: 25000,
//     companySlug: "pixelcraft-studio",
//     categorySlug: "marketing",
//     skills: ["SEO", "Google Analytics", "Content Marketing", "Social Media"],
//     keywords: ["Digital Marketing", "SEO Executive", "Marketing Jobs"],
//   },
//   {
//     slug: "hr-recruiter",
//     title: "HR Recruiter",
//     role: "Recruiter",
//     detailedTitle: "HR Recruiter - Talent Acquisition",
//     shortDescription:
//       "Source candidates and coordinate recruitment activities.",
//     description:
//       "Manage job postings, screen resumes, schedule interviews, and coordinate with hiring managers.",
//     location: "Kolkata, West Bengal",
//     employmentType: EmploymentType.FULL_TIME,
//     experienceLevel: ExperienceLevel.FRESHER,
//     experienceYears: 0,
//     salaryMin: 15000,
//     salaryMax: 22000,
//     companySlug: "brightpath-careers",
//     categorySlug: "human-resources",
//     skills: ["Recruitment", "Communication", "Interview Coordination", "Excel"],
//     keywords: ["HR Recruiter", "Talent Acquisition", "HR Jobs"],
//   },
//   {
//     slug: "sales-development-representative",
//     title: "Sales Development Representative",
//     role: "Sales",
//     detailedTitle: "Sales Development Representative - B2B",
//     shortDescription: "Generate leads and support business development.",
//     description:
//       "Identify potential customers, conduct outreach, qualify leads, and maintain CRM records.",
//     location: "Pune, Maharashtra",
//     employmentType: EmploymentType.FULL_TIME,
//     experienceLevel: ExperienceLevel.FRESHER,
//     experienceYears: 0,
//     salaryMin: 20000,
//     salaryMax: 35000,
//     companySlug: "finedge-technologies",
//     categorySlug: "sales",
//     skills: ["Sales", "Lead Generation", "Communication", "CRM"],
//     keywords: ["Sales Representative", "Business Development", "B2B Sales"],
//   },
//   {
//     slug: "customer-support-associate",
//     title: "Customer Support Associate",
//     role: "Associate",
//     detailedTitle: "Customer Support Associate - Voice Process",
//     shortDescription: "Resolve customer issues and provide support.",
//     description:
//       "Respond to customer inquiries, resolve issues, and maintain a high standard of customer satisfaction.",
//     location: "Kolkata, West Bengal",
//     employmentType: EmploymentType.FULL_TIME,
//     experienceLevel: ExperienceLevel.FRESHER,
//     experienceYears: 0,
//     salaryMin: 14000,
//     salaryMax: 22000,
//     companySlug: "brightpath-careers",
//     categorySlug: "customer-support",
//     skills: ["Communication", "Customer Service", "Problem Solving"],
//     keywords: ["Customer Support", "BPO", "Voice Process"],
//   },
//   {
//     slug: "mechanical-engineer",
//     title: "Mechanical Engineer",
//     role: "Engineer",
//     detailedTitle: "Mechanical Engineer - Production",
//     shortDescription:
//       "Support production processes and engineering operations.",
//     description:
//       "Monitor production, improve manufacturing processes, and ensure quality and safety standards.",
//     location: "Durgapur, West Bengal",
//     employmentType: EmploymentType.FULL_TIME,
//     experienceLevel: ExperienceLevel.EXPERIENCED,
//     experienceYears: 2,
//     salaryMin: 30000,
//     salaryMax: 50000,
//     companySlug: "nextgen-engineering",
//     categorySlug: "engineering",
//     skills: ["AutoCAD", "Production", "Quality Control", "Engineering"],
//     keywords: [
//       "Mechanical Engineer",
//       "Production Engineer",
//       "Engineering Jobs",
//     ],
//   },
//   {
//     slug: "civil-site-engineer",
//     title: "Civil Site Engineer",
//     role: "Engineer",
//     detailedTitle: "Civil Site Engineer - Construction",
//     shortDescription: "Supervise construction activities and site operations.",
//     description:
//       "Coordinate construction work, monitor progress, manage materials, and ensure compliance with specifications.",
//     location: "Kolkata, West Bengal",
//     employmentType: EmploymentType.FULL_TIME,
//     experienceLevel: ExperienceLevel.EXPERIENCED,
//     experienceYears: 2,
//     salaryMin: 28000,
//     salaryMax: 45000,
//     companySlug: "nextgen-engineering",
//     categorySlug: "engineering",
//     skills: ["AutoCAD", "Site Supervision", "Construction", "BOQ"],
//     keywords: ["Civil Engineer", "Site Engineer", "Construction Jobs"],
//   },
//   {
//     slug: "school-computer-teacher",
//     title: "Computer Teacher",
//     role: "Teacher",
//     detailedTitle: "School Computer Teacher",
//     shortDescription: "Teach computer fundamentals and practical skills.",
//     description:
//       "Deliver computer education lessons, prepare teaching materials, and guide students in practical computer lab activities.",
//     location: "Kolkata, West Bengal",
//     employmentType: EmploymentType.FULL_TIME,
//     experienceLevel: ExperienceLevel.EXPERIENCED,
//     experienceYears: 1,
//     salaryMin: 18000,
//     salaryMax: 30000,
//     companySlug: "brightpath-careers",
//     categorySlug: "education",
//     skills: ["Computer Fundamentals", "Teaching", "MS Office", "Communication"],
//     keywords: ["Computer Teacher", "School Teacher", "Education Jobs"],
//   },
//   {
//     slug: "medical-lab-technician",
//     title: "Medical Lab Technician",
//     role: "Technician",
//     detailedTitle: "Medical Laboratory Technician",
//     shortDescription: "Perform laboratory tests and maintain medical records.",
//     description:
//       "Collect and process samples, perform diagnostic tests, and maintain laboratory equipment and records.",
//     location: "Bhopal, Madhya Pradesh",
//     employmentType: EmploymentType.FULL_TIME,
//     experienceLevel: ExperienceLevel.EXPERIENCED,
//     experienceYears: 1,
//     salaryMin: 20000,
//     salaryMax: 35000,
//     companySlug: "brightpath-careers",
//     categorySlug: "healthcare",
//     skills: ["Laboratory Testing", "Sample Collection", "Medical Records"],
//     keywords: ["Lab Technician", "Medical Jobs", "Healthcare"],
//   },
//   {
//     slug: "ui-ux-designer",
//     title: "UI UX Designer",
//     role: "Designer",
//     detailedTitle: "UI UX Designer - Web & Mobile",
//     shortDescription: "Design intuitive user experiences for digital products.",
//     description:
//       "Create wireframes, prototypes, and high-fidelity designs while collaborating with product and development teams.",
//     location: "Remote, India",
//     employmentType: EmploymentType.FULL_TIME,
//     experienceLevel: ExperienceLevel.EXPERIENCED,
//     experienceYears: 2,
//     salaryMin: 35000,
//     salaryMax: 60000,
//     companySlug: "pixelcraft-studio",
//     categorySlug: "it-software",
//     skills: ["Figma", "Wireframing", "Prototyping", "UI Design"],
//     keywords: ["UI Designer", "UX Designer", "Figma"],
//   },
//   {
//     slug: "devops-engineer",
//     title: "DevOps Engineer",
//     role: "Engineer",
//     detailedTitle: "DevOps Engineer - CI/CD & Cloud",
//     shortDescription: "Manage deployment pipelines and cloud infrastructure.",
//     description:
//       "Build CI/CD pipelines, manage cloud resources, monitor applications, and automate deployment processes.",
//     location: "Hyderabad, Telangana",
//     employmentType: EmploymentType.FULL_TIME,
//     experienceLevel: ExperienceLevel.EXPERIENCED,
//     experienceYears: 3,
//     salaryMin: 60000,
//     salaryMax: 100000,
//     companySlug: "technova-solutions",
//     categorySlug: "it-software",
//     skills: ["Docker", "Linux", "GitHub Actions", "AWS", "CI/CD"],
//     keywords: ["DevOps Engineer", "Cloud Engineer", "Deployment"],
//   },
//   {
//     slug: "content-writer",
//     title: "Content Writer",
//     role: "Writer",
//     detailedTitle: "SEO Content Writer",
//     shortDescription: "Write engaging and search-optimized content.",
//     description:
//       "Create blog posts, website copy, and marketing content optimized for search engines and readers.",
//     location: "Remote, India",
//     employmentType: EmploymentType.FULL_TIME,
//     experienceLevel: ExperienceLevel.FRESHER,
//     experienceYears: 0,
//     salaryMin: 12000,
//     salaryMax: 25000,
//     companySlug: "pixelcraft-studio",
//     categorySlug: "marketing",
//     skills: ["Writing", "SEO", "Research", "Editing"],
//     keywords: ["Content Writer", "SEO Writer", "Blog Writer"],
//   },
//   {
//     slug: "electrical-maintenance-engineer",
//     title: "Electrical Maintenance Engineer",
//     role: "Engineer",
//     detailedTitle: "Electrical Maintenance Engineer - Factory",
//     shortDescription: "Maintain electrical equipment and factory systems.",
//     description:
//       "Perform preventive maintenance, troubleshoot electrical systems, and ensure safe operation of factory equipment.",
//     location: "Haldia, West Bengal",
//     employmentType: EmploymentType.FULL_TIME,
//     experienceLevel: ExperienceLevel.EXPERIENCED,
//     experienceYears: 2,
//     salaryMin: 30000,
//     salaryMax: 50000,
//     companySlug: "nextgen-engineering",
//     categorySlug: "engineering",
//     skills: ["Electrical Maintenance", "Troubleshooting", "PLC", "Safety"],
//     keywords: ["Electrical Engineer", "Maintenance Engineer", "Factory Jobs"],
//   },
// ] as const;

// const baseTime = new Date();

// for (const [index, job] of jobs.entries()) {
//   const createdAt = new Date(
//     baseTime.getTime() - index * 12 * 60 * 60 * 1000
//   );

//   const {
//     companySlug,
//     categorySlug,
//     skills,
//     keywords,
//     ...jobData
//   } = job;

//   await prisma.job.upsert({
//     where: {
//       slug: job.slug,
//     },
//     update: {
//       ...jobData,
//       skills: [...skills],
//       keywords: [...keywords],
//       company: {
//         connect: {
//           slug: companySlug,
//         },
//       },
//       category: {
//         connect: {
//           slug: categorySlug,
//         },
//       },
//     },
//     create: {
//       ...jobData,
//       skills: [...skills],
//       keywords: [...keywords],
//       salaryCurrency: "INR",
//       salaryPeriod: SalaryPeriod.MONTHLY,
//       status: JobStatus.PUBLISHED,
//       applicationMethod: ApplicationMethod.EXTERNAL,
//       applicationUrl: "https://example.com/apply",
//       allowGuestApply: true,
//       applicationCount: 0,
//       applyClickCount: 0,
//       createdAt,
//       updatedAt: createdAt,
//       publishedAt: createdAt,
//       company: {
//         connect: {
//           slug: companySlug,
//         },
//       },
//       category: {
//         connect: {
//           slug: categorySlug,
//         },
//       },
//     },
//   });

//   console.log(`Seeded job: ${job.title}`);
// }

// async function main() {
//   for (const company of companies) {
//     await prisma.company.upsert({
//       where: {
//         slug: company.slug,
//       },
//       update: {
//         name: company.name,
//         overview: company.overview,
//         industry: company.industry,
//         website: company.website,
//         officialEmail: company.officialEmail,
//         location: company.location,
//         verification: company.verification,
//         rating: company.rating,
//       },
//       create: company,
//     });
//   }

//   console.log("Dummy companies seeded successfully!");
// }

// main()
//   .catch((error) => {
//     console.error(error);
//     process.exitCode = 1;
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });

// async function main() {
//   const baseTime = new Date();

//   for (const [index, job] of jobs.entries()) {
//     const createdAt = new Date(
//       baseTime.getTime() - index * 12 * 60 * 60 * 1000,
//     );

//     const { companySlug, categorySlug, skills, keywords, ...jobData } = job;

//     await prisma.job.upsert({
//       where: {
//         slug: job.slug,
//       },
//       update: {
//         ...jobData,
//         skills: [...skills],
//         keywords: [...keywords],
//         company: {
//           connect: { slug: companySlug },
//         },
//         category: {
//           connect: { slug: categorySlug },
//         },
//       },
//       create: {
//         ...jobData,
//         skills: [...skills],
//         keywords: [...keywords],
//         salaryCurrency: "INR",
//         salaryPeriod: SalaryPeriod.MONTHLY,
//         status: JobStatus.PUBLISHED,
//         applicationMethod: ApplicationMethod.EXTERNAL,
//         applicationUrl: "https://example.com/apply",
//         allowGuestApply: true,
//         applicationCount: 0,
//         applyClickCount: 0,
//         createdAt,
//         updatedAt: createdAt,
//         publishedAt: createdAt,
//         company: {
//           connect: { slug: companySlug },
//         },
//         category: {
//           connect: { slug: categorySlug },
//         },
//       },
//     });

//     console.log(`Seeded job: ${job.title}`);
//   }
// }

// main()
//   .catch((error) => {
//     console.error("Seed failed:", error);
//     process.exitCode = 1;
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
const skills = [
  "HTML",
  "CSS",
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Express.js",
  "PHP",
  "Laravel",
  "MySQL",
  "MongoDB",
  "Prisma",
  "Python",
  "Java",
  "C++",
  "C",
  "Git",
  "GitHub",
  "Docker",
  "AWS",
  "REST API",
  "Tailwind CSS",
  "Bootstrap",
  "Figma",
  "UI/UX Design",
];

function generateSlug(name: string): string {
  const customSlugs: Record<string, string> = {
    "C++": "cpp",
    "C#": "c-sharp",
    "Node.js": "nodejs",
    "Next.js": "nextjs",
    "Vue.js": "vuejs",
    "React.js": "reactjs",
  };

  return (
    customSlugs[name] ??
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

const slugGroups = new Map<string, string[]>();

for (const name of skills) {
  const slug = generateSlug(name);
  const names = slugGroups.get(slug) ?? [];

  names.push(name);
  slugGroups.set(slug, names);
}

console.log("Checking duplicate slugs...");

for (const [slug, names] of slugGroups) {
  if (names.length > 1) {
    console.log(`Duplicate slug "${slug}":`, names);
  }
}

async function main() {
  for (const name of skills) {
    await prisma.skill.upsert({
      where: {
        name,
      },
      update: {},
      create: {
        name,
        slug: generateSlug(name),
      },
    });
  }

  console.log(`${skills.length} skills seeded successfully.`);
}

main()
  .catch((error) => {
    console.error("SEED_ERROR:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });