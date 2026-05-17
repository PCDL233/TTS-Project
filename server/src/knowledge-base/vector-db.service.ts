import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as sqliteVec from 'sqlite-vec';

@Injectable()
export class VectorDbService implements OnModuleInit {
  private readonly logger = new Logger(VectorDbService.name);
  private db: any | null = null;
  private readonly dimension = 384;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      const driver = this.dataSource.driver as any;
      this.db = driver.databaseConnection;
      if (!this.db) {
        throw new Error('无法获取 better-sqlite3 连接');
      }
      sqliteVec.load(this.db);
      this.logger.log('sqlite-vec 扩展加载成功');
    } catch (err) {
      this.logger.error(`sqlite-vec 加载失败: ${(err as Error).message}`);
      throw err;
    }
  }

  private getTableName(knowledgeBaseId: number): string {
    return `vec_kb_${knowledgeBaseId}`;
  }

  createTable(knowledgeBaseId: number): void {
    const tableName = this.getTableName(knowledgeBaseId);
    this.db!.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS ${tableName} USING vec0(
        chunk_id INTEGER PRIMARY KEY,
        embedding float[${this.dimension}]
      );
    `);
    this.logger.log(`向量表 ${tableName} 创建成功`);
  }

  dropTable(knowledgeBaseId: number): void {
    const tableName = this.getTableName(knowledgeBaseId);
    try {
      this.db!.exec(`DROP TABLE IF EXISTS ${tableName};`);
      this.logger.log(`向量表 ${tableName} 已删除`);
    } catch (err) {
      this.logger.warn(`删除向量表 ${tableName} 失败: ${(err as Error).message}`);
    }
  }

  insert(knowledgeBaseId: number, chunkId: number, embedding: Float32Array): void {
    if (!Number.isInteger(chunkId) || chunkId <= 0) {
      throw new Error(
        `chunkId must be a positive integer, got ${chunkId} (type=${typeof chunkId})`,
      );
    }
    const tableName = this.getTableName(knowledgeBaseId);
    const blob = Buffer.from(embedding.buffer);
    const stmt = this.db!.prepare(`INSERT INTO ${tableName}(chunk_id, embedding) VALUES (?, ?)`);
    // sqlite-vec 要求 BigInt 作为主键类型（better-sqlite3 v12+ 约定）
    stmt.run(BigInt(chunkId), blob);
  }

  search(
    knowledgeBaseId: number,
    embedding: Float32Array,
    topK: number = 5,
  ): Array<{ chunkId: number; distance: number }> {
    const tableName = this.getTableName(knowledgeBaseId);
    const blob = Buffer.from(embedding.buffer);
    const stmt = this.db!.prepare(
      `SELECT chunk_id, distance FROM ${tableName} WHERE embedding MATCH ? ORDER BY distance LIMIT ?`,
    );
    const rows = stmt.all(blob, topK) as Array<{ chunk_id: number; distance: number }>;
    return rows.map((r) => ({ chunkId: r.chunk_id, distance: r.distance }));
  }
}
