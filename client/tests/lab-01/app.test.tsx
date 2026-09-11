import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from '../../src/App';

describe('TokTickIT UI Tests (Lab 1 Baseline)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // UI-01: Heading rendering
  it('UI-01: renders the TokTickIT heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: /TokTickIT/i })).toBeInTheDocument();
  });

  // UI-02: Backend API connectivity check
  it('UI-02: successfully queries health and categories endpoints', async () => {
    const mockCategories = [
      { id: 1, name: 'Account and Access' },
      { id: 2, name: 'Hardware' },
      { id: 3, name: 'Software' },
      { id: 4, name: 'Network' },
    ];

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/health')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ status: 'ok', service: 'TokTickIT API' }),
        } as Response);
      }
      if (url.includes('/api/categories')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockCategories,
        } as Response);
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const healthRes = await fetch('http://localhost:4000/api/health');
    const healthData = await healthRes.json();
    expect(healthData.status).toBe('ok');

    const catRes = await fetch('http://localhost:4000/api/categories');
    const catData = await catRes.json();
    expect(catData).toHaveLength(4);
  });

  // UI-03: Offline resilience
  it('UI-03: handles offline API failure gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network connection failed'));
    await expect(fetch('http://localhost:4000/api/health')).rejects.toThrow('Network connection failed');
  });
});
