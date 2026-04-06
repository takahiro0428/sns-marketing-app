import type { Timestamp } from 'firebase/firestore'

// ==========================================
// Core Types
// ==========================================

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ==========================================
// Project Types
// ==========================================

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived'

export interface Project {
  id: string
  userId: string
  name: string
  description: string
  status: ProjectStatus
  noteEnabled: boolean
  xEnabled: boolean
  postingIntervalMinMinutes: number
  postingIntervalMaxMinutes: number
  timezone: string
  activeHoursStart: number // 0-23
  activeHoursEnd: number // 0-23
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ==========================================
// Content Source Types
// ==========================================

export type ContentSourceType = 'text' | 'pdf' | 'markdown' | 'url'
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface ContentSource {
  id: string
  projectId: string
  userId: string
  title: string
  sourceType: ContentSourceType
  originalFileName?: string
  storageUrl?: string
  rawText: string
  summary?: string
  tags: string[]
  processingStatus?: ProcessingStatus
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ContentChunk {
  id: string
  contentSourceId: string
  projectId: string
  userId: string
  chunkIndex: number
  text: string
  // embedding (768-dimensional vector) is stored in Firestore via FieldValue.vector()
  // but intentionally omitted from the client type as it is server-only data
  createdAt: Timestamp
}

// ==========================================
// Distribution Plan Types
// ==========================================

export type PlanStatus = 'draft' | 'approved' | 'in_progress' | 'completed' | 'cancelled'

export interface DistributionPlan {
  id: string
  projectId: string
  userId: string
  contentSourceId?: string
  title: string
  totalChapters: number
  status: PlanStatus
  aiRationale: string
  userRequirements?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type ChapterStatus = 'pending' | 'generating' | 'generated' | 'editing' | 'approved' | 'posted_note' | 'posted_x' | 'posted_all' | 'failed'

export interface PlanChapter {
  id: string
  planId: string
  projectId: string
  userId: string
  chapterNumber: number
  title: string
  synopsis: string
  status: ChapterStatus
  articleId?: string
  scheduledAt?: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ==========================================
// Article Types
// ==========================================

export type ArticleStatus = 'draft' | 'review' | 'approved' | 'posted_note' | 'posted_x' | 'posted_all' | 'failed'

export interface Article {
  id: string
  projectId: string
  userId: string
  planId?: string
  chapterId?: string
  contentSourceId?: string
  title: string
  body: string
  summary: string
  tags: string[]
  notePostId?: string
  notePostUrl?: string
  xPostId?: string
  xPostUrl?: string
  status: ArticleStatus
  notePostedAt?: Timestamp
  xPostedAt?: Timestamp
  generationPrompt?: string
  userRequirements?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ==========================================
// Post Log Types
// ==========================================

export type PostPlatform = 'note' | 'x'
export type PostStatus = 'pending' | 'posting' | 'success' | 'failed' | 'rate_limited'

export interface PostLog {
  id: string
  projectId: string
  userId: string
  articleId: string
  platform: PostPlatform
  status: PostStatus
  externalPostId?: string
  externalPostUrl?: string
  errorMessage?: string
  errorCode?: string
  retryCount: number
  scheduledAt?: Timestamp
  postedAt?: Timestamp
  createdAt: Timestamp
}

// ==========================================
// Platform Credentials Types
// ==========================================

export interface NoteCredentials {
  email: string
  password: string // Encrypted in Firestore
}

export interface XCredentials {
  apiKey: string
  apiSecret: string
  accessToken: string
  accessTokenSecret: string
}

export interface PlatformSettings {
  id: string
  projectId: string
  userId: string
  noteCredentials?: NoteCredentials
  xCredentials?: XCredentials
  noteSessionToken?: string
  noteUrlname?: string
  noteSessionExpiresAt?: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ==========================================
// Scheduling Types
// ==========================================

export type ScheduleStatus = 'active' | 'paused' | 'completed'

export interface ScheduleEntry {
  id: string
  projectId: string
  userId: string
  articleId: string
  platform: PostPlatform
  scheduledAt: Timestamp
  status: ScheduleStatus
  createdAt: Timestamp
}

// ==========================================
// Anti-BAN Strategy Types
// ==========================================

export interface PostingThrottle {
  projectId: string
  platform: PostPlatform
  lastPostedAt?: Timestamp
  postsToday: number
  postsThisWeek: number
  postsThisMonth: number
  dailyLimit: number
  weeklyLimit: number
  monthlyLimit: number
  cooldownMinutes: number
}

// ==========================================
// API Response Types
// ==========================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

// ==========================================
// Form / UI Types
// ==========================================

export interface ProjectFormData {
  name: string
  description: string
  noteEnabled: boolean
  xEnabled: boolean
  postingIntervalMinMinutes: number
  postingIntervalMaxMinutes: number
  timezone: string
  activeHoursStart: number
  activeHoursEnd: number
}

export interface PlanGenerationRequest {
  projectId: string
  userRequirements?: string
  suggestedChapters?: number
}

export interface ArticleGenerationRequest {
  projectId: string
  chapterId: string
  planId: string
  chapterTitle: string
  chapterSynopsis: string
  userRequirements?: string
  tone?: string
  style?: string
}

export interface PostRequest {
  articleId: string
  projectId: string
  platform: PostPlatform
}
