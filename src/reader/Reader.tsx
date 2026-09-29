import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { X, ChevronLeft, ChevronRight, RotateCcw, Volume2, Languages, Check } from 'lucide-react';
import type { Book } from '../content/types';
import { BookImage } from '../components/BookImage';
import { createAudioController, type AudioState } from '../audio/controller';
import { useReadingSession } from '../reading/useReadingSession';
import { loadTheme, type ThemeId } from '../themes/themes';

export function Reader({ book, theme = loadTheme() }: { book: Book; theme?: ThemeId }) {
    const session = useReadingSession(book);
    const [state, setState] = useState<AudioState>('idle');
    const [error, setError] = useState('');
    const [chinese, setChinese] = useState(false);
    const [showExit, setShowExit] = useState(false);
    const [exiting, setExiting] = useState(false);
    const [celebrationType, setCelebrationType] = useState<'page' | 'complete' | null>(null);
    const [rewardCount, setRewardCount] = useState(0);
    const [turnState, setTurnState] = useState<{ dir: 'next' | 'prev'; phase: 'out' | 'in' } | null>(null);
    const [isWaitingCelebration, setIsWaitingCelebration] = useState(false);
    const [hint, setHint] = useState('');
    const listened = useRef(new Set<number>());
    const learned = useRef(new Set<number>());
    useEffect(() => { learned.current = new Set(session.learnedPages); }, [session.learnedPages]);
    const finishing = useRef(false);
    const finishTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const turnTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const celebrationWaitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const controller = useRef<ReturnType<typeof createAudioController> | null>(null);
    const current = useRef(session); current.current = session;
    const audioState = useRef<AudioState>('idle');
    const rewardAudio = useRef<HTMLAudioElement | null>(null);
    const rewardTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const dialog = useRef<HTMLDialogElement>(null);
    const closeButton = useRef<HTMLButtonElement>(null);
    const continueButton = useRef<HTMLButtonElement>(null);

    const isReducedMotion = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

    useEffect(() => {
        const audio = createAudioController({
            onState(s) { audioState.current = s; setState(s); current.current.playingChanged(s === 'playing'); if (s === 'playing') listened.current.add(current.current.page); },
            onError(message) { setError(message); }, onEnded() { }
        });
        controller.current = audio;
        rewardAudio.current = new Audio('/audio/wow.wav');
        const visibility = () => { if (document.hidden) { audio.pause(); rewardAudio.current?.pause(); } };
        document.addEventListener('visibilitychange', visibility);
        return () => {
            clearTimeout(rewardTimer.current);
            clearTimeout(finishTimer.current);
            clearTimeout(turnTimer.current);
            clearTimeout(celebrationWaitTimer.current);
            audio.dispose();
            controller.current = null;
            rewardAudio.current?.pause();
            document.removeEventListener('visibilitychange', visibility);
        };
    }, [book.id]);
    useEffect(() => {
        if (!session.ready) return;
        setError(''); setHint(''); controller.current?.load(book.pages[session.page]);
        const next = book.pages[session.page + 1]; if (next) { const preload = new Image(); preload.src = next.image; }
    }, [session.page, session.ready, book]);
    useEffect(() => { if (showExit) { dialog.current?.showModal(); continueButton.current?.focus(); } else if (dialog.current?.open) { dialog.current.close(); closeButton.current?.focus(); } }, [showExit]);

    const TURN_DURATION = 350;

    const startTurn = (targetPage: number, dir: 'next' | 'prev') => {
        if (!session.ready || targetPage < 0 || targetPage >= book.pages.length) return;
        controller.current?.stop();
        if (isReducedMotion()) {
            session.setPage(targetPage);
            return;
        }
        setTurnState({ dir, phase: 'out' });
        clearTimeout(turnTimer.current);
        turnTimer.current = setTimeout(() => {
            session.setPage(targetPage);
            setTurnState({ dir, phase: 'in' });
            turnTimer.current = setTimeout(() => {
                setTurnState(null);
            }, TURN_DURATION);
        }, TURN_DURATION);
    };

    const turn = (p: number) => {
        if (!session.ready || p < 0 || p >= book.pages.length || turnState !== null || isWaitingCelebration) return;
        const dir = p >= session.page ? 'next' : 'prev';
        startTurn(p, dir);
    };

    const play = (replay = false) => {
        session.interact(); if (!replay && (audioState.current === 'playing' || audioState.current === 'loading')) return;
        rewardAudio.current?.pause(); setError(''); setHint('');
        void controller.current?.replay();
    };

    const celebrate = (type: 'page' | 'complete') => {
        setCelebrationType(type);
        setRewardCount(c => c + 1);
        clearTimeout(rewardTimer.current);
        const duration = type === 'complete' ? 3000 : 1200;
        rewardTimer.current = setTimeout(() => setCelebrationType(null), duration);
        const audio = rewardAudio.current;
        if (audio) { audio.currentTime = 0; void audio.play().catch(() => { }); }
    };

    const finish = () => {
        if (finishing.current) return;
        finishing.current = true;
        controller.current?.pause();
        session.complete();
        celebrate('complete');
        clearTimeout(finishTimer.current);
        finishTimer.current = setTimeout(() => {
            void current.current.saveProgress().then(() => { location.hash = '#/'; }).catch(() => {
                finishing.current = false;
                setError('进度暂时无法保存，请再点一次读完啦。');
            });
        }, 3000);
    };

    const advance = () => {
        if (!session.ready || turnState !== null || isWaitingCelebration) return;
        if (session.completed) {
            if (session.page < book.pages.length - 1) startTurn(session.page + 1, 'next');
            else finish();
            return;
        }
        const page = session.page;
        const fresh = listened.current.has(page) && !learned.current.has(page);
        if (fresh) { learned.current.add(page); session.markLearned(page); }
        if (learned.current.size === book.pages.length) { finish(); return; }
        if (page < book.pages.length - 1) {
            controller.current?.stop();
            if (fresh) {
                celebrate('page');
                if (isReducedMotion()) {
                    startTurn(page + 1, 'next');
                } else {
                    setIsWaitingCelebration(true);
                    clearTimeout(celebrationWaitTimer.current);
                    celebrationWaitTimer.current = setTimeout(() => {
                        setIsWaitingCelebration(false);
                        startTurn(page + 1, 'next');
                    }, 1200);
                }
            } else {
                startTurn(page + 1, 'next');
            }
        } else {
            controller.current?.pause();
            setHint(listened.current.has(page) ? '还有几页没学完，点下面的小圆点回去听一听吧！' : '点一下小喇叭，再来完成这一页吧！');
            if (fresh) celebrate('page');
        }
    };

    const requestClose = () => { controller.current?.pause(); rewardAudio.current?.pause(); if (session.completed) location.hash = '#/'; else setShowExit(true); };
    const exit = async () => { setExiting(true); try { await session.saveProgress(); location.hash = '#/'; } catch { setError('进度暂时无法保存，请再试一次。'); setShowExit(false); } finally { setExiting(false); } };
    const page = book.pages[session.page];
    const isLocked = !session.ready || turnState !== null || isWaitingCelebration;

    return <main className="reader-main" onPointerDown={() => session.interact()} onKeyDown={e => { session.interact(); if (e.target === e.currentTarget && !showExit && !isLocked && !finishing.current) { if (e.key === 'ArrowRight') advance(); if (e.key === 'ArrowLeft' && session.page > 0) turn(session.page - 1); } }} tabIndex={-1}>
        <div className="reader-top"><button ref={closeButton} className="reader-close tactile" aria-label="关闭绘本" onClick={requestClose} disabled={!session.ready}><X size={28} /></button></div>
        {session.saveError && <div role="status" className="notice">本次阅读记录无法保存，但仍然可以看书和听读。</div>}
        <div className="reader-card-stage">
            <section className={`open-book ${turnState ? `turning-${turnState.dir}-${turnState.phase}` : ''}`}>
                <div className="page-picture"><BookImage key={page.id} src={page.image} alt={page.alt} eager /></div>
                <div className="page-text">
                    <div className="sentence-wrap"><button className={`sentence ${state === 'playing' ? 'speaking' : ''}`} onClick={() => play()} disabled={isLocked} aria-label={`朗读：${page.english}`}>{page.english}</button>{chinese && <p className="translation">{page.chinese}</p>}</div>
                    <div className="audio-controls">
                        <button className="icon-button replay-button" onClick={() => play(true)} disabled={isLocked} aria-label="从头重播"><RotateCcw size={22} /></button>
                        <button className={`play-button speaker-button tactile ${state === 'playing' ? 'playing' : ''}`} onClick={() => play()} disabled={isLocked} aria-label={state === 'playing' ? '正在朗读' : '播放朗读'} aria-busy={state === 'loading'}><Volume2 size={34} /></button>
                        <button className={`icon-button translation-button ${chinese ? 'is-on' : ''}`} onClick={() => setChinese(c => !c)} aria-label={chinese ? '隐藏中文' : '显示中文'} aria-pressed={chinese}><Languages size={22} /></button>
                    </div>
                    {error && <p role="status" className="audio-error">{error}</p>}
                </div>
            </section>
        </div>
        <div className="reader-bottom">
            <button className="page-nav tactile" disabled={session.page === 0 || isLocked} onClick={() => turn(session.page - 1)}><ChevronLeft size={22} /><span>上一页</span></button>
            <div className="page-dots" aria-label="选择页码">{book.pages.map((p, i) => <button key={p.id} disabled={isLocked} className={`${i === session.page ? 'current' : ''} ${learned.current.has(i) ? 'learned' : ''}`} onClick={() => { if (i !== session.page) turn(i); }} aria-label={`第${i + 1}页`} aria-current={i === session.page ? 'page' : undefined}><span /></button>)}</div>
            <button className="page-nav next tactile" disabled={isLocked} onClick={advance}>{session.page < book.pages.length - 1 ? <><span>下一页</span><ChevronRight size={22} /></> : <><Check size={20} />{session.completed ? '读完啦！' : '我读完啦'}</>}</button>
        </div>
        {hint && !session.completed && <p className="reading-hint" role="status">{hint}</p>}
        {celebrationType === 'page' && <div key={rewardCount} className="reading-celebration celebration-page" aria-hidden="true">{Array.from({ length: 3 }, (_, burst) => <div className={`firework firework-${burst}`} key={burst}>{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ '--angle': `${i * 30}deg`, '--spark-color': ['#e8b33f', '#e88d99', '#6daaa1', '#b49bd4', '#f59e0b', '#38bdf8'][i % 6] } as CSSProperties} />)}</div>)}</div>}
        {celebrationType === 'complete' && <div key={rewardCount} className="reading-celebration celebration-ribbons" aria-hidden="true">{Array.from({ length: 48 }, (_, i) => { const left = `${(i * 2.1 + 1.5) % 96 + 2}%`; const delay = `${((i * 0.06) % 1.1).toFixed(2)}s`; const duration = `${(2.2 + (i % 5) * 0.25).toFixed(2)}s`; const color = ['#f59e0b', '#ec4899', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#f97316', '#06b6d4', '#eab308'][i % 9]; const isStrip = i % 3 === 0; return <span key={i} className={`ribbon ${isStrip ? 'ribbon-strip' : 'ribbon-flake'}`} style={{ '--ribbon-left': left, '--ribbon-delay': delay, '--ribbon-duration': duration, '--ribbon-color': color } as CSSProperties} />; })}</div>}
        {showExit && <dialog ref={dialog} className="reader-exit-dialog" aria-labelledby="exit-title" aria-describedby="exit-description" onCancel={e => { e.preventDefault(); if (!exiting) setShowExit(false); }}>
            <img className="exit-friend" src={`/themes/${theme}.png`} alt="" />
            <h2 id="exit-title">等等，先别走！</h2><p id="exit-description">阅读进度会保存，下次可以接着读。</p>
            <div className="exit-actions"><button ref={continueButton} className="tactile keep-reading" disabled={exiting} onClick={() => setShowExit(false)}>继续努力</button><button className="tactile" disabled={exiting} onClick={() => void exit()}>{exiting ? '正在退出…' : '直接退出'}</button></div>
        </dialog>}
    </main>;
}

