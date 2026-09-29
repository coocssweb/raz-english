import { useEffect, useState } from 'react';
import { BookOpen, Footprints, Palette, X, Check } from 'lucide-react';
import { ThemeBackdrop } from './themes/ThemeBackdrop';
import { Bookshelf } from './shelf/Bookshelf';
import { themes, loadTheme, type ThemeId } from './themes/themes';
import { STORAGE_NOTICE } from './reading/storage';
import { getBook } from './content/catalog';
import { Reader } from './reader/Reader';
import { ReadingHistory } from './history/ReadingHistory';
export function App() {
    const [route, setRoute] = useState(location.hash || '#/'); const [theme, setTheme] = useState<ThemeId>(loadTheme); const [showThemes, setShowThemes] = useState(false); const [notice, setNotice] = useState('');
    useEffect(() => { const navigate = () => { setRoute(location.hash || '#/'); window.scrollTo(0, 0); }; const warn = () => setNotice('部分阅读记录无法读取，其他记录已保留。'); window.addEventListener('hashchange', navigate); window.addEventListener(STORAGE_NOTICE, warn); return () => { window.removeEventListener('hashchange', navigate); window.removeEventListener(STORAGE_NOTICE, warn); }; }, []);
    useEffect(() => { document.documentElement.dataset.theme = theme; try { localStorage.setItem('reading-theme', theme); } catch { setNotice('当前浏览器无法保存主题选择。'); } }, [theme]);
    useEffect(() => { if (!showThemes) return; const previous = document.activeElement as HTMLElement; const dialog = document.querySelector<HTMLDialogElement>('#theme-dialog'); dialog?.showModal(); return () => { dialog?.close(); previous?.focus(); }; }, [showThemes]);
    const readerId = route.startsWith('#/read/') ? route.slice(7) : null; const book = readerId ? getBook(readerId) : undefined;
    const isShelf = !readerId && route !== '#/history';
    return <div className={`app ${isShelf ? 'app-shelf' : book ? 'app-reader' : ''}`}>{(isShelf || book) && <ThemeBackdrop theme={theme} />}{!book && <header className="site-header"><a className="brand" href="#/" aria-label="小小绘本屋首页"><span className="brand-icon"><BookOpen size={26} /></span><span><strong>小小绘本屋</strong></span></a><nav aria-label="主要导航"><a href="#/" aria-label="小书架" className={route === '#/' ? 'selected' : ''}><BookOpen size={18} /><span>小书架</span></a><a href="#/history" aria-label="阅读足迹" className={route === '#/history' ? 'selected' : ''}><Footprints size={18} /><span>阅读足迹</span></a><button onClick={() => setShowThemes(true)} aria-label="换个小屋" className="theme-button"><Palette size={18} /><span>换个小屋</span><span className="theme-dot" /></button></nav></header>}{notice && <div className="notice" role="status">{notice}<button aria-label="关闭提示" onClick={() => setNotice('')}><X size={16} /></button></div>}
        {readerId ? (book ? <Reader key={book.id} book={book} theme={theme} /> : <main className="empty"><h1>这本书还没来到书架</h1><a className="primary" href="#/">回到小书架</a></main>) : route === '#/history' ? <ReadingHistory /> : <Bookshelf />}
        {showThemes && <dialog id="theme-dialog" className="theme-dialog" onCancel={() => setShowThemes(false)} onClick={e => { if (e.target === e.currentTarget) setShowThemes(false); }}><div className="dialog-title"><div><h2>选一个喜欢的小屋</h2></div><button className="icon-button" aria-label="关闭主题选择" onClick={() => setShowThemes(false)}><X /></button></div><div className="theme-options">{(Object.keys(themes) as ThemeId[]).map(id => <button key={id} aria-pressed={theme === id} className={`theme-option ${theme === id ? 'chosen' : ''}`} onClick={() => { setTheme(id); setShowThemes(false); }} style={{ '--option-color': themes[id].color } as React.CSSProperties}><img src={`/themes/${id}.png`} alt="" /><span className="theme-name">{themes[id].name}{theme === id && <Check size={19} />}</span></button>)}</div></dialog>}
    </div>;
}


