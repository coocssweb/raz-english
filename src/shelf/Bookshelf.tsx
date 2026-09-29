import { useEffect, useState } from 'react';
import { BookOpen, ChevronRight, Play, Clock3 } from 'lucide-react';
import { books } from '../content/catalog';
import type { Level } from '../content/types';
import { BookImage } from '../components/BookImage';
import { openReadingStore } from '../reading/storage';
import { summarizeDay, formatDuration } from '../reading/statistics';
import { localDate } from '../reading/clock';
import type { Progress } from '../reading/types';
export function Bookshelf() {
    const [level, setLevel] = useState<Level>('aa'); const [progress, setProgress] = useState<Progress[]>([]); const [summary, setSummary] = useState({ activeMs: 0, bookCount: 0, completionCount: 0 });
    useEffect(() => { let alive = true; void openReadingStore().then(async store => { const [sessions, values] = await Promise.all([store.listSessions(), Promise.all(books.map(b => store.getProgress(b.id)))]); if (alive) { setSummary(summarizeDay(sessions, localDate(Date.now()))); setProgress(values.filter((p): p is Progress => !!p)); } }).catch(() => { }); return () => { alive = false; }; }, []);
    const latest = [...progress].sort((a, b) => b.updatedAt - a.updatedAt)[0]; const resume = latest ? books.find(b => b.id === latest.bookId) : undefined;
    return <main className="shelf-main">

        <div className="shelf-toolbar"><div className="level-tabs" aria-label="读物等级"><button aria-pressed={level === 'aa'} className={level === 'aa' ? 'active' : ''} onClick={() => setLevel('aa')}><b>aa</b><span>认识小世界</span></button><button aria-pressed={level === 'A'} className={level === 'A' ? 'active' : ''} onClick={() => setLevel('A')}><b>A</b><span>读懂小句子</span></button></div><span className="level-description"><span className="book-count">8 本</span></span></div>
        {resume && <a className="continue-strip" href={`#/read/${resume.id}`}><span className="continue-icon"><Play size={18} fill="currentColor" /></span><span>继续读 <strong>{resume.title}</strong></span><span>{latest.completed ? '再读一遍' : `第 ${latest.page + 1} / 6 页`}<ChevronRight size={17} /></span></a>}
        <section className="book-grid" aria-label={`${level}级绘本`}>{books.filter(b => b.level === level).map((book, index) => { const p = progress.find(p => p.bookId === book.id); return <a className="book-card" href={`#/read/${book.id}`} key={book.id} style={{ '--book-color': book.color, '--book-rotation': `${index % 2 === 0 ? -1.1 : 1.1}deg` } as React.CSSProperties}><div className="book-object"><BookImage src={book.cover} alt={book.subtitle + '绘本封面'} eager={index < 4} /><span className="book-spine" /><span className="level-sticker">{level}</span>{p?.completed && <span className="read-sticker">已读 ✓</span>}<div className="cover-title"><span>{book.title}</span></div><span className="book-play"><Play size={19} fill="currentColor" /></span></div><div className="book-caption"><h3>{book.title}</h3><p>{book.subtitle}<span>6 页 · 点读</span></p></div></a>; })}</section></main>;
}
