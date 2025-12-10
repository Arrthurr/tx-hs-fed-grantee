/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render } from '@testing-library/react';
import LoadingSpinner from './LoadingSpinner';

describe('LoadingSpinner Component', () => {
  test('renders without crashing', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container).toBeInTheDocument();
  });

  test('renders with custom message', () => {
    const { container } = render(<LoadingSpinner message="Test message" />);
    expect(container.textContent).toContain('Test message');
  });

  test('supports small size prop', () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    expect(container).toBeInTheDocument();
  });

  test('supports medium size prop', () => {
    const { container } = render(<LoadingSpinner size="md" />);
    expect(container).toBeInTheDocument();
  });

  test('supports large size prop', () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    expect(container).toBeInTheDocument();
  });

  test('has loading related content', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.textContent?.toLowerCase()).toContain('loading');
  });

  test('has Texas related content in default message', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.textContent?.toLowerCase()).toContain('texas');
  });

  test('has Head Start related content', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.textContent).toContain('Head Start');
  });

  test('has congressional districts related content', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.textContent).toContain('congressional districts');
  });
});
