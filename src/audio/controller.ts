import type {Page} from '../content/types';
export type AudioState='idle'|'loading'|'playing'|'paused'|'error';
type Callbacks={onState:(s:AudioState)=>void;onEnded:()=>void;onError:(message:string)=>void};
export function createAudioController(cb:Callbacks,factory:()=>HTMLAudioElement=()=>new Audio()){
 let media:HTMLAudioElement|undefined,token=0,disposed=false;
 const stop=()=>{token++;if(media){media.onended=null;media.onerror=null;media.onplaying=null;media.onpause=null;media.pause();media.removeAttribute('src');media.load();media=undefined;}if(!disposed)cb.onState('idle');};
 const fail=()=>{cb.onState('error');cb.onError('声音暂时没能播放，请再试一次。');};
 return {load(page:Page){stop();if(disposed)return;if(page.audio.kind!=='file'){cb.onError('这本书的英语声音暂不可用。');cb.onState('error');return;}const a=factory();media=a;const active=token;a.preload='auto';a.src=page.audio.src;a.onended=()=>{if(!disposed&&active===token){cb.onState('idle');cb.onEnded();}};a.onerror=()=>{if(!disposed&&active===token)fail();};a.onplaying=()=>{if(!disposed&&active===token)cb.onState('playing');};a.onpause=()=>{if(!disposed&&active===token)cb.onState('paused');};},async play(){if(!media||disposed)return;const active=token;cb.onState('loading');try{await media.play();}catch{if(!disposed&&active===token)fail();}},pause(){media?.pause();if(!disposed)cb.onState('paused');},async replay(){if(!media||disposed)return;media.currentTime=0;await this.play();},stop,dispose(){stop();disposed=true;}};
}
