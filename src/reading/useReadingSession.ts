import { useEffect, useRef, useState } from 'react';
import type { Book } from '../content/types';
import { ReadingClock, localDate } from './clock';
import { openReadingStore, type ReadingStore } from './storage';
import type { Session, Progress } from './types';
export function useReadingSession(book: Book) {
    const [page, setPageState] = useState(0), [ready, setReady] = useState(false), [saveError, setSaveError] = useState(false), [completed, setCompleted] = useState(false);
    const [learnedPages, setLearnedPages] = useState<number[]>([]);
    const api = useRef<{ setPage: (p: number) => void; complete: () => void; saveProgress: () => Promise<void>; markLearned: (p: number) => void; playingChanged: (p: boolean) => void; interact: () => void } | null>(null);
    useEffect(() => {
        let disposed = false, store: ReadingStore | undefined; const clock = new ReadingClock(); let playing = false, current = 0, session: Session | undefined, progress: Progress | undefined, timer: ReturnType<typeof setInterval> | undefined, ticks = 0;
        const sample = (interaction = false) => { if (!session) return; const now = Date.now(); session.intervals.push(...clock.sample({ monoMs: performance.now(), wallMs: now, visible: !document.hidden, playing, interaction })); if (interaction) session.lastActivityAt = now; };
        const save = () => { if (!store || !session || !progress) return; const snapshot = structuredClone(session), p = { ...progress }; void Promise.all([store.saveSession(snapshot), store.saveProgress(p)]).catch(() => setSaveError(true)); };
        const interact = () => sample(true);
        const visibility = () => { sample(); if (document.hidden) { playing = false; sample(); } save(); };
        const exit = () => { sample(); if (session) session.endedAt = Date.now(); save(); };
        const init = async () => {
            let saved: Progress | undefined; try { store = await openReadingStore(); saved = await store.getProgress(book.id); } catch { if (!disposed) setSaveError(true); } if (disposed) return;
            const learned = saved && !saved.completed
                ? (saved.learnedPages ?? Array.from({ length: saved.page }, (_, i) => i)).filter(p => Number.isInteger(p) && p >= 0 && p < book.pages.length)
                : [];
            current = book.pages.findIndex((_, i) => !learned.includes(i));
            if (current < 0) current = 0;
            setLearnedPages(learned); const now = Date.now(); session = { id: crypto.randomUUID(), bookId: book.id, startedAt: now, lastActivityAt: now, endedAt: null, visits: [{ page: current, at: now, localDate: localDate(now) }], intervals: [], completedAt: null, completionDate: null }; progress = { bookId: book.id, page: current, completed: false, learnedPages: learned, updatedAt: now }; setPageState(current); setReady(true); sample(true); save();
            api.current = { setPage(p) { if (p < 0 || p >= book.pages.length || p === current) return; sample(true); current = p; const now = Date.now(); session!.visits.push({ page: p, at: now, localDate: localDate(now) }); progress = { ...progress!, page: p, updatedAt: now }; setPageState(p); save(); }, complete() { sample(true); if (session!.completedAt === null) { session!.completedAt = Date.now(); session!.completionDate = localDate(Date.now()); progress!.completed = true; progress!.updatedAt = Date.now(); setCompleted(true); save(); } }, markLearned(p) { if (!progress || progress.learnedPages?.includes(p)) return; progress.learnedPages = [...(progress.learnedPages ?? []), p]; progress.updatedAt = Date.now(); setLearnedPages(progress.learnedPages); save(); }, async saveProgress() { sample(); if (store && progress && session) await Promise.all([store.saveProgress(structuredClone(progress)), store.saveSession(structuredClone(session))]); }, playingChanged(p) { sample(); playing = p; sample(); save(); }, interact };
            timer = setInterval(() => { sample(); if (++ticks % 5 === 0) save(); }, 1000); document.addEventListener('visibilitychange', visibility); window.addEventListener('pagehide', exit);
        }; void init();
        return () => { disposed = true; if (timer) clearInterval(timer); exit(); api.current = null; document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', exit); };
    }, [book.id]);
    return { page, ready, completed, saveError, learnedPages, markLearned: (p: number) => api.current?.markLearned(p), setPage: (p: number) => api.current?.setPage(p), complete: () => api.current?.complete(), saveProgress: () => api.current?.saveProgress() ?? Promise.resolve(), playingChanged: (p: boolean) => api.current?.playingChanged(p), interact: () => api.current?.interact() };
}

