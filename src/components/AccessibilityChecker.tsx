import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, X, Accessibility } from 'lucide-react';

/**
 * Accessibility issue type
 */
interface AccessibilityIssue {
  id: string;
  element: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  helpUrl?: string;
}

/**
 * Props for the AccessibilityChecker component
 */
interface AccessibilityCheckerProps {
  /** Whether to automatically run checks on mount */
  autoRun?: boolean;
  /** Whether to show the checker (only in development) */
  show?: boolean;
}

/**
 * Accessibility checker component for validating WCAG compliance
 * This component is only used in development mode
 */
const AccessibilityChecker: React.FC<AccessibilityCheckerProps> = ({
  autoRun = false,
  show = import.meta.env.DEV // Only show in development mode
}) => {
  // State for issues and UI
  const [issues, setIssues] = useState<AccessibilityIssue[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  
  /**
   * Run accessibility checks
   */
  const runChecks = async () => {
    setIsRunning(true);
    setIssues([]);
    
    try {
      // Simulate loading time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Perform manual checks
      const newIssues: AccessibilityIssue[] = [];
      
      // Check for images without alt text
      document.querySelectorAll('img').forEach((img, index) => {
        if (!img.hasAttribute('alt')) {
          newIssues.push({
            id: `img-alt-${index}`,
            element: `<img src="${img.src}">`,
            impact: 'serious',
            description: 'Image does not have an alt attribute',
            helpUrl: 'https://www.w3.org/WAI/tutorials/images/decision-tree/'
          });
        }
      });
      
      // Check for buttons without accessible names
      document.querySelectorAll('button').forEach((button, index) => {
        if (!button.textContent?.trim() && !button.getAttribute('aria-label')) {
          newIssues.push({
            id: `button-name-${index}`,
            element: button.outerHTML.slice(0, 100) + (button.outerHTML.length > 100 ? '...' : ''),
            impact: 'critical',
            description: 'Button does not have an accessible name',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA14'
          });
        }
      });
      
      // Check for color contrast (simplified)
      const lowContrastElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const style = window.getComputedStyle(el);
        const color = style.color;
        const bgColor = style.backgroundColor;
        
        // Very simplified check - just looking for potential issues
        return (
          color === 'rgb(229, 231, 235)' && bgColor === 'rgb(255, 255, 255)' ||
          color === 'rgb(209, 213, 219)' && bgColor === 'rgb(249, 250, 251)'
        );
      });
      
      lowContrastElements.forEach((el, index) => {
        newIssues.push({
          id: `contrast-${index}`,
          element: el.outerHTML.slice(0, 100) + (el.outerHTML.length > 100 ? '...' : ''),
          impact: 'moderate',
          description: 'Element may have insufficient color contrast',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html'
        });
      });
      
      // Check for keyboard accessibility
      document.querySelectorAll('a, button, [role="button"]').forEach((el, index) => {
        if (el.getAttribute('tabindex') === '-1' && !el.getAttribute('aria-hidden')) {
          newIssues.push({
            id: `keyboard-${index}`,
            element: el.outerHTML.slice(0, 100) + (el.outerHTML.length > 100 ? '...' : ''),
            impact: 'serious',
            description: 'Interactive element is not keyboard accessible',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html'
          });
        }
      });
      
      // Set issues
      setIssues(newIssues);
    } catch (error) {
      console.error('Error running accessibility checks:', error);
    } finally {
      setIsRunning(false);
    }
  };
  
  /**
   * Run checks on mount if autoRun is true
   */
  useEffect(() => {
    if (autoRun) {
      runChecks();
    }
    
    // Show panel after a delay
    const timer = setTimeout(() => {
      setShowPanel(true);
    }, 1000);
    
    return () => {
      clearTimeout(timer);
    };
  }, [autoRun]);
  
  // Don't render anything if not showing
  if (!show || !showPanel) {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 left-4 z-50">
      {/* Collapsed button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-white rounded-lg shadow-lg border border-tx-gray-200 p-3 flex items-center space-x-2"
          aria-label="Open accessibility checker"
        >
          <Accessibility className="w-5 h-5 text-tx-blue-600" aria-hidden="true" />
          <span className="text-sm font-medium text-tx-gray-700">
            Accessibility
          </span>
          {issues.length > 0 && (
            <span className="bg-tx-error-100 text-tx-error-600 text-xs font-medium px-2 py-1 rounded-full">
              {issues.length}
            </span>
          )}
        </button>
      )}
      
      {/* Expanded panel */}
      {isOpen && (
        <div className="bg-white rounded-lg shadow-lg border border-tx-gray-200 w-96 max-h-[80vh] flex flex-col" role="dialog" aria-labelledby="accessibility-checker-title">
          {/* Header */}
          <div className="p-4 border-b border-tx-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Accessibility className="w-5 h-5 text-tx-blue-600" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-tx-gray-800" id="accessibility-checker-title">
                Accessibility Checker
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-tx-gray-500 hover:text-tx-gray-700"
              aria-label="Close accessibility checker"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-4 overflow-y-auto flex-1">
            <div className="space-y-4">
              {/* Run button */}
              <button
                onClick={runChecks}
                disabled={isRunning}
                className="w-full btn-primary flex items-center justify-center space-x-2"
                aria-label={isRunning ? "Running accessibility checks..." : "Run accessibility checks"}
              >
                <Accessibility className="w-4 h-4" aria-hidden="true" />
                <span>{isRunning ? 'Running Checks...' : 'Run Accessibility Checks'}</span>
              </button>
              
              {/* Results */}
              {issues.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-tx-gray-700">
                      Found {issues.length} issue{issues.length !== 1 ? 's' : ''}
                    </h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      issues.length > 10 
                        ? 'bg-tx-error-100 text-tx-error-600' 
                        : issues.length > 5 
                          ? 'bg-tx-orange-100 text-tx-orange-600' 
                          : 'bg-tx-green-100 text-tx-green-600'
                    }`}>
                      {issues.length > 10 
                        ? 'Critical' 
                        : issues.length > 5 
                          ? 'Warning' 
                          : 'Minor'}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {issues.map(issue => (
                      <div 
                        key={issue.id} 
                        className="border border-tx-gray-200 rounded-lg overflow-hidden"
                      >
                        <div className={`p-3 flex items-center justify-between ${
                          issue.impact === 'critical' 
                            ? 'bg-tx-error-50' 
                            : issue.impact === 'serious' 
                              ? 'bg-tx-orange-50' 
                              : 'bg-tx-blue-50'
                        }`}>
                          <div className="flex items-center space-x-2">
                            <AlertCircle className={`w-4 h-4 ${
                              issue.impact === 'critical' 
                                ? 'text-tx-error-500' 
                                : issue.impact === 'serious' 
                                  ? 'text-tx-orange-500' 
                                  : 'text-tx-blue-500'
                            }`} aria-hidden="true" />
                            <span className="text-sm font-medium text-tx-gray-800">
                              {issue.description}
                            </span>
                          </div>
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-white bg-opacity-50 text-tx-gray-700">
                            {issue.impact}
                          </span>
                        </div>
                        <div className="p-3 bg-tx-gray-50 text-xs font-mono text-tx-gray-600 overflow-x-auto">
                          {issue.element}
                        </div>
                        {issue.helpUrl && (
                          <div className="p-3 border-t border-tx-gray-200">
                            <a 
                              href={issue.helpUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-tx-blue-600 hover:underline"
                              aria-label={`Learn more about ${issue.description}`}
                            >
                              Learn more about this issue
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : isRunning ? (
                <div className="flex items-center justify-center p-8" aria-live="polite">
                  <div className="w-8 h-8 border-2 border-tx-blue-600 border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
                  <span className="sr-only">Running accessibility checks...</span>
                </div>
              ) : (
                <div className="bg-tx-green-50 p-4 rounded-lg flex items-center space-x-3" role="status">
                  <CheckCircle className="w-5 h-5 text-tx-green-500" aria-hidden="true" />
                  <p className="text-sm text-tx-green-700">
                    No accessibility issues detected
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t border-tx-gray-200 bg-tx-gray-50">
            <p className="text-xs text-tx-gray-500">
              This tool checks for common accessibility issues based on WCAG 2.1 guidelines.
              For a comprehensive audit, use specialized tools like axe or WAVE.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessibilityChecker;
