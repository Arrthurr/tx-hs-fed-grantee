/// <reference types="@testing-library/jest-dom" />
import { render, screen, fireEvent } from '@testing-library/react';
import SearchBar from './SearchBar';

describe('SearchBar Component', () => {
  const defaultProps = {
    searchTerm: '',
    onSearchChange: jest.fn(),
    onClear: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders a search input with the correct placeholder', () => {
    render(<SearchBar {...defaultProps} />);
    const input = screen.getByPlaceholderText(/Search/i);
    expect(input).toBeInTheDocument();
  });

  test('renders with the search term value', () => {
    render(<SearchBar {...defaultProps} searchTerm="austin" />);
    const input = screen.getByPlaceholderText(/Search/i) as HTMLInputElement;
    expect(input.value).toBe('austin');
  });

  test('calls onSearchChange when the user types', () => {
    render(<SearchBar {...defaultProps} />);
    const input = screen.getByPlaceholderText(/Search/i);
    fireEvent.change(input, { target: { value: 'houston' } });
    expect(defaultProps.onSearchChange).toHaveBeenCalledWith('houston');
  });

  test('shows a clear button only when searchTerm is non-empty', () => {
    const { rerender } = render(<SearchBar {...defaultProps} searchTerm="" />);
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();

    rerender(<SearchBar {...defaultProps} searchTerm="austin" />);
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  test('calls onClear when the clear button is clicked', () => {
    render(<SearchBar {...defaultProps} searchTerm="austin" />);
    fireEvent.click(screen.getByLabelText('Clear search'));
    expect(defaultProps.onClear).toHaveBeenCalledTimes(1);
  });

  test('does not show result count when search is not active', () => {
    render(<SearchBar {...defaultProps} searchTerm="a" isSearchActive={false} resultCount={5} />);
    expect(screen.queryByText(/Found/i)).not.toBeInTheDocument();
  });

  test('shows result count when search is active', () => {
    render(<SearchBar {...defaultProps} searchTerm="austin" isSearchActive resultCount={3} />);
    expect(screen.getByText('Found 3 results')).toBeInTheDocument();
  });

  test('uses singular "result" when count is 1', () => {
    render(<SearchBar {...defaultProps} searchTerm="austin" isSearchActive resultCount={1} />);
    expect(screen.getByText('Found 1 result')).toBeInTheDocument();
  });

  test('has role="search" on the container', () => {
    render(<SearchBar {...defaultProps} />);
    expect(screen.getByRole('search')).toBeInTheDocument();
  });

  test('input has an accessible aria-label', () => {
    render(<SearchBar {...defaultProps} />);
    expect(screen.getByRole('textbox', { name: 'Search Head Start programs' })).toBeInTheDocument();
  });

  test('clear button has an accessible aria-label', () => {
    render(<SearchBar {...defaultProps} searchTerm="test" />);
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  test('applies custom className to the container', () => {
    render(<SearchBar {...defaultProps} className="custom-class" />);
    expect(screen.getByRole('search')).toHaveClass('custom-class');
  });

  test('result count has aria-live="polite" for screen reader announcements', () => {
    render(<SearchBar {...defaultProps} searchTerm="austin" isSearchActive resultCount={5} />);
    const count = screen.getByText('Found 5 results');
    expect(count).toHaveAttribute('aria-live', 'polite');
  });
});
