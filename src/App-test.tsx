import React from 'react';
import { Building2, Users } from 'lucide-react';

/**
 * Test version of App component to debug loading issues
 */
const AppTest: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-tx-blue-50 via-white to-tx-orange-50">
        {/* Header Section */}
        <header className="bg-white shadow-sm border-b border-tx-gray-200 sticky top-0 z-50" role="banner">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {/* Title and Logo */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-600 rounded"></div>
                <div>
                  <h1 className="text-2xl font-bold text-tx-gray-900 flex items-center gap-2">
                    Texas Head Start Federal Grantee Programs
                  </h1>
                  <p className="text-sm text-tx-gray-600 mt-1">
                    TEST VERSION - Checking if app loads without Google Maps
                  </p>
                </div>
              </div>
              
              {/* Header stats */}
              <div className="flex items-center space-x-8">
                <div className="hidden lg:flex items-center space-x-8">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <Building2 className="w-5 h-5 text-green-600" aria-hidden="true" />
                      <span className="text-xl font-bold text-tx-gray-900">86</span>
                    </div>
                    <p className="text-xs text-tx-gray-600">Head Start Programs</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <Users className="w-5 h-5 text-purple-600" aria-hidden="true" />
                      <span className="text-xl font-bold text-tx-gray-900">36</span>
                    </div>
                    <p className="text-xs text-tx-gray-600">Congressional Districts</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" role="main">
          {/* Map Section */}
          <div className="card-elevated overflow-hidden">
            {/* Map Header */}
            <div className="bg-gradient-to-r from-tx-blue-600 via-tx-blue-700 to-tx-blue-800 p-6 relative overflow-hidden">
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-10" aria-hidden="true">
                <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full translate-x-12 translate-y-12"></div>
              </div>
              
              <div className="relative z-10">
                <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                  Federal Grantee Head Start Programs
                </h2>
                <p className="text-blue-100 text-sm leading-relaxed">
                  TEST VERSION - This confirms the app structure loads correctly
                </p>
              </div>
            </div>

            {/* Test Content */}
            <div className="relative bg-white p-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">✅ App Structure Loads Successfully!</h3>
                <p className="text-gray-600 mb-4">
                  This test version confirms that the basic app structure and styling are working correctly.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left max-w-2xl mx-auto">
                  <h4 className="font-semibold text-yellow-800 mb-2">The issue appears to be with:</h4>
                  <ul className="list-disc list-inside text-yellow-700 space-y-1">
                    <li>Google Maps API loading</li>
                    <li>API key configuration</li>
                    <li>Or the loading state management in App.tsx</li>
                  </ul>
                </div>
                
                <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Check the browser console for any errors related to:
                  </p>
                  <ul className="text-sm text-gray-700 mt-2">
                    <li>• Google Maps API key issues</li>
                    <li>• Network/CORS errors</li>
                    <li>• JavaScript exceptions</li>
                  </ul>
                </div>

                <div className="mt-6">
                  <p className="text-sm text-gray-500">
                    Colors are using CSS variables: 
                    <span className="inline-block px-2 py-1 mx-1 bg-green-600 text-white rounded">headstart-primary</span>
                    <span className="inline-block px-2 py-1 mx-1 bg-purple-600 text-white rounded">district-primary</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-8 text-center" role="contentinfo">
            <div className="text-sm text-tx-gray-500">
              <p>
                Texas Head Start Interactive Map - TEST VERSION
              </p>
              <p className="mt-1">
                Testing app structure without Google Maps dependencies
              </p>
            </div>
          </footer>
        </main>
      </div>
  );
};

export default AppTest;
