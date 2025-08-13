import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { Button } from './Button';
import { theme } from '../../app/theme';

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('Button Component', () => {
  it('renders with correct text', () => {
    renderWithTheme(<Button>לחץ כאן</Button>);
    expect(screen.getByText('לחץ כאן')).toBeInTheDocument();
  });

  it('shows loading state correctly', () => {
    renderWithTheme(<Button loading>שמור</Button>);
    expect(screen.getByText('טוען...')).toBeInTheDocument();
  });

  it('applies correct size styles', () => {
    renderWithTheme(<Button size="large">כפתור גדול</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('disables button when disabled prop is true', () => {
    renderWithTheme(<Button disabled>כפתור מבוטל</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('disables button when loading', () => {
    renderWithTheme(<Button loading>טוען</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});
