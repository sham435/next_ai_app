import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Scrape Jobs Table
    await queryRunner.createTable(
      new Table({
        name: 'scrape_jobs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'url',
            type: 'varchar',
            length: '2048',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'pending'",
          },
          {
            name: 'priority',
            type: 'int',
            default: 1,
          },
          {
            name: 'filesFound',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'filesDownloaded',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'error',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'startedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'scrape_jobs',
      new TableIndex({
        name: 'IDX_scrape_jobs_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'scrape_jobs',
      new TableIndex({
        name: 'IDX_scrape_jobs_created_at',
        columnNames: ['createdAt'],
      }),
    );

    // Downloaded Files Table
    await queryRunner.createTable(
      new Table({
        name: 'downloaded_files',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'jobId',
            type: 'uuid',
          },
          {
            name: 'url',
            type: 'varchar',
            length: '2048',
          },
          {
            name: 'filename',
            type: 'varchar',
            length: '512',
          },
          {
            name: 'mimeType',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'size',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'storageKey',
            type: 'varchar',
            length: '512',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'downloaded_files',
      new TableIndex({
        name: 'IDX_downloaded_files_job_id',
        columnNames: ['jobId'],
      }),
    );

    // Enable UUID extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('downloaded_files');
    await queryRunner.dropTable('scrape_jobs');
  }
}
