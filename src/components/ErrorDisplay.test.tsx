/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorDisplay from './ErrorDisplay';

describe('ErrorDisplay Component', () => {
  const mockProps = {
    error: 'Test error message',
    onRetry: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders error message', () => {
    render(<ErrorDisplay {...mockProps} />);
    
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  test('renders with alert role for accessibility', () => {
    const { container } = render(<ErrorDisplay {...mockProps} />);
    
    const alert = container.querySelector('[role="alert"]');
    expect(alert).toBeInTheDocument();
  });

  test('renders aria-live assertive for accessibility', () => {
    const { container } = render(<ErrorDisplay {...mockProps} />);
    
    const alert = container.querySelector('[aria-live="assertive"]');
    expect(alert).toBeInTheDocument();
  });

  test('displays generic error title by default', () => {
    render(<ErrorDisplay {...mockProps} errorType="general" />);
    
    expect(screen.getByText('Map Loading Error')).toBeInTheDocument();
  });

  test('displays API error title for API errors', () => {
    render(
      <ErrorDisplay 
        {...mockProps} 
        errorType="api"
        error="API key is invalid"
      />
    );
    
    expect(screen.getByText('Configuration Required')).toBeInTheDocument();
  });

  test('displays data error title for data errors', () => {
    render(
      <ErrorDisplay 
        {...mockProps} 
        errorType="data"
        error="Failed to load data"
      />
    );
    
    expect(screen.getByText('Data Loading Error')).toBeInTheDocument();
  });

  test('renders retry button when onRetry is provided', () => {
    render(<ErrorDisplay {...mockProps} />);
    
    const retryButton = screen.getByLabelText('Retry loading map');
    expect(retryButton).toBeInTheDocument();
  });

  test('calls onRetry when retry button is clicked', () => {
    render(<ErrorDisplay {...mockProps} onRetry={mockProps.onRetry} />);
    
    const retryButton = screen.getByLabelText('Retry loading map');
    fireEvent.click(retryButton);
    
    expect(mockProps.onRetry).toHaveBeenCalled();
  });

  test('does not render retry button when onRetry is not provided', () => {
    render(<ErrorDisplay error="Test error" />);
    
    const retryButton = screen.queryByLabelText('Retry loading map');
    expect(retryButton).not.toBeInTheDocument();
  });

  test('renders Google Cloud Console link for API key errors', () => {
    render(
      <ErrorDisplay 
        {...mockProps}
        errorType="api"
        error="API key is invalid"
      />
    );
    
    const link = screen.getByLabelText('Open Google Cloud Console in a new tab');
    expect(link).toHaveAttribute('href', 'https://console.cloud.google.com/google/maps-apis/');
    expect(link).toHaveAttribute('target', '_blank');
  });

  test('renders GeoJSON documentation link for data errors', () => {
    render(
      <ErrorDisplay 
        {...mockProps}
        errorType="data"
        error="Failed to load GeoJSON"
      />
    );
    
    const link = screen.getByLabelText('View GeoJSON Documentation in a new tab');
    expect(link).toHaveAttribute('href', 'https://developers.google.com/maps/documentation/javascript/datalayer');
    expect(link).toHaveAttribute('target', '_blank');
  });

  test('displays error details when provided', () => {
    render(
      <ErrorDisplay 
        {...mockProps}
        details="Error details: Connection timeout"
      />
    );
    
    expect(screen.getByText('Error details: Connection timeout')).toBeInTheDocument();
  });

  test('detects API key errors by content', () => {
    render(
      <ErrorDisplay 
        error="API key is not configured"
      />
    );
    
    expect(screen.getByText('Configuration Required')).toBeInTheDocument();
  });

  test('detects data errors by content', () => {
    render(
      <ErrorDisplay 
        error="Failed to load GeoJSON data"
      />
    );
    
    expect(screen.getByText('Data Loading Error')).toBeInTheDocument();
  });

  test('displays API setup instructions for API errors', () => {
    render(
      <ErrorDisplay 
        {...mockProps}
        errorType="api"
        error="Google Maps API not configured"
      />
    );
    
    expect(screen.getByText('Setup Instructions')).toBeInTheDocument();
    expect(screen.getByText('Google Maps API:')).toBeInTheDocument();
  });

  test('displays data troubleshooting tips for data errors', () => {
    render(
      <ErrorDisplay 
        {...mockProps}
        errorType="data"
        error="Failed to load data files"
      />
    );
    
    expect(screen.getByText('Data Troubleshooting')).toBeInTheDocument();
    expect(screen.getByText(/Check that GeoJSON files exist/)).toBeInTheDocument();
  });

  test('displays general troubleshooting tips by default', () => {
    render(
      <ErrorDisplay 
        {...mockProps}
        errorType="general"
      />
    );
    
    expect(screen.getByText('Troubleshooting Tips')).toBeInTheDocument();
    expect(screen.getByText(/Check your internet connection/)).toBeInTheDocument();
  });

  test('includes Congress.gov API setup in API error instructions', () => {
    render(
      <ErrorDisplay 
        {...mockProps}
        errorType="api"
      />
    );
    
    expect(screen.getByText('Congress.gov API (Optional):')).toBeInTheDocument();
  });

  test('renders with proper card styling', () => {
    const { container } = render(<ErrorDisplay {...mockProps} />);
    
    const card = container.querySelector('.card-elevated');
    expect(card).toBeInTheDocument();
  });

  test('displays error icon', () => {
    const { container } = render(
      <ErrorDisplay 
        {...mockProps}
        errorType="general"
      />
    );
    
    // Check for error icon container
    const iconContainer = container.querySelector('.bg-gradient-to-br.from-tx-error-500');
    expect(iconContainer).toBeInTheDocument();
  });

  test('displays database icon for data errors', () => {
    const { container } = render(
      <ErrorDisplay 
        {...mockProps}
        errorType="data"
      />
    );
    
    // SVG should be present for data error icon
    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });

  test('displays settings icon for API errors', () => {
    const { container } = render(
      <ErrorDisplay 
        {...mockProps}
        errorType="api"
      />
    );
    
    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });

  test('renders with centered layout', () => {
    const { container } = render(<ErrorDisplay {...mockProps} />);
    
    const wrapper = container.querySelector('.absolute.inset-0');
    expect(wrapper).toHaveClass('flex');
    expect(wrapper).toHaveClass('items-center');
    expect(wrapper).toHaveClass('justify-center');
  });

  test('renders with error background gradient', () => {
    const { container } = render(<ErrorDisplay {...mockProps} />);
    
    const background = container.querySelector('.bg-gradient-to-br');
    expect(background).toBeInTheDocument();
  });

  test('renders details in scrollable container', () => {
    render(
      <ErrorDisplay 
        {...mockProps}
        details="Long error details that might be lengthy"
      />
    );
    
    const details = screen.getByText('Long error details that might be lengthy');
    const detailsContainer = details.parentElement;
    expect(detailsContainer).toHaveClass('max-h-32');
    expect(detailsContainer).toHaveClass('overflow-y-auto');
  });
});
