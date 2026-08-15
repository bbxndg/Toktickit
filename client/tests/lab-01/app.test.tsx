import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../../src/App';

describe('TokTickIT Foundation UI', () => {
  it('renders the TokTickIT heading correctly', () => {
    render(<App />);
    const heading = screen.getByRole('heading', { level: 1, name: /TokTickIT/i });
    expect(heading).toBeInTheDocument();
  });
});
