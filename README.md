# Texas Head Start Interactive Map

An interactive map application that visualizes Head Start and Early Head Start Federal Grantee Programs across Texas, along with congressional district boundaries. This tool helps policymakers and state officials analyze program distribution and political representation.

## 🌟 Features

- **Interactive Google Maps Integration**: Smooth, responsive map of Texas with custom styling
- **Head Start Program Markers**: View all Head Start and Early Head Start program locations across Texas
- **Congressional District Boundaries**: Toggle district boundaries with semi-transparent, color-coded overlays
- **Congressional Representative Data**: Real-time representative information from Congress.gov API
- **Detailed Information Popups**: Click on any marker or district to view comprehensive details
- **Layer Controls**: Easily toggle between different data layers
- **Responsive Design**: Optimized for desktop and tablet devices
- **Search Functionality**: Find specific programs or districts by name, address, or representative
- **Performance Optimized**: Efficiently handles 80+ program locations and 36 congressional districts
- **Accessibility Compliant**: Built with WCAG guidelines in mind

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm
- Google Maps API key with Maps JavaScript API enabled
- Congress.gov API key (optional, for enhanced congressional data)

### Installation

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Set up Google Maps API**:
   - Visit [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/)
   - Create a new project or select an existing one
   - Enable the **Maps JavaScript API**
   - Create an API key and restrict it to your domain (for production)
   - Optionally create a Map ID for custom styling

3. **Set up Congress.gov API** (optional):
   - Visit [Congress.gov API](https://api.congress.gov/)
   - Sign up for an API key
   - This enables enhanced congressional representative data

4. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and add your API keys:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=your_actual_google_maps_api_key_here
   VITE_GOOGLE_MAPS_MAP_ID=your_map_id_here
   VITE_CONGRESS_API_KEY=your_congress_api_key_here
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

6. **Build for production**:
   ```bash
   npm run build
   ```

## 🔧 Environment Configuration

### Required Environment Variables

Create a `.env.local` file in your project root with the following:

```env
# Google Maps Platform API Key (Required)
# Get your key from: https://console.cloud.google.com/google/maps-apis/
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Google Maps Map ID (Optional)
# Get your Map ID from: https://console.cloud.google.com/google/maps-apis/
# Used for custom map styling
VITE_GOOGLE_MAPS_MAP_ID=your_map_id_here

# Congress.gov API Key (Optional)
# Get your key from: https://api.congress.gov/
# Enables enhanced congressional representative data
VITE_CONGRESS_API_KEY=your_congress_api_key_here
```

### API Key Setup Instructions

#### Google Maps API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Maps JavaScript API**
4. Create credentials (API key)
5. Restrict the API key to your domain for security
6. Optionally create a Map ID for custom styling

#### Congress.gov API
1. Visit [Congress.gov API](https://api.congress.gov/)
2. Sign up for an account
3. Request an API key
4. The API key enables enhanced congressional data including:
   - Representative photos
   - Contact information
   - Committee assignments
   - Party affiliations

## 🏗️ Project Structure

```
src/
├── components/           # React components
│   ├── TexasMap.tsx     # Main map component
│   ├── MapControls.tsx  # Layer toggle controls
│   ├── InfoWindow.tsx   # Information popups
│   ├── LoadingSpinner.tsx
│   └── ErrorDisplay.tsx
├── hooks/
│   ├── useMapData.ts    # Data management hook
│   └── useSearch.ts     # Search functionality hook
├── data/
│   ├── headStartPrograms.ts      # Program data processing
│   └── congressionalDistricts.ts # District data processing
├── types/
│   └── maps.ts          # TypeScript type definitions
├── utils/
│   └── mapHelpers.ts    # Map utility functions
├── styles/
│   └── design-system.css # Custom design system
└── App.tsx              # Main application component
```

## 📊 Data Sources

The application uses GeoJSON data for both Head Start programs and congressional districts:

- **Head Start Programs**: Location data for all Head Start and Early Head Start federal grantee programs in Texas
- **Congressional Districts**: Boundary data for all 36 Texas congressional districts

## 🎨 Design Features

- **Texas-Themed Color Palette**: Professional blue and orange color scheme
- **Intuitive Layer Controls**: Easy-to-use toggles for different data layers
- **Informative Popups**: Well-designed information windows with comprehensive details
- **Responsive Layout**: Adapts to different screen sizes
- **Accessible Design**: High-contrast colors and keyboard navigation support

## 🛠️ Technologies Used

- **React 18**: Modern React with hooks and functional components
- **TypeScript**: Full type safety and excellent developer experience
- **@vis.gl/react-google-maps**: Modern React Google Maps integration
- **Google Maps API**: Industry-standard mapping service
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Fast, modern build tool
- **Lucide React**: Beautiful, customizable icons

## 🧪 Testing

The application includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/components/TexasMap.test.tsx

# Run end-to-end tests
npm run test:e2e
```

## 🔍 Key Features in Detail

### Head Start Programs Layer

- Displays all Head Start and Early Head Start program locations
- Provides detailed information on each program including:
  - Program name
  - Full address
  - Grantee organization
  - Annual funding amount (when available)

### Congressional Districts Layer

- Shows all 36 Texas congressional districts with color-coded boundaries
- Provides information on each district including:
  - District number
  - Representative name
  - Party affiliation
  - Population data
  - Contact information

### Layer Controls

- Toggle Head Start Programs visibility
- Toggle Congressional Districts visibility
- Toggle District Boundaries visibility
- Clear visual indicators of current layer state

### Search Functionality

- Search for programs by name, address, or grantee
- Search for districts by number or representative name
- Results display with count and category breakdown
- Map automatically centers on selected search result

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with proper TypeScript types
4. Add detailed comments for complex logic
5. Test on multiple devices and browsers
6. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

Built with ❤️ for Texas Head Start program analysis and policy planning.