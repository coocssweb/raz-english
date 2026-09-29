// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { Bookshelf } from './Bookshelf';
import { openReadingStore } from '../reading/storage';
import { localDate } from '../reading/clock';

beforeEach(async () => {
  document.body.innerHTML = '';
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));

  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase('little-reading-house');
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('renders level aa by default with 8 books and wooden shelf planks', async () => {
  render(<Bookshelf />);

  const levelAA = screen.getByRole('button', { name: /认识小世界/i });
  const levelA = screen.getByRole('button', { name: /读懂小句子/i });
  expect(levelAA.getAttribute('aria-pressed')).toBe('true');
  expect(levelA.getAttribute('aria-pressed')).toBe('false');

  await waitFor(() => {
    const bookCards = document.querySelectorAll('.book-card');
    expect(bookCards.length).toBe(8);
  });

  const tiers = document.querySelectorAll('.shelf-tier');
  expect(tiers.length).toBeGreaterThan(0);
  const planks = document.querySelectorAll('.shelf-plank');
  expect(planks.length).toBe(tiers.length);
});

it('switches to level A and displays level A books', async () => {
  render(<Bookshelf />);

  const levelA = screen.getByRole('button', { name: /读懂小句子/i });
  fireEvent.click(levelA);
  expect(levelA.getAttribute('aria-pressed')).toBe('true');

  await waitFor(() => {
    const titles = screen.getAllByText('I Can Move');
    expect(titles.length).toBeGreaterThanOrEqual(1);
    const bookCards = document.querySelectorAll('.book-card');
    expect(bookCards.length).toBe(8);
  });
});

it('displays resume strip and completed sticker when reading progress exists', async () => {
  const now = Date.now();
  const today = localDate(now);
  const store = await openReadingStore();
  await store.saveProgress({
    bookId: 'my-animals',
    page: 2,
    completed: true,
    updatedAt: now,
  });
  await store.saveSession({
    id: 'test-session-1',
    bookId: 'my-animals',
    startedAt: now - 120000,
    lastActivityAt: now,
    endedAt: now,
    visits: [{ page: 0, at: now - 120000, localDate: today }],
    intervals: [{ startMs: now - 120000, endMs: now, localDate: today }],
    completedAt: now,
    completionDate: today,
  });

  render(<Bookshelf />);

  await waitFor(() => {
    expect(screen.getByText(/继续阅读/i)).toBeDefined();
    const readTags = screen.getAllByText(/已读/i);
    expect(readTags.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/今日阅读/i)).toBeDefined();
  });
});
