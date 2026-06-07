import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

@Entity()
export class LoginLog {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column({ nullable: true })
  userId: number

  @Column({ default: '' })
  username: string

  @Column({ default: '' })
  ip: string

  @Column({ default: '' })
  userAgent: string

  @Column({ default: 'success' })
  status: string

  @Column({ default: '' })
  message: string

  @CreateDateColumn()
  createdAt: Date
}
