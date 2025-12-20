export interface Example {
  chinese: string;
  english: string;
}

export interface User {
  email: string;
  name: string;
  picture: string;
}

export interface Profile {
  id: string;
  userId: string;
  displayName: string;
  avatarId: string;
  stats?: {
    totalWords: number;
    learningWords: number;
    masteredWords: number;
    totalZh: number;
    learningZh: number;
    masteredZh: number;
    totalEn: number;
    learningEn: number;
    masteredEn: number;
  };
  exp: number;
}

export interface ProfileSyncResponse {
  user: {
    id: string;
    email: string;
    name: string;
    photoURL?: string;
  };
  profiles: Profile[];
}

export interface AuthResponse {
  token: string;
  refresh_token: string;
  user_id: string;
  email: string;
  name: string;
  expired_at: number;
}

export interface FlashcardData {
  character: string;
  pinyin: string;
  english: string;
  example_cn: string;
  example_en: string;
  examples?: Example[];
  // New fields for tracking progress
  id?: string;
  language?: 'zh' | 'en';
  revisedCount?: number;
  correctCount?: number;
  tags?: string[];
  lastReviewedAt?: Date;
  masteredAt?: Date;
}

export enum AppState {
  LOADING = 'LOADING',
  ERROR = 'ERROR',
  HOME = 'HOME',
  MANAGE = 'MANAGE',
  FLASHCARDS = 'FLASHCARDS',
  COMPLETED = 'COMPLETED'
}

export enum AppTab {
  STUDY = 'STUDY',
  STATS = 'STATS',
  SETTINGS = 'SETTINGS'
}
