import { AppDataSource } from '../data-source';
import { ScrapeJob } from '../entities/scrape-job.entity';

async function seed() {
  await AppDataSource.initialize();

  const jobRepo = AppDataSource.getRepository(ScrapeJob);

  // Seed sample jobs for development
  const sampleJobs = [
    {
      url: 'https://example.com',
      status: 'completed',
      priority: 1,
      filesFound: 10,
      filesDownloaded: 8,
      startedAt: new Date(),
      completedAt: new Date(),
    },
    {
      url: 'https://example.org',
      status: 'processing',
      priority: 2,
      filesFound: 5,
      startedAt: new Date(),
    },
    {
      url: 'https://example.net',
      status: 'pending',
      priority: 1,
    },
  ];

  for (const jobData of sampleJobs) {
    const existing = await jobRepo.findOne({ where: { url: jobData.url } });
    if (!existing) {
      const job = jobRepo.create(jobData);
      await jobRepo.save(job);
      console.log(`Seeded job: ${job.url}`);
    }
  }

  console.log('Seeding completed');
  await AppDataSource.destroy();
}

seed().catch(console.error);
