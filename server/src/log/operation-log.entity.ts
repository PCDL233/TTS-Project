import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity()
export class OperationLog {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: true })
  userId: number

  @Column({ default: '' })
  username: string

  @Column({ default: '' })
  module: string

  @Column({ default: '' })
  action: string

  @Column({ default: '' })
  method: string

  @Column({ default: '' })
  path: string

  @Column({ type: 'text', default: '' })
  params: string

  @Column({ default: '' })
  ip: string

  @Column({ default: '' })
  userAgent: string

  @Column({ type: 'int', default: 0 })
  duration: number

  @Column({ default: 'success' })
  status: string

  @Column({ default: '' })
  message: string

  @CreateDateColumn()
  createdAt: Date
}
