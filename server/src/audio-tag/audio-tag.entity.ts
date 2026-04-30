import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity()
export class AudioTag {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column()
  code: string

  @Column({ default: '' })
  description: string

  @Column({ default: 0 })
  sort: number

  @CreateDateColumn()
  createdAt: Date
}
