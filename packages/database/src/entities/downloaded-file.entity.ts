import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ScrapeJob } from './scrape-job.entity';

@Entity('downloaded_files')
@Index('IDX_downloaded_files_job_id', ['jobId'])
export class DownloadedFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  jobId: string;

  @ManyToOne(() => ScrapeJob, (job) => job.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' })
  job: ScrapeJob;

  @Column({ type: 'varchar', length: 2048 })
  url: string;

  @Column({ type: 'varchar', length: 512 })
  filename: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mimeType: string | null;

  @Column({ type: 'bigint', nullable: true })
  size: number | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  storageKey: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  status: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
