import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class History {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  userId: number;

  @Column()
  text: string;

  @Column()
  mode: string;

  @Column()
  voice: string;

  @Column({ default: '' })
  styleText: string;

  @Column({ default: '' })
  audioUrl: string;

  @Column({ default: '' })
  audioBase64: string;

  @Column({ default: 'wav' })
  audioFormat: string;

  @Column({ type: 'bigint', default: () => 'CAST(strftime(\'%s\', \'now\') AS INTEGER) * 1000' })
  createdAt: number;
}
