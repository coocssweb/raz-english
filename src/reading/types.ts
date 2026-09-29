export type ActiveInterval = { startMs: number; endMs: number; localDate: string };
export type Visit = { page: number; at: number; localDate: string };
export type Session = { id: string; bookId: string; startedAt: number; lastActivityAt: number; endedAt: number | null; visits: Visit[]; intervals: ActiveInterval[]; completedAt: number | null; completionDate: string | null };
export type Progress = { bookId: string; page: number; completed: boolean; learnedPages?: number[]; updatedAt: number };
