import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { DownloadedFile } from './downloaded-file.entity';

export enum ScrapeStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  FETCHING = 'fetching',
  PARSING = 'parsing',
  DOWNLOADING = 'downloading',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum JobPriority {
  HIGH = 1,
  NORMAL = 5,
  LOW = 10,
}

@Entity('scrape_jobs')
@Index('IDX_scrape_jobs_status', ['status'])
@Index('IDX_scrape_jobs_created_at', ['createdAt'])
export class ScrapeJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 2048 })
  url: string;

  @Column({
    type: 'enum',
    enum: ScrapeStatus,
    default: ScrapeStatus.PENDING,
  })
  status: ScrapeStatus;

  @Column({
    type: 'enum',
    enum: JobPriority,
    default: JobPriority.NORMAL,
  })
  priority: JobPriority;

  @Column({ type: 'int', nullable: true })
  filesFound: number | null;

  @Column({ type: 'int', nullable: true })
  filesDownloaded: number | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  requestIp: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  requestedBy: string | null;

  @OneToMany(() => DownloadedFile, (file) => file.job)
  files: DownloadedFile[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
