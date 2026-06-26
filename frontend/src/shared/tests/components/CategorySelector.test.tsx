import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CategorySelector } from '../../components/CategorySelector';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('CategorySelector component', () => {
  const defaultProps = {
    categories: ['Animals', 'Food', 'Countries', 'Movies'],
    selectedCategory: 'Animals',
    accessKey: 'admin-123',
    onUnauthorized: vi.fn(),
  };

  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('single category mode', () => {
    it('renders category dropdown', () => {
      render(<CategorySelector {...defaultProps} />);

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('shows all categories in dropdown', () => {
      render(<CategorySelector {...defaultProps} />);

      const options = screen.getAllByRole('option');
      expect(options.length).toBe(4);
      expect(options[0]).toHaveTextContent('Animals');
      expect(options[1]).toHaveTextContent('Food');
    });

    it('shows selected category', () => {
      render(<CategorySelector {...defaultProps} selectedCategory="Food" />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('Food');
    });

    it('renders random button', () => {
      render(<CategorySelector {...defaultProps} />);

      expect(screen.getByRole('button', { name: /random/i })).toBeInTheDocument();
    });

    it('disables dropdown when no access key', () => {
      render(<CategorySelector {...defaultProps} accessKey="" />);

      expect(screen.getByRole('combobox')).toBeDisabled();
    });

    it('calls API when category is changed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true, category: 'Food' }),
      });

      render(<CategorySelector {...defaultProps} />);

      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Food' } });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/category', expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ category: 'Food', key: 'admin-123' }),
        }));
      });
    });

    it('calls API when random is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true, category: 'Movies' }),
      });

      render(<CategorySelector {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /random/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/category', expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ random: true, key: 'admin-123' }),
        }));
      });
    });

    it('calls onUnauthorized when API returns 401', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'unauthorized' }),
      });

      const onUnauthorized = vi.fn();
      render(<CategorySelector {...defaultProps} onUnauthorized={onUnauthorized} />);

      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Food' } });

      await waitFor(() => {
        expect(onUnauthorized).toHaveBeenCalled();
      });
    });

    it('shows error when round is active', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ reason: 'round_active' }),
      });

      render(<CategorySelector {...defaultProps} />);

      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Food' } });

      await waitFor(() => {
        expect(screen.getByText(/wait until the round is over/i)).toBeInTheDocument();
      });
    });
  });

  describe('multi category mode', () => {
    const multiProps = {
      ...defaultProps,
      categoryMode: 'multi' as const,
      selectedCategories: ['Animals', 'Food'],
    };

    it('renders checkboxes for each category', () => {
      render(<CategorySelector {...multiProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBe(4);
    });

    it('shows selected categories as checked', () => {
      render(<CategorySelector {...multiProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).toBeChecked(); // Animals
      expect(checkboxes[1]).toBeChecked(); // Food
      expect(checkboxes[2]).not.toBeChecked(); // Countries
      expect(checkboxes[3]).not.toBeChecked(); // Movies
    });

    it('shows count of selected categories', () => {
      render(<CategorySelector {...multiProps} />);

      expect(screen.getByText(/2 selected/i)).toBeInTheDocument();
    });

    it('calls API when checkbox is toggled', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true, categories: ['Animals', 'Food', 'Countries'] }),
      });

      render(<CategorySelector {...multiProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[2]); // Toggle Countries

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/category', expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ categories: ['Animals', 'Food', 'Countries'], key: 'admin-123' }),
        }));
      });
    });

    it('shows error when trying to deselect last category', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ reason: 'empty' }),
      });

      render(<CategorySelector {...multiProps} selectedCategories={['Animals']} />);

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]); // Try to uncheck Animals (last one)

      await waitFor(() => {
        expect(screen.getByText(/select at least one/i)).toBeInTheDocument();
      });
    });

    it('shows custom category input in multi mode', () => {
      render(<CategorySelector {...multiProps} />);

      expect(screen.getByPlaceholderText(/new category/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
    });

    it('calls add category API in multi mode', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true, category: 'Custom' }),
      });

      render(<CategorySelector {...multiProps} />);

      fireEvent.change(screen.getByPlaceholderText(/new category/i), { target: { value: 'Custom' } });
      fireEvent.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/category', expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ addCustom: 'Custom', key: 'admin-123' }),
        }));
      });
    });

    it('calls random API with count in multi mode', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true, categories: ['Movies', 'Countries'] }),
      });

      render(<CategorySelector {...multiProps} />);

      fireEvent.click(screen.getByRole('button', { name: /random/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/category', expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ random: true, count: 2, key: 'admin-123' }), // 2 selected categories
        }));
      });
    });
  });
});
