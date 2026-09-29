import 'fake-indexeddb/auto';
import {it,expect} from 'vitest';
import {openReadingStore} from './storage';
import type {Session} from './types';
it('persists independent sessions and restores progress',async()=>{const s=await openReadingStore();const session:Session={id:'s1',bookId:'my-animals',startedAt:100,lastActivityAt:200,endedAt:null,visits:[{page:2,at:100,localDate:'2026-09-29'}],intervals:[],completedAt:null,completionDate:null};await s.saveSession(session);await s.saveSession({...session,id:'s2'});await s.saveProgress({bookId:'my-animals',page:2,completed:false,updatedAt:200});const reopened=await openReadingStore();expect((await reopened.listSessions()).length).toBe(2);expect((await reopened.getProgress('my-animals'))?.page).toBe(2);});
it('does not replace newer progress with a late old write',async()=>{const s=await openReadingStore();await s.saveProgress({bookId:'newer',page:5,completed:true,updatedAt:200});await s.saveProgress({bookId:'newer',page:1,completed:false,updatedAt:100});expect((await s.getProgress('newer'))?.page).toBe(5);});
