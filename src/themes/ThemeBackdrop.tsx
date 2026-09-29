import type { ThemeId } from './themes';

/** Decorative scenery never intercepts a child's taps on the bookshelf. */
export function ThemeBackdrop({ theme }: { theme: ThemeId }) {
  return <div className="theme-backdrop" aria-hidden="true">
    <div className="theme-landscape" />
    <img className="scene-friend" src={`/themes/${theme}.png`} alt="" />
    <div className="scene-ground" />
  </div>;
}
