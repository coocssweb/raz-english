export type Level = 'aa' | 'A';
export type Page = { id: string; english: string; chinese: string; image: string; alt: string; audio: { kind: 'file'; src: string } | { kind: 'speech'; lang: 'en-US' } };
export type Book = { id: string; level: Level; title: string; subtitle: string; cover: string; tags: string[]; order: number; color: string; pages: Page[] };
