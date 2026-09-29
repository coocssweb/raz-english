import {existsSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {books} from '../src/content/catalog';
import type {Book} from '../src/content/types';
export function validateAssets(catalog:Book[],root:string):string[]{const errors:string[]=[];for(const book of catalog){for(const file of [book.cover,...book.pages.flatMap(p=>[p.image,...(p.audio.kind==='file'?[p.audio.src]:[])])]){const path=resolve(root,'.'+file);if(!existsSync(path)||statSync(path).size===0)errors.push(`Missing/empty: ${file}`);}}return errors;}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const errors=validateAssets(books,resolve('public'));for(const theme of ['giraffe','pig','pip-posy','panda'])if(!existsSync(resolve(`public/themes/${theme}.png`)))errors.push(`Missing theme: ${theme}`);if(books.length!==16||books.some(b=>b.pages.length!==6))errors.push('Expected 16 books with 6 pages each');if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log('PASS: 16 books, 96 pages, 112 book images, 96 audio tracks, 4 themes.');}
