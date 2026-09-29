import {it,expect} from 'vitest';
import {validateAssets} from './validate-content';
import {books} from '../src/content/catalog';
it('reports nonexistent image and audio files instead of claiming completeness',()=>{const errors=validateAssets(books,'missing-assets-root');expect(errors.length).toBe(208);expect(errors.some(e=>e.includes('cover.png'))).toBe(true);expect(errors.some(e=>e.includes('.wav'))).toBe(true);});
