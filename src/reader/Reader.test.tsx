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
  act(()=>vi.advanceTimersByTime(225));
  expect(screen.getByRole('button',{name:'第2页'}).getAttribute('aria-current')).toBe('page');
  fireEvent.click(screen.getByRole('button',{name:'第4页'}));
  act(()=>vi.advanceTimersByTime(225));
  expect(screen.getByRole('button',{name:'第2页'}).getAttribute('aria-current')).toBe('page');
  expect((screen.getByRole('button',{name:'播放朗读'}) as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(screen.getByRole('button',{name:'上一页'}));
  act(()=>vi.advanceTimersByTime(225));
  act(()=>vi.advanceTimersByTime(225));
  expect(screen.getByRole('button',{name:'第1页'}).getAttribute('aria-current')).toBe('page');
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
