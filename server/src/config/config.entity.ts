import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity()
export class Config {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ nullable: true })
  userId: number;

  @Column({ default: '' })
  apiKey: string;

  @Column({ default: 'default' })
  baseUrlPreset: string;

  @Column({ default: '' })
  baseUrlCustom: string;

  @Column({ default: 'preset' })
  mode: string;

  @Column({ default: 'mimo-v2.5-tts' })
  model: string;

  @Column({ default: 'mimo_default' })
  presetVoice: string;

  @Column({ default: '' })
  voiceDesignText: string;

  @Column({ default: '' })
  cloneAudioBase64: string;

  @Column({ default: '' })
  cloneAudioName: string;

  @Column({ default: 'natural' })
  styleMode: string;

  @Column({ default: '' })
  styleText: string;

  @Column({ default: 'wav' })
  audioFormat: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
