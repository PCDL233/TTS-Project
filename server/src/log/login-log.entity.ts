import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity()
export class LoginLog {
  @PrimaryGeneratedColumn()
  id: number

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
