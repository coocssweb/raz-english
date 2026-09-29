import { describe,it,expect } from 'vitest';
import { books } from './catalog';
describe('original reading catalog',()=>{it('contains sixteen complete six-page books',()=>{expect(books).toHaveLength(16);for(const level of ['aa','A'])expect(books.filter(b=>b.level===level)).toHaveLength(8);const ids:string[]=[];for(const book of books){ids.push(book.id);expect(book.pages).toHaveLength(6);for(const p of book.pages){ids.push(p.id);expect(p.english.trim()).not.toBe('');expect(p.chinese.trim()).not.toBe('');expect(p.alt.trim()).not.toBe('');}}expect(new Set(ids).size).toBe(ids.length);});});
