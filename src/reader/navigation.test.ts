import {it,expect} from 'vitest';
import {pageAfterAudio} from './navigation';
it('does not advance or complete when playback is manual or hidden',()=>{expect(pageAfterAudio(2,6,false,false)).toEqual({type:'stay'});expect(pageAfterAudio(2,6,true,true)).toEqual({type:'stay'});});
it('advances auto playback and finishes the final page',()=>{expect(pageAfterAudio(2,6,true,false)).toEqual({type:'advance',page:3});expect(pageAfterAudio(5,6,true,false)).toEqual({type:'complete'});});
