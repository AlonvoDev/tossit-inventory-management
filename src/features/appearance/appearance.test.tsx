import fs from 'node:fs';
import path from 'node:path';
import React, { useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTheme } from '@mui/material';
import { palettes } from '../../app/theme';
import { AppearanceProvider } from './AppearanceProvider';
import { useAppearance } from './appearanceContext';
import { AccessibilityMenu } from './AccessibilityMenu';
import {
  APPEARANCE_STORAGE_KEY,
  readAppearancePreference,
  resolveAppearance,
  writeAppearancePreference,
} from './appearancePreference';

/** Controllable `(prefers-color-scheme: dark)` media query. */
function mockSystem(initialDark: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const query = {
    matches: initialDark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: string, fn: (event: MediaQueryListEvent) => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: (event: MediaQueryListEvent) => void) => listeners.delete(fn),
  };
  vi.stubGlobal('matchMedia', vi.fn(() => query));
  return {
    set(dark: boolean) {
      query.matches = dark;
      act(() => listeners.forEach(fn => fn({ matches: dark } as MediaQueryListEvent)));
    },
    listenerCount: () => listeners.size,
  };
}

const Probe: React.FC = () => {
  const theme = useTheme();
  const { preference, mode } = useAppearance();
  return <output data-testid="probe">{`${preference}/${mode}/${theme.palette.mode}/${theme.palette.background.default}`}</output>;
};

const probe = () => screen.getByTestId('probe').textContent;

const app = (children: React.ReactNode = null) => (
  <AppearanceProvider>
    <AccessibilityMenu />
    <Probe />
    {children}
  </AppearanceProvider>
);

const choose = async (label: string) => {
  await userEvent.click(screen.getByRole('button', { name: 'נגישות' }));
  await userEvent.click(await screen.findByRole('menuitemradio', { name: label === 'לפי המכשיר' ? /^לפי המכשיר/ : label }));
};

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-appearance');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('appearance preference storage', () => {
  it('reads valid values and treats missing or malformed values as system', () => {
    expect(readAppearancePreference({ getItem: () => 'dark' })).toBe('dark');
    expect(readAppearancePreference({ getItem: () => 'light' })).toBe('light');
    expect(readAppearancePreference({ getItem: () => null })).toBe('system');
    expect(readAppearancePreference({ getItem: () => '{"mode":"dark"}' })).toBe('system');
    expect(readAppearancePreference({ getItem: () => 'DARK' })).toBe('system');
  });

  it('survives blocked storage', () => {
    const blocked = { getItem: () => { throw new Error('SecurityError'); } };
    expect(readAppearancePreference(blocked)).toBe('system');
    expect(readAppearancePreference(null)).toBe('system');
    const full = { setItem: () => { throw new Error('QuotaExceededError'); }, removeItem: () => {} };
    expect(writeAppearancePreference('dark', full)).toBe(false);
    expect(writeAppearancePreference('dark', null)).toBe(false);
  });

  it('stores explicit choices and removes the key for system', () => {
    writeAppearancePreference('dark');
    expect(localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBe('dark');
    writeAppearancePreference('system');
    expect(localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBeNull();
  });

  it('resolves system from the device and explicit choices as-is', () => {
    expect(resolveAppearance('system', true)).toBe('dark');
    expect(resolveAppearance('system', false)).toBe('light');
    expect(resolveAppearance('light', true)).toBe('light');
    expect(resolveAppearance('dark', false)).toBe('dark');
  });
});

describe('AppearanceProvider', () => {
  it('defaults to the device preference and follows its changes in system mode', () => {
    const system = mockSystem(true);
    render(app());
    expect(probe()).toBe(`system/dark/dark/${palettes.dark.bg}`);
    expect(document.documentElement.dataset.appearance).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    system.set(false);
    expect(probe()).toBe(`system/light/light/${palettes.light.bg}`);
    expect(document.documentElement.dataset.appearance).toBe('light');
  });

  it('an explicit choice is saved, restored after reload and ignores device changes', async () => {
    const system = mockSystem(false);
    const { unmount } = render(app());
    await choose('כהה');
    expect(probe()).toBe(`dark/dark/dark/${palettes.dark.bg}`);
    expect(localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBe('dark');
    system.set(true);
    system.set(false);
    expect(probe()).toBe(`dark/dark/dark/${palettes.dark.bg}`);
    unmount();
    expect(system.listenerCount()).toBe(0);

    render(app()); // reload
    expect(probe()).toBe(`dark/dark/dark/${palettes.dark.bg}`);
    await choose('לפי המכשיר');
    expect(probe()).toBe(`system/light/light/${palettes.light.bg}`);
    expect(localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBeNull();
  });

  it('malformed stored value falls back to the device setting', () => {
    mockSystem(true);
    localStorage.setItem(APPEARANCE_STORAGE_KEY, 'neon');
    render(app());
    expect(probe()).toBe(`system/dark/dark/${palettes.dark.bg}`);
  });

  it('blocked storage: the choice still applies now and says it was not saved', async () => {
    mockSystem(false);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('SecurityError'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('SecurityError'); });
    render(app());
    expect(probe()).toBe(`system/light/light/${palettes.light.bg}`);
    await choose('כהה');
    expect(probe()).toBe(`dark/dark/dark/${palettes.dark.bg}`);
    await userEvent.click(screen.getByRole('button', { name: 'נגישות' }));
    expect(await screen.findByText('הבחירה פעילה עכשיו, אך לא נשמרה במכשיר הזה.')).toBeInTheDocument();
  });

  it('V1 follow-up: every theme-color tag follows the resolved appearance (explicit light on a dark OS)', async () => {
    mockSystem(true);
    const metas = ['(prefers-color-scheme: light)', '(prefers-color-scheme: dark)'].map(media => {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.media = media;
      document.head.appendChild(meta);
      return meta;
    });
    try {
      render(app());
      expect(metas.map(m => m.content)).toEqual([palettes.dark.bg, palettes.dark.bg]);
      await choose('בהיר');
      expect(metas.map(m => m.content)).toEqual([palettes.light.bg, palettes.light.bg]);
    } finally {
      metas.forEach(m => m.remove());
    }
  });

  it('works without matchMedia (older browsers): system resolves to light', () => {
    vi.stubGlobal('matchMedia', undefined);
    render(app());
    expect(probe()).toBe(`system/light/light/${palettes.light.bg}`);
  });

  it('switching appearance keeps drafts and mounted state (no remount)', async () => {
    mockSystem(false);
    const mounts = vi.fn();
    const Draft: React.FC = () => {
      const [value, setValue] = useState('');
      React.useEffect(() => mounts(), []);
      return <input aria-label="טיוטה" value={value} onChange={e => setValue(e.target.value)} />;
    };
    render(app(<Draft />));
    const input = screen.getByRole('textbox', { name: 'טיוטה' });
    await userEvent.type(input, '0.5 ק״ג');
    await choose('כהה');
    await choose('בהיר');
    expect(screen.getByRole('textbox', { name: 'טיוטה' })).toBe(input);
    expect(input).toHaveValue('0.5 ק״ג');
    expect(mounts).toHaveBeenCalledTimes(1);
  });
});

describe('AccessibilityMenu', () => {
  it('exposes the three choices as radio menu items with the selected state', async () => {
    mockSystem(false);
    render(app());
    const button = screen.getByRole('button', { name: 'נגישות' });
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const items = screen.getAllByRole('menuitemradio');
    expect(items.map(i => i.textContent)).toEqual(['בהיר', 'כהה', 'לפי המכשירבהיר או כהה לפי הגדרות המכשיר']);
    expect(items.map(i => i.getAttribute('aria-checked'))).toEqual(['false', 'false', 'true']);
  });

  it('is fully keyboard operable and returns focus to the button', async () => {
    mockSystem(false);
    render(app());
    const button = screen.getByRole('button', { name: 'נגישות' });
    button.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByRole('menu')).toBeInTheDocument());
    // focus starts on the selected item (לפי המכשיר); move up to כהה
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('menuitemradio', { name: /לפי המכשיר/ })));
    await userEvent.keyboard('{ArrowUp}{Enter}');
    expect(probe()).toBe(`dark/dark/dark/${palettes.dark.bg}`);
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    await waitFor(() => expect(button).toHaveFocus());
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByRole('menuitemradio', { name: 'כהה' })).toHaveAttribute('aria-checked', 'true'));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('renders nothing outside the provider instead of crashing isolated screens', () => {
    const { container } = render(<AccessibilityMenu />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('pre-paint script in index.html', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../../../index.html'), 'utf8');
  it('uses the same storage key and background colours as the theme', () => {
    expect(html).toContain(`localStorage.getItem('${APPEARANCE_STORAGE_KEY}')`);
    expect(html).toContain(`'${palettes.dark.bg}'`);
    expect(html).toContain(`'${palettes.light.bg}'`);
  });

  it('applies dark before React for a saved dark choice and tolerates blocked storage', () => {
    const script = html.match(/<script>([\s\S]*?)<\/script>/)![1];
    const run = (stored: string | null, systemDark: boolean, throws = false) => {
      const root = document.documentElement;
      root.removeAttribute('data-appearance');
      root.style.backgroundColor = '';
      vi.stubGlobal('matchMedia', () => ({ matches: systemDark }));
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { if (throws) throw new Error('blocked'); return stored; });
      new Function(script)();
      vi.restoreAllMocks();
      return root.dataset.appearance;
    };
    expect(run('dark', false)).toBe('dark');
    expect(run('light', true)).toBe('light');
    expect(run(null, true)).toBe('dark');
    expect(run('garbage', false)).toBe('light');
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#111418';
    document.head.appendChild(meta);
    expect(run('light', true)).toBe('light');
    expect(meta.content).toBe('#FFFFFF'); // pre-paint also syncs the browser chrome colour
    meta.remove();
    expect(run(null, true, true)).toBe('dark');
  });
});
