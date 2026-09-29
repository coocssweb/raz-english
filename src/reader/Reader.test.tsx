// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {Reader} from './Reader';
import {getBook} from '../content/catalog';
import {openReadingStore} from '../reading/storage';

beforeEach(async()=>{
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({matches:true}));
  location.hash = "#/read/my-animals";
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase('little-reading-house');
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
  await (await openReadingStore()).saveProgress({bookId:"my-animals",page:0,completed:false,updatedAt:Date.now()});
  vi.spyOn(HTMLMediaElement.prototype,'play').mockImplementation(function(this:HTMLMediaElement){this.dispatchEvent(new Event('playing'));return Promise.resolve();});
  vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{});
  vi.spyOn(HTMLMediaElement.prototype,'load').mockImplementation(()=>{});
  HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  HTMLDialogElement.prototype.close=function(){this.open=false;};
});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();});
async function openBook(){render(<Reader book={getBook('my-animals')!}/>);await waitFor(()=>expect((screen.getByRole('button',{name:'播放朗读'}) as HTMLButtonElement).disabled).toBe(false));}

it('keeps the outgoing content until the fold, blocks repeated navigation, and unlocks after turning',async()=>{
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({matches:false}));
  await openBook();
  vi.useFakeTimers();
  fireEvent.click(screen.getByRole('button',{name:'播放朗读'}));
  fireEvent.click(screen.getByRole('button',{name:'下一页'}));
  expect(screen.getByRole('button',{name:'第1页'}).getAttribute('aria-current')).toBe('page');
  expect((screen.getByRole('button',{name:'播放朗读'}) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button',{name:'下一页'}));
  fireEvent.keyDown(screen.getByRole('main'),{key:'ArrowRight'});
  // 烟花播放阶段（1200ms内），仍然保持在第1页，操作锁定
  act(()=>vi.advanceTimersByTime(600));
  expect(screen.getByRole('button',{name:'第1页'}).getAttribute('aria-current')).toBe('page');
  expect((screen.getByRole('button',{name:'播放朗读'}) as HTMLButtonElement).disabled).toBe(true);
  // 烟花播放结束（再过600ms）并进入卡片Z轴出场动画（350ms）后，切换到第2页
  act(()=>vi.advanceTimersByTime(600 + 350));
  expect(screen.getByRole('button',{name:'第2页'}).getAttribute('aria-current')).toBe('page');
  fireEvent.click(screen.getByRole('button',{name:'第4页'}));
  act(()=>vi.advanceTimersByTime(350));
  expect(screen.getByRole('button',{name:'第2页'}).getAttribute('aria-current')).toBe('page');
  expect((screen.getByRole('button',{name:'播放朗读'}) as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(screen.getByRole('button',{name:'上一页'}));
  act(()=>vi.advanceTimersByTime(350));
  act(()=>vi.advanceTimersByTime(350));
  expect(screen.getByRole('button',{name:'第1页'}).getAttribute('aria-current')).toBe('page');
});

it('plays celebration fireworks first, then applies Z-axis card transition classes',async()=>{
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({matches:false}));
  await openBook();
  vi.useFakeTimers();
  fireEvent.click(screen.getByRole('button',{name:'播放朗读'}));
  fireEvent.click(screen.getByRole('button',{name:'下一页'}));
  // 烟花播放中，卡片未加翻页动画类
  expect(document.querySelector('.celebration-page')).toBeTruthy();
  expect(document.querySelectorAll('.celebration-page .firework')).toHaveLength(3);
  const card = document.querySelector('.open-book')!;
  expect(card.classList.contains('turning-next-out')).toBe(false);

  // 烟花结束，进入Z轴翻页动画
  act(()=>vi.advanceTimersByTime(1200));
  expect(card.classList.contains('turning-next-out')).toBe(true);

  // 到达折叠点，换到下一页，进入in阶段
  act(()=>vi.advanceTimersByTime(350));
  expect(card.classList.contains('turning-next-in')).toBe(true);

  // 动画完成，移除动画类
  act(()=>vi.advanceTimersByTime(350));
  expect(card.classList.contains('turning-next-in')).toBe(false);
});

it('plays falling ribbons animation on complete',async()=>{
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({matches:false}));
  render(<Reader book={getBook('fruit-time')!}/>);
  await waitFor(()=>expect((screen.getByRole('button',{name:'播放朗读'}) as HTMLButtonElement).disabled).toBe(false));
  vi.useFakeTimers();
  for(let i=1;i<=6;i++){
    fireEvent.click(screen.getByRole('button',{name:`第${i}页`}));
    fireEvent.click(screen.getByRole('button',{name:'播放朗读'}));
    fireEvent.click(screen.getByRole('button',{name:i===6?'我读完啦':'下一页'}));
    if(i<6){
      act(()=>vi.advanceTimersByTime(1200 + 700));
    }
  }
  // 点击我读完啦，触发彩带落下盛大庆祝
  const ribbons = document.querySelector('.celebration-ribbons')!;
  expect(ribbons).toBeTruthy();
  const pieces = ribbons.querySelectorAll('.ribbon');
  expect(pieces.length).toBeGreaterThanOrEqual(40);
  expect(ribbons.querySelectorAll('.ribbon-strip').length).toBeGreaterThan(0);
  expect(ribbons.querySelectorAll('.ribbon-flake').length).toBeGreaterThan(0);
});

it('changes pages immediately when reduced motion is requested',async()=>{
  await openBook();
  fireEvent.click(screen.getByRole('button',{name:'下一页'}));
  expect(screen.getByRole('button',{name:'第2页'}).getAttribute('aria-current')).toBe('page');
  expect((screen.getByRole('button',{name:'播放朗读'}) as HTMLButtonElement).disabled).toBe(false);
});

it('does not complete a book by skipping audio, and rewards each studied page only once',async()=>{
  await openBook();
  fireEvent.click(screen.getByRole('button',{name:'第6页'}));
  fireEvent.click(screen.getByRole('button',{name:'我读完啦'}));
  expect(screen.queryByText('整本读完啦！')).toBeNull();
  for(let i=1;i<=6;i++){
    fireEvent.click(screen.getByRole('button',{name:`第${i}页`}));
    fireEvent.click(screen.getByRole('button',{name:'播放朗读'}));
    fireEvent.click(screen.getByRole('button',{name:i===6?'我读完啦':'下一页'}));
  }
  expect(screen.queryByText('整本读完啦！')).toBeNull();
  expect(screen.queryByText('哇！')).toBeNull();
  expect(screen.queryByText('太棒啦！')).toBeNull();
  expect(screen.queryByText('看看我的足迹')).toBeNull();
  expect((screen.getByRole('button',{name:'读完啦！'}) as HTMLButtonElement).disabled).toBe(false);
  expect(location.hash).toBe('#/read/my-animals');
  fireEvent.click(screen.getByRole('button',{name:'读完啦！'}));
  fireEvent.click(screen.getByRole('button',{name:'播放朗读'}));
  expect(screen.getByRole('button',{name:'正在朗读'})).toBeTruthy();
  const store=await openReadingStore();
  await waitFor(async()=>expect((await store.getProgress('my-animals'))?.completed).toBe(true));
  fireEvent.click(screen.getByRole('button',{name:'上一页'}));
  fireEvent.click(screen.getByRole('button',{name:'下一页'}));
  expect(screen.getByRole('button',{name:'第6页'}).getAttribute('aria-current')).toBe('page');
  await waitFor(()=>expect(location.hash).toBe('#/'),{timeout:3000});
  cleanup();
  await openBook();
  expect(screen.getByRole('button',{name:'第1页'}).getAttribute('aria-current')).toBe('page');
});

it('repeated speaker clicks do not pause playback',async()=>{
  await openBook();
  fireEvent.click(screen.getByRole('button',{name:'播放朗读'}));
  const speaker=screen.getByRole('button',{name:'正在朗读'});
  fireEvent.click(speaker);
  expect(screen.getByRole('button',{name:'正在朗读'})).toBeTruthy();
});

it('preserves studied pages and resumes the first unread page after exit',async()=>{
  await openBook();
  fireEvent.click(screen.getByRole('button',{name:'播放朗读'}));
  fireEvent.click(screen.getByRole('button',{name:'下一页'}));
  fireEvent.click(screen.getByRole('button',{name:'第3页'}));
  fireEvent.click(screen.getByRole('button',{name:'关闭绘本'}));
  fireEvent.click(screen.getByRole('button',{name:'继续努力'}));
  expect(screen.getByRole('button',{name:'第3页'}).getAttribute('aria-current')).toBe('page');
  fireEvent.click(screen.getByRole('button',{name:'关闭绘本'}));
  fireEvent.click(screen.getByRole('button',{name:'直接退出'}));
  await waitFor(()=>expect(location.hash).toBe('#/'));
  cleanup();
  await openBook();
  expect(screen.getByRole('button',{name:'第2页'}).getAttribute('aria-current')).toBe('page');
  expect((await (await openReadingStore()).listSessions()).length).toBeGreaterThan(0);
  for(let i=2;i<=6;i++){
    fireEvent.click(screen.getByRole('button',{name:'播放朗读'}));
    fireEvent.click(screen.getByRole('button',{name:i===6?'我读完啦':'下一页'}));
  }
  await waitFor(async()=>expect((await (await openReadingStore()).getProgress('my-animals'))?.completed).toBe(true));
});

it('resumes an unread gap instead of the last visited page',async()=>{
 await openBook();
 fireEvent.click(screen.getByRole('button',{name:'第3页'}));
 fireEvent.click(screen.getByRole('button',{name:'播放朗读'}));
 fireEvent.click(screen.getByRole('button',{name:'下一页'}));
 cleanup();
 await openBook();
 expect(screen.getByRole('button',{name:'第1页'}).getAttribute('aria-current')).toBe('page');
});
