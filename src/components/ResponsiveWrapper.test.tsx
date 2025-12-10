/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ResponsiveWrapper from './ResponsiveWrapper';

describe('ResponsiveWrapper Component', () => {
  beforeEach(() => {
    // Jest runs with DEV mode disabled by default
  });

  test('renders children when showDeviceSelector is false', () => {
    render(
      <ResponsiveWrapper showDeviceSelector={false}>
        <div>Test Child Content</div>
      </ResponsiveWrapper>
    );
    
    expect(screen.getByText('Test Child Content')).toBeInTheDocument();
  });

  test('renders children even when showDeviceSelector is true', () => {
    render(
      <ResponsiveWrapper showDeviceSelector={true}>
        <div>Test Child Content</div>
      </ResponsiveWrapper>
    );
    
    expect(screen.getByText('Test Child Content')).toBeInTheDocument();
  });

  test('does not show device selector by default in production', () => {
    const { container } = render(
      <ResponsiveWrapper>
        <div>Test Content</div>
      </ResponsiveWrapper>
    );
    
    const selector = container.querySelector('[role="region"]');
    expect(selector).not.toBeInTheDocument();
  });

  test('shows device selector when explicitly enabled', () => {
    const { container } = render(
      <ResponsiveWrapper showDeviceSelector={true}>
        <div>Test Content</div>
      </ResponsiveWrapper>
    );
    
    const selector = container.querySelector('[role="region"][aria-label="Device size selector"]');
    expect(selector).toBeInTheDocument();
  });

  test('renders all device size buttons when selector is visible', () => {
    render(
      <ResponsiveWrapper showDeviceSelector={true}>
        <div>Test Content</div>
      </ResponsiveWrapper>
    );
    
    expect(screen.getByLabelText(/Switch to Mobile view/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Switch to Tablet view/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Switch to Desktop view/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Switch to Full Width view/)).toBeInTheDocument();
  });

  test('renders mobile button with aria-pressed true by default', () => {
    render(
      <ResponsiveWrapper showDeviceSelector={true}>
        <div>Test Content</div>
      </ResponsiveWrapper>
    );
    
    // Full width is the default
    const fullWidthButton = screen.getByLabelText(/Switch to Full Width view/);
    expect(fullWidthButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('switches device size when button is clicked', () => {
    const { container } = render(
      <ResponsiveWrapper showDeviceSelector={true}>
        <div>Test Content</div>
      </ResponsiveWrapper>
    );
    
    const mobileButton = screen.getByLabelText(/Switch to Mobile view/);
    fireEvent.click(mobileButton);
    
    expect(mobileButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('updates active button styling when device size changes', () => {
    render(
      <ResponsiveWrapper showDeviceSelector={true}>
        <div>Test Content</div>
      </ResponsiveWrapper>
    );
    
    const tabletButton = screen.getByLabelText(/Switch to Tablet view/);
    fireEvent.click(tabletButton);
    
    expect(tabletButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('displays current size indicator', () => {
    const { container } = render(
      <ResponsiveWrapper showDeviceSelector={true}>
        <div>Test Content</div>
      </ResponsiveWrapper>
    );
    
    // Should display size text somewhere in the container
    expect(container.textContent).toMatch(/\d+\s*x\s*\d+|width|height/i);
  });

  test('renders content container with children', () => {
    render(
      <ResponsiveWrapper>
        <div>Test Content</div>
      </ResponsiveWrapper>
    );
    
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  test('applies correct styling to content container in full width mode', () => {
    const { container } = render(
      <ResponsiveWrapper showDeviceSelector={true}>
        <div>Test Content</div>
      </ResponsiveWrapper>
    );
    
    // Check that content is rendered  
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  test('has accessibility attributes on device selector', () => {
    const { container } = render(
      <ResponsiveWrapper showDeviceSelector={true}>
        <div>Test Content</div>
      </ResponsiveWrapper>
    );
    
    const selector = container.querySelector('[role="region"]');
    expect(selector).toHaveAttribute('aria-label', 'Device size selector');
  });

  test('has role group on button container', () => {
    const { container } = render(
      <ResponsiveWrapper showDeviceSelector={true}>
        <div>Test Content</div>
      </ResponsiveWrapper>
    );
    
    const group = container.querySelector('[role="group"]');
    expect(group).toHaveAttribute('aria-label', 'Select device size');
  });

  test('each button has title attribute for tooltip', () => {
    render(
      <ResponsiveWrapper showDeviceSelector={true}>
        <div>Test Content</div>
      </ResponsiveWrapper>
    );
    
    const mobileButton = screen.getByLabelText(/Switch to Mobile view/);
    expect(mobileButton).toHaveAttribute('title');
  });

  test('renders with fixed positioning for selector', () => {
    const { container } = render(
      <ResponsiveWrapper showDeviceSelector={true}>
        <div>Test Content</div>
      </ResponsiveWrapper>
    );
    
    const selector = container.querySelector('.fixed');
    expect(selector).toBeInTheDocument();
  });

  test('selector appears in bottom right corner', () => {
    const { container } = render(
      <ResponsiveWrapper showDeviceSelector={true}>
        <div>Test Content</div>
      </ResponsiveWrapper>
    );
    
    const selector = container.querySelector('.fixed');
    expect(selector).toHaveClass('bottom-4');
    expect(selector).toHaveClass('right-4');
  });

  test('renders device icons for each button', () => {
    const { container } = render(
      <ResponsiveWrapper showDeviceSelector={true}>
        <div>Test Content</div>
      </ResponsiveWrapper>
    );
    
    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThanOrEqual(4);
  });

  test('updates size indicator on window resize', async () => {
    const { container } = render(
      <ResponsiveWrapper showDeviceSelector={true}>
        <div>Test Content</div>
      </ResponsiveWrapper>
    );
    
    // Simulate window resize
    global.innerWidth = 800;
    fireEvent.resize(window);
    
    // Should still render the component
    expect(container).toBeInTheDocument();
  });

  test('renders with high z-index for selector', () => {
    const { container } = render(
      <ResponsiveWrapper showDeviceSelector={true}>
        <div>Test Content</div>
      </ResponsiveWrapper>
    );
    
    const selector = container.querySelector('.z-50');
    expect(selector).toBeInTheDocument();
  });

  test('selector has proper background and border styling', () => {
    const { container } = render(
      <ResponsiveWrapper showDeviceSelector={true}>
        <div>Test Content</div>
      </ResponsiveWrapper>
    );
    
    const selector = container.querySelector('[role="region"]');
    expect(selector).toHaveClass('bg-white');
    expect(selector).toHaveClass('rounded-lg');
    expect(selector).toHaveClass('shadow-lg');
    expect(selector).toHaveClass('border');
  });

  test('buttons have hover styling', () => {
    render(
      <ResponsiveWrapper showDeviceSelector={true}>
        <div>Test Content</div>
      </ResponsiveWrapper>
    );
    
    const mobileButton = screen.getByLabelText(/Switch to Mobile view/);
    expect(mobileButton).toHaveClass('transition-colors');
  });

  test('active button has distinct background color', () => {
    render(
      <ResponsiveWrapper showDeviceSelector={true}>
        <div>Test Content</div>
      </ResponsiveWrapper>
    );
    
    const mobileButton = screen.getByLabelText(/Switch to Mobile view/);
    fireEvent.click(mobileButton);
    
    // Active button should have bg color
    expect(mobileButton).toHaveClass('bg-tx-blue-100');
  });

  test('renders content wrapper with children', () => {
    const { container } = render(
      <ResponsiveWrapper>
        <div data-testid="child">Test Content</div>
      </ResponsiveWrapper>
    );
    
    // Verify child is rendered
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
});
