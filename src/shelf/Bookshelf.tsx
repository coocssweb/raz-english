import { useEffect, useState } from 'react';
import { BookOpen, ChevronRight, Play, Clock3, Check } from 'lucide-react';
import { books } from '../content/catalog';
import type { Level } from '../content/types';
import { BookImage } from '../components/BookImage';
import { openReadingStore } from '../reading/storage';
import { summarizeDay, formatDuration } from '../reading/statistics';
import { localDate } from '../reading/clock';
import type { Progress } from '../reading/types';

function useShelfColumns() {
  const [cols, setCols] = useState<number>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return 4;
    try {
      return window.matchMedia('(max-width: 760px)').matches ? 2 : 4;
    } catch {
      return 4;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    try {
      const mq = window.matchMedia('(max-width: 760px)');
      const update = () => setCols(mq.matches ? 2 : 4);
      if (mq.addEventListener) {
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
      } else if (mq.addListener) {
        mq.addListener(update);
        return () => mq.removeListener(update);
      }
    } catch { }
  }, []);

  return cols;
}

export function Bookshelf() {
  const [level, setLevel] = useState<Level>('aa');
  const [progress, setProgress] = useState<Progress[]>([]);
  const [summary, setSummary] = useState({ activeMs: 0, bookCount: 0, completionCount: 0 });
  const cols = useShelfColumns();

  useEffect(() => {
    let alive = true;
    void openReadingStore().then(async store => {
      const [sessions, values] = await Promise.all([
        store.listSessions(),
        Promise.all(books.map(b => store.getProgress(b.id)))
      ]);
      if (alive) {
        setSummary(summarizeDay(sessions, localDate(Date.now())));
        setProgress(values.filter((p): p is Progress => !!p));
      }
    }).catch(() => { });
    return () => { alive = false; };
  }, []);

  const latest = [...progress].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const resume = latest ? books.find(b => b.id === latest.bookId) : undefined;
  const filteredBooks = books.filter(b => b.level === level);

  const tiers: typeof filteredBooks[] = [];
  for (let i = 0; i < filteredBooks.length; i += cols) {
    tiers.push(filteredBooks.slice(i, i + cols));
  }

  return (
    <main className="shelf-main">
      <div className="shelf-topline">
        <div className="shelf-heading">
          <div className="shelf-title-icon" aria-hidden="true">
            <BookOpen size={26} />
          </div>
          <div>
            <h1>探索绘本世界</h1>
            <p>每一本都是一个精彩小故事</p>
          </div>
        </div>

        {summary.activeMs > 0 && (
          <div className="today-chip" aria-label="今日阅读统计">
            <Clock3 size={16} />
            <span>今日阅读 <strong>{formatDuration(summary.activeMs)}</strong></span>
            {summary.completionCount > 0 && (
              <>
                <span className="chip-dot" aria-hidden="true">·</span>
                <span>读完 <strong>{summary.completionCount}</strong> 本</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="shelf-toolbar">
        <div className="level-tabs" aria-label="读物等级">
          <button
            aria-pressed={level === 'aa'}
            className={level === 'aa' ? 'active' : ''}
            onClick={() => setLevel('aa')}
          >
            <b>aa</b>
            <span>认识小世界</span>
          </button>
          <button
            aria-pressed={level === 'A'}
            className={level === 'A' ? 'active' : ''}
            onClick={() => setLevel('A')}
          >
            <b>A</b>
            <span>读懂小句子</span>
          </button>
        </div>
        <div className="level-meta">
          <span className="book-count">共 {filteredBooks.length} 本绘本</span>
        </div>
      </div>

      {resume && (
        <a className="continue-strip" href={`#/read/${resume.id}`}>
          <span className="continue-icon" aria-hidden="true">
            <Play size={17} fill="currentColor" />
          </span>
          <span className="continue-body">
            <span className="continue-label">继续阅读</span>
            <strong>{resume.title}</strong>
            <span className="continue-subtitle">({resume.subtitle})</span>
          </span>
          <span className="continue-status">
            <span>{latest.completed ? '已读完 · 再读一遍' : `读到第 ${latest.page + 1} / 6 页`}</span>
            <ChevronRight size={17} />
          </span>
        </a>
      )}

      <section className="book-grid bookshelf-tiers" aria-label={`${level}级绘本`}>
        {tiers.map((tierBooks, tierIndex) => (
          <div className="shelf-tier" key={`tier-${tierIndex}`}>
            {tierBooks.map((book, idx) => {
              const globalIndex = tierIndex * cols + idx;
              const p = progress.find(item => item.bookId === book.id);
              const rotation = globalIndex % 2 === 0 ? -1.1 : 1.1;

              return (
                <a
                  className="book-card"
                  href={`#/read/${book.id}`}
                  key={book.id}
                  style={{
                    '--book-color': book.color,
                    '--book-rotation': `${rotation}deg`,
                  } as React.CSSProperties}
                >
                  <div className="book-stage" style={{ gridColumn: idx + 1 }}>
                    <div className="book-object">
                      <BookImage
                        src={book.cover}
                        alt={`${book.title}绘本封面`}
                        eager={tierIndex === 0 && idx < 4}
                      />
                      <span className="book-spine" />
                      <span className="book-edge" />
                      <span className="level-sticker">{level}</span>
                      {p?.completed && (
                        <span className="read-sticker">
                          <Check size={11} strokeWidth={3} /> 已读
                        </span>
                      )}
                      <div className="cover-title">
                        <span>{book.title}</span>
                      </div>
                      <span className="book-play" aria-hidden="true">
                        <Play size={18} fill="currentColor" />
                      </span>
                    </div>
                    <div className="book-shadow" aria-hidden="true" />
                  </div>

                  <div className="book-caption" style={{ gridColumn: idx + 1 }}>
                    <h3>{book.title}</h3>
                    <p>
                      <span className="book-subtitle-text">{book.subtitle}</span>
                      <span className="book-meta-tag">6 页 · 点读</span>
                    </p>
                  </div>
                </a>
              );
            })}

            <div className="shelf-plank" aria-hidden="true">
              <div className="shelf-surface" />
              <div className="shelf-front">
                <span className="shelf-front-bevel" />
              </div>
              <div className="shelf-shadow" />
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
