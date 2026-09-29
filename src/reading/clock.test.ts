import {it,expect} from 'vitest';
import {ReadingClock,localDate} from './clock';
import {summarizeDay} from './statistics';
import type {Session} from './types';
function simulate(playing=false,visible=true){const clock=new ReadingClock();const result=[];for(let t=0;t<=90000;t+=1000)result.push(...clock.sample({monoMs:t,wallMs:new Date(2026,8,29,12).getTime()+t,visible,playing,interaction:t===0}));return result;}
it('caps idle time at sixty seconds',()=>expect(simulate().reduce((n,x)=>n+x.endMs-x.startMs,0)).toBe(60000));
it('counts active audio without double counting',()=>expect(simulate(true).reduce((n,x)=>n+x.endMs-x.startMs,0)).toBe(90000));
it('does not count hidden reading',()=>expect(simulate(true,false)).toHaveLength(0));
it('ignores sleep gaps and resets the anchor',()=>{const c=new ReadingClock();c.sample({monoMs:0,wallMs:100000,visible:true,playing:true,interaction:true});expect(c.sample({monoMs:90000,wallMs:190000,visible:true,playing:true,interaction:false})).toEqual([]);});
it('splits activity at local midnight',()=>{const c=new ReadingClock();const start=new Date(2026,8,29,23,59,58).getTime();c.sample({monoMs:0,wallMs:start,visible:true,playing:true,interaction:true});const a=c.sample({monoMs:5000,wallMs:start+5000,visible:true,playing:true,interaction:false});expect(a.map(x=>x.endMs-x.startMs)).toEqual([2000,3000]);expect(a.map(x=>x.localDate)).toEqual(['2026-09-29','2026-09-30']);});
it('rejects backward clock changes',()=>{const c=new ReadingClock();c.sample({monoMs:0,wallMs:20000,visible:true,playing:true,interaction:true});expect(c.sample({monoMs:1000,wallMs:10000,visible:true,playing:true,interaction:false})).toEqual([]);});
it('unions overlaps and counts distinct books',()=>{const date=localDate(Date.now());const make=(id:string,start:number,end:number):Session=>({id,bookId:'my-animals',startedAt:0,lastActivityAt:0,endedAt:end,visits:[],intervals:[{startMs:start,endMs:end,localDate:date}],completedAt:end,completionDate:date});expect(summarizeDay([make('one',0,10000),make('two',5000,15000)],date)).toEqual({activeMs:15000,bookCount:1,completionCount:2});});
