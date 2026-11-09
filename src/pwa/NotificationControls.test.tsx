import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.hoisted(() => ({
  enablePushNotifications: vi.fn(),
  disablePushNotifications: vi.fn(),
  getPushNotificationState: vi.fn(),
}));
vi.mock('../utils/notificationUtils', () => push);
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ role: 'staff' }) }));
const env = vi.hoisted(() => ({ configured: true, ios: false }));
vi.mock('./pushEnv', () => ({
  pushConfigured: () => env.configured,
  needsHomeScreenInstall: () => env.ios,
}));

import { NotificationControls } from './NotificationControls';

const enableButton = () => screen.getByRole('button', { name: 'הפעל התראות במכשיר הזה' });

describe('NotificationControls', () => {
  beforeEach(() => {
    Object.values(push).forEach(fn => fn.mockReset());
    env.configured = true;
    env.ios = false;
  });

  it('reads state on mount without enabling or prompting', async () => {
    push.getPushNotificationState.mockResolvedValue('disabled');
    const requestPermission = vi.fn();
    vi.stubGlobal('Notification', { permission: 'default', requestPermission });
    render(<NotificationControls />);
    expect(await screen.findByRole('button', { name: 'הפעל התראות במכשיר הזה' })).toBeInTheDocument();
    expect(push.enablePushNotifications).not.toHaveBeenCalled();
    expect(requestPermission).not.toHaveBeenCalled();
    expect(screen.getByText(/תזכורות בערב/)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('enables only from the button and shows enabled after the server-confirmed result', async () => {
    push.getPushNotificationState.mockResolvedValue('disabled');
    let resolve!: (v: string) => void;
    push.enablePushNotifications.mockReturnValue(new Promise(r => (resolve = r)));
    render(<NotificationControls />);
    await userEvent.click(await screen.findByRole('button', { name: 'הפעל התראות במכשיר הזה' }));
    expect(screen.getByRole('button', { name: 'מפעיל...' })).toBeDisabled();
    expect(screen.queryByText('ההתראות מופעלות במכשיר הזה.')).not.toBeInTheDocument();
    resolve('enabled');
    expect(await screen.findByText('ההתראות מופעלות במכשיר הזה.')).toBeInTheDocument();
  });

  it('a disconnect during registration is an error, never "enabled"', async () => {
    push.getPushNotificationState.mockResolvedValueOnce('disabled').mockResolvedValueOnce('disabled');
    push.enablePushNotifications.mockRejectedValue(Object.assign(new Error('network'), { code: 'unavailable' }));
    render(<NotificationControls />);
    await userEvent.click(await screen.findByRole('button', { name: 'הפעל התראות במכשיר הזה' }));
    expect(await screen.findByText('אין חיבור לשרת. בדוק את החיבור ונסה שוב.')).toBeInTheDocument();
    expect(screen.queryByText('ההתראות מופעלות במכשיר הזה.')).not.toBeInTheDocument();
    expect(enableButton()).toBeEnabled();
    expect(push.getPushNotificationState).toHaveBeenCalledTimes(2);
  });

  it('account change during registration is reported, not enabled', async () => {
    push.getPushNotificationState.mockResolvedValue('disabled');
    push.enablePushNotifications.mockRejectedValue(Object.assign(new Error('x'), { code: 'unauthenticated' }));
    render(<NotificationControls />);
    await userEvent.click(await screen.findByRole('button', { name: 'הפעל התראות במכשיר הזה' }));
    expect(await screen.findByText('פג תוקף ההתחברות. התחבר שוב.')).toBeInTheDocument();
    expect(screen.queryByText('ההתראות מופעלות במכשיר הזה.')).not.toBeInTheDocument();
  });

  it('denied permission explains browser settings and offers a re-check, not an enable button', async () => {
    push.getPushNotificationState.mockResolvedValue('disabled');
    push.enablePushNotifications.mockResolvedValue('denied');
    render(<NotificationControls />);
    await userEvent.click(await screen.findByRole('button', { name: 'הפעל התראות במכשיר הזה' }));
    expect(await screen.findByText(/חסומות בהגדרות הדפדפן/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'הפעל התראות במכשיר הזה' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'בדוק שוב' })).toBeInTheDocument();
  });

  it('unsupported offers no fake enable; iPhone gets Home Screen guidance', async () => {
    push.getPushNotificationState.mockResolvedValue('unsupported');
    env.ios = true;
    render(<NotificationControls />);
    expect(await screen.findByText(/הוסף למסך הבית/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /הפעל/ })).not.toBeInTheDocument();
  });

  it('not configured: no state read and no button', () => {
    env.configured = false;
    render(<NotificationControls />);
    expect(screen.getByText(/התראות עדיין אינן זמינות/)).toBeInTheDocument();
    expect(push.getPushNotificationState).not.toHaveBeenCalled();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('a failed disable stays pending and can be retried', async () => {
    push.getPushNotificationState.mockResolvedValueOnce('enabled').mockResolvedValueOnce('disabled');
    push.disablePushNotifications
      .mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'unavailable' }))
      .mockResolvedValueOnce(undefined);
    render(<NotificationControls />);
    await userEvent.click(await screen.findByRole('button', { name: 'כבה התראות במכשיר הזה' }));
    expect(await screen.findByText(/עדיין לא הושלם בשרת/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'נסה לכבות שוב' }));
    await waitFor(() => expect(push.disablePushNotifications).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('button', { name: 'הפעל התראות במכשיר הזה' })).toBeInTheDocument();
  });

  it('maps the C5 setup codes: outdated worker asks for an update; offline disable is saved', async () => {
    push.getPushNotificationState.mockResolvedValueOnce('disabled').mockResolvedValueOnce('disabled');
    push.enablePushNotifications.mockRejectedValue(Object.assign(new Error('x'), { code: 'worker-outdated' }));
    const { unmount } = render(<NotificationControls />);
    await userEvent.click(await screen.findByRole('button', { name: 'הפעל התראות במכשיר הזה' }));
    expect(await screen.findByText('יש לעדכן את TossIt לגרסה האחרונה לפני הפעלת התראות.')).toBeInTheDocument();
    unmount();

    push.getPushNotificationState.mockResolvedValueOnce('enabled');
    push.disablePushNotifications.mockRejectedValue(Object.assign(new Error('x'), { code: 'offline' }));
    render(<NotificationControls />);
    await userEvent.click(await screen.findByRole('button', { name: 'כבה התראות במכשיר הזה' }));
    expect(await screen.findByText('אין חיבור. הכיבוי נשמר במכשיר ויושלם כשהחיבור יחזור.')).toBeInTheDocument();
  });

  it('an invalid key detected at enable switches to the not-configured state', async () => {
    push.getPushNotificationState.mockResolvedValue('disabled');
    push.enablePushNotifications.mockRejectedValue(Object.assign(new Error('x'), { code: 'not-configured' }));
    render(<NotificationControls />);
    await userEvent.click(await screen.findByRole('button', { name: 'הפעל התראות במכשיר הזה' }));
    expect(await screen.findByText(/התראות עדיין אינן זמינות/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'הפעל התראות במכשיר הזה' })).not.toBeInTheDocument();
  });

  it('a failed state read is retryable', async () => {
    push.getPushNotificationState
      .mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'functions/internal' }))
      .mockResolvedValueOnce('disabled');
    render(<NotificationControls />);
    expect(await screen.findByText('אירעה שגיאה בשרת. נסה שוב מאוחר יותר.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'נסה שוב' }));
    expect(await screen.findByRole('button', { name: 'הפעל התראות במכשיר הזה' })).toBeInTheDocument();
  });
});

describe('push environment helpers', async () => {
  const real = await vi.importActual<typeof import('./pushEnv')>('./pushEnv');
  it('detects iPhone browsers that are not installed', () => {
    expect(real.needsHomeScreenInstall('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', false)).toBe(true);
    expect(real.needsHomeScreenInstall('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', true)).toBe(false);
    expect(real.needsHomeScreenInstall('Mozilla/5.0 (Linux; Android 14)', false)).toBe(false);
  });
});
