/// <reference types="@testing-library/jest-dom" />

declare namespace jest {
  interface Matchers<R> {
    toBeInTheDocument(): R;
    toHaveClass(className: string): R;
    toHaveAttribute(attr: string, value?: string): R;
    toHaveTextContent(text: string | RegExp): R;
    toBeVisible(): R;
    toBeEnabled(): R;
    toBeDisabled(): R;
    toBeChecked(): R;
    toHaveValue(value: string | number): R;
    toHaveDisplayValue(value: string | string[]): R;
    toBeValid(): R;
    toBeInvalid(): R;
    toHaveDescription(text?: string | RegExp): R;
  }
} 