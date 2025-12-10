/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchBar from './SearchBar';

describe('SearchBar Component', () => {
  const mockProps = {
    searchTerm: '',
    onSearchChange: jest.fn(),
    onClearSearch: jest.fn(),
    isSearching: false,
    totalResults: 0,
    programResults: 0,
    districtResults: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders search input with placeholder', () => {
    render(<SearchBar {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Search programs or districts...');
    expect(input).toBeInTheDocument();
  });

  test('renders custom placeholder text', () => {
    render(
      <SearchBar 
        {...mockProps} 
        placeholder="Custom search..."
      />
    );
    
    expect(screen.getByPlaceholderText('Custom search...')).toBeInTheDocument();
  });

  test('calls onSearchChange when input value changes', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<SearchBar {...mockProps} onSearchChange={onChange} />);
    
    const input = screen.getByPlaceholderText('Search programs or districts...');
    await user.type(input, 'a');
    
    expect(onChange).toHaveBeenCalledWith('a');
  });

  test('displays search input value', () => {
    render(<SearchBar {...mockProps} searchTerm="Austin" />);
    
    const input = screen.getByDisplayValue('Austin');
    expect(input).toBeInTheDocument();
  });

  test('clears search when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<SearchBar {...mockProps} searchTerm="test" />);
    
    const clearButton = screen.getByLabelText('Clear search');
    await user.click(clearButton);
    
    expect(mockProps.onClearSearch).toHaveBeenCalled();
  });

  test('clear button is hidden when search term is empty', () => {
    render(<SearchBar {...mockProps} searchTerm="" />);
    
    const clearButton = screen.queryByLabelText('Clear search');
    expect(clearButton).not.toBeInTheDocument();
  });

  test('clears search when Escape key is pressed', () => {
    const onClear = jest.fn();
    const { rerender } = render(
      <SearchBar 
        {...mockProps} 
        searchTerm="test" 
        onClearSearch={onClear} 
      />
    );
    
    const input = screen.getByDisplayValue('test') as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'Escape' });
    
    expect(onClear).toHaveBeenCalled();
  });

  test('displays results count when searching', () => {
    render(
      <SearchBar 
        {...mockProps} 
        isSearching={true}
        totalResults={5}
        programResults={3}
        districtResults={2}
        searchTerm="test"
      />
    );
    
    expect(screen.getByText(/Found 5 results/)).toBeInTheDocument();
    expect(screen.getByText(/3 Head Start Programs/)).toBeInTheDocument();
    expect(screen.getByText(/2 Congressional Districts/)).toBeInTheDocument();
  });

  test('displays no results message when search returns zero results', () => {
    render(
      <SearchBar 
        {...mockProps} 
        isSearching={true}
        totalResults={0}
        searchTerm="nonexistent"
      />
    );
    
    expect(screen.getByText(/No results found for "nonexistent"/)).toBeInTheDocument();
  });

  test('does not show clear button when searchTerm is empty', () => {
    render(<SearchBar {...mockProps} searchTerm="" />);
    
    const clearButton = screen.queryByLabelText('Clear search');
    expect(clearButton).not.toBeInTheDocument();
  });

  test('focuses input on mount when autoFocus is true', () => {
    render(<SearchBar {...mockProps} autoFocus={true} />);
    
    const input = screen.getByPlaceholderText('Search programs or districts...');
    expect(input).toHaveFocus();
  });

  test('does not focus input on mount when autoFocus is false', () => {
    render(<SearchBar {...mockProps} autoFocus={false} />);
    
    const input = screen.getByPlaceholderText('Search programs or districts...');
    expect(input).not.toHaveFocus();
  });

  test('handles search input with special characters', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<SearchBar {...mockProps} onSearchChange={onChange} />);
    
    const input = screen.getByPlaceholderText('Search programs or districts...');
    await user.type(input, '#');
    
    expect(onChange).toHaveBeenCalledWith('#');
  });

  test('applies search styling when searching is active', () => {
    const { container } = render(
      <SearchBar 
        {...mockProps} 
        isSearching={true}
        searchTerm="test"
      />
    );
    
    const searchContainer = container.querySelector('[role="search"]');
    expect(searchContainer).toBeInTheDocument();
  });

  test('handles rapid text input changes', async () => {
    const user = userEvent.setup({ delay: null });
    render(<SearchBar {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Search programs or districts...');
    await user.type(input, 'abc');
    
    expect(mockProps.onSearchChange).toHaveBeenCalledTimes(3);
  });

  test('displays singular/plural results correctly', () => {
    render(
      <SearchBar 
        {...mockProps} 
        isSearching={true}
        totalResults={1}
        programResults={1}
        districtResults={0}
        searchTerm="test"
      />
    );
    
    expect(screen.getByText(/Found 1 result for/)).toBeInTheDocument();
    expect(screen.getByText(/1 Head Start Program/)).toBeInTheDocument();
  });

  test('applies custom className', () => {
    const { container } = render(
      <SearchBar {...mockProps} className="custom-class" />
    );
    
    const searchContainer = container.querySelector('[role="search"]');
    expect(searchContainer).toHaveClass('custom-class');
  });
});
