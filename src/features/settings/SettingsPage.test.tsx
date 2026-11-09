import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BusinessSettings } from '../../domain/contracts';

const api = vi.hoisted(() => ({ getBusinessSettings: vi.fn(), saveBusinessSettings: vi.fn() }));
vi.mock('../../api/settingsAPI', () => api);
const auth = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth.current }));

import { SettingsPage } from './SettingsPage';

const defaults: BusinessSettings = {
  timezone: 'Asia/Jerusalem',
  eveningRemindersEnabled: true,
  morningSummaryEnabled: true,
  autoEndShiftsAtMidnight: false,
};

const evening = () => screen.getByRole('checkbox', { name: 'תזכורות ערב לעובדים' });
const midnight = () => screen.getByRole('checkbox', { name: 'סיום משמרות אוטומטי בחצות' });
const saveButton = () => screen.getByRole('button', { name: 'שמירת הגדרות' });

describe('SettingsPage', () => {
  beforeEach(() => {
    Object.values(api).forEach(fn => fn.mockReset());
    auth.current = {
      userProfile: { uid: 'a', fullName: 'אדמין', email: 'a@x.co', role: 'admin', department: 'bar', businessId: 'b1' },
      isOffline: false,
    };
  });

  it('shows the persisted values (defaults when no document exists) and no placeholder fields', async () => {
    api.getBusinessSettings.mockResolvedValue(defaults);
    render(<SettingsPage />);
    await waitFor(() => expect(evening()).toBeChecked());
    expect(midnight()).not.toBeChecked();
    expect(saveButton()).toBeDisabled();
    expect(screen.queryByText('שם החברה')).not.toBeInTheDocument();
    expect(screen.queryByText('סנכרון אוטומטי')).not.toBeInTheDocument();
  });

  it('saves the full settings document and reports success only after acknowledgement', async () => {
    api.getBusinessSettings.mockResolvedValue(defaults);
    let resolve!: () => void;
    api.saveBusinessSettings.mockReturnValue(new Promise<void>(r => (resolve = r)));
    render(<SettingsPage />);
    await waitFor(() => expect(evening()).toBeChecked());
    await userEvent.click(midnight());
    await userEvent.click(saveButton());
    expect(api.saveBusinessSettings).toHaveBeenCalledWith({ ...defaults, autoEndShiftsAtMidnight: true });
    expect(screen.queryByText('ההגדרות נשמרו')).not.toBeInTheDocument();
    resolve();
    expect(await screen.findByText('ההגדרות נשמרו')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('keeps the unsaved change and shows a permission error on denial', async () => {
    api.getBusinessSettings.mockResolvedValue(defaults);
    api.saveBusinessSettings.mockRejectedValue(Object.assign(new Error('x'), { code: 'permission-denied' }));
    render(<SettingsPage />);
    await waitFor(() => expect(evening()).toBeChecked());
    await userEvent.click(evening());
    await userEvent.click(saveButton());
    expect(await screen.findByText('אין לך הרשאה לבצע פעולה זו.')).toBeInTheDocument();
    expect(screen.queryByText('ההגדרות נשמרו')).not.toBeInTheDocument();
    expect(evening()).not.toBeChecked();
    expect(saveButton()).toBeEnabled();
  });

  it('cancel restores the saved values', async () => {
    api.getBusinessSettings.mockResolvedValue(defaults);
    render(<SettingsPage />);
    await waitFor(() => expect(evening()).toBeChecked());
    await userEvent.click(evening());
    await userEvent.click(screen.getByRole('button', { name: 'ביטול שינויים' }));
    expect(evening()).toBeChecked();
    expect(saveButton()).toBeDisabled();
  });

  it('shows a retryable load error instead of default values', async () => {
    api.getBusinessSettings
      .mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'unavailable' }))
      .mockResolvedValueOnce(defaults);
    render(<SettingsPage />);
    expect(await screen.findByText('אין חיבור לשרת. בדוק את החיבור ונסה שוב.')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'נסה שוב' }));
    await waitFor(() => expect(evening()).toBeChecked());
  });

  it('disables saving while offline', async () => {
    auth.current = { ...auth.current, isOffline: true };
    api.getBusinessSettings.mockResolvedValue(defaults);
    render(<SettingsPage />);
    await waitFor(() => expect(evening()).toBeChecked());
    await userEvent.click(evening());
    expect(saveButton()).toBeDisabled();
  });
});
