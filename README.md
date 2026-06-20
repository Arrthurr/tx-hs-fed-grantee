# Texas Head Start Interactive Map

An interactive map application that visualizes Head Start and Early Head Start Federal Grantee Programs across Texas, along with TXHSA regions. This tool helps policymakers and state officials analyze program distribution.

## 🌟 Features

- **Interactive Google Maps Integration**: Smooth, responsive map of Texas with custom styling
- **Head Start Program Markers**: View all Head Start and Early Head Start program locations across Texas
- **TXHSA Regions Overlay**: Toggle the four TXHSA regions (West / North / East / South), built by dissolving TDEM-8 disaster regions from Texas counties
- **Per-region program counts**: Click a region to see how many Head Start / Early Head Start programs fall inside it
- **Detailed Information Popups**: Click on any program marker to view comprehensive details
- **Layer Controls**: Easily toggle between different data layers
- **Responsive Design**: Optimized for desktop and tablet devices
- **Performance Optimized**: Efficiently handles 80+ program locations and the four region polygons
- **Accessibility Compliant**: Built with WCAG guidelines in mind

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm
- Google Maps API key with Maps JavaScript API enabled

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

3. **Configure environment variables**:
   Create a `.env.local` file in the project root:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=your_actual_google_maps_api_key_here
   VITE_GOOGLE_MAPS_MAP_ID=your_map_id_here
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Build for production**:
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
```

### API Key Setup Instructions

#### Google Maps API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Maps JavaScript API**
4. Create credentials (API key)
5. Restrict the API key to your domain for security
6. Optionally create a Map ID for custom styling

## 🏗️ Project Structure

```
src/
├── components/           # React components
│   ├── TexasMap.tsx     # Main map component (renders InfoWindow inline)
│   ├── MapControls.tsx  # Layer toggle controls
│   ├── SearchBar.tsx    # Search input
│   ├── SearchResults.tsx # Search results display
│   ├── LoadingSpinner.tsx
│   └── ErrorDisplay.tsx
├── hooks/
│   ├── useMapData.tsx   # Data management hook
│   └── useSearch.ts     # Search functionality hook
├── data/
│   ├── headStartPrograms.ts # Program data processing
│   ├── txhsaRegions.ts      # Region validation + processing
│   └── tdemCountyRegions.ts # TDEM county → region lookup
├── types/
│   └── maps.ts          # TypeScript type definitions
├── utils/
│   ├── geometry.ts      # Point-in-polygon helpers
│   └── mapHelpers.ts    # Map utility functions
├── styles/
│   └── design-system.css # Custom design system
└── App.tsx              # Main application component
```

## 📊 Data Sources

- **Head Start Programs**: Location data for all Head Start and Early Head Start federal grantee programs in Texas
- **TXHSA Regions**: Four polygons (West / North / East / South) built at repo-build time by dissolving Texas counties grouped by their TDEM region (https://tdem.texas.gov/regions). The dissolve script lives at `scripts/build-txhsa-regions.ts`; the committed lookup at `src/data/tdemCountyRegions.ts` maps each county to its TDEM region.

To regenerate the region geojson after updating the lookup or the county source:

```bash
npm run build:regions
```

## 🎨 Design Features

- **Texas-Themed Color Palette**: Professional blue and orange color scheme
- **Distinct Region Hues**: Amber, blue, violet, and red - each WCAG-AA compliant against the basemap
- **Intuitive Layer Controls**: Easy-to-use toggles for different data layers
- **Informative Popups**: Well-designed information windows
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
- **@turf/union**: Topology-aware geometry dissolve (build-time only)

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

### TXHSA Regions Layer

- Shows the four TXHSA regions (West / North / East / South) as a single dissolved polygon per region
- Click a region to see its name, the count of Head Start / Early Head Start programs that fall inside it, and the total funded amount for the region
- Counts are computed lazily via point-in-polygon and memoized once both datasets are loaded
- Funded amounts are authored figures supplied by the product owner (West: 11,857; North: 12,311; East: 15,360; South: 19,049)

### Layer Controls

- Toggle Head Start Programs visibility
- Toggle TXHSA Regions visibility
- Clear visual indicators of current layer state

### Search Functionality

- Search for programs by name, address, or grantee
- Results display with count
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
