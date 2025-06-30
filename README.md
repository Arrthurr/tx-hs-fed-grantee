# Texas Interactive Map

A beautiful, production-ready interactive map of Texas built with React, TypeScript, and Google Maps API. This application showcases major cities, landmarks, and points of interest across the Lone Star State with smooth interactions and comprehensive controls.

## 🌟 Features

- **Interactive Google Maps Integration**: Full-featured map with zoom, pan, and navigation controls
- **City Markers**: 12+ major Texas cities with detailed information popups
- **Custom Controls**: Enhanced map controls with zoom, reset, and fit-to-markers functionality
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Loading States**: Elegant loading animations and error handling
- **Detailed City Information**: Population data, descriptions, and city classifications
- **Modern UI**: Clean, professional design with Tailwind CSS
- **TypeScript**: Full type safety and excellent developer experience
- **Performance Optimized**: Efficient rendering and API usage

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

3. **Configure environment variables**:
   ```bash
   cp .env.local.example .env.local
   ```
   Edit `.env.local` and add your Google Maps API key:
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
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
# Google Maps Platform API Key
# Get your key from: https://console.cloud.google.com/google/maps-apis/
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### Google Maps API Setup

1. **Create a Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Required APIs**:
   - Navigate to "APIs & Services" > "Library"
   - Search for and enable "Maps JavaScript API"
   - Optionally enable "Places API" for enhanced features

3. **Create API Key**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated API key

4. **Secure Your API Key** (Important for production):
   - Click on your API key to edit it
   - Under "Application restrictions", select "HTTP referrers"
   - Add your domains:
     - For development: `http://localhost:5173/*`
     - For production: `https://yourdomain.com/*`

### Common Issues and Solutions

#### "API key not configured" Error
- Ensure `.env.local` file exists in project root
- Verify the variable name is exactly `VITE_GOOGLE_MAPS_API_KEY`
- Restart the development server after creating/modifying `.env.local`

#### "RefererNotAllowedMapError"
- Add your domain to API key restrictions in Google Cloud Console
- For local development, add `http://localhost:5173/*`

#### "InvalidKeyMapError"
- Double-check your API key is correct
- Ensure Maps JavaScript API is enabled in Google Cloud Console

## 🏗️ Architecture

### Project Structure

```
src/
├── components/           # React components
│   ├── TexasMap.tsx     # Main map component
│   ├── MapControls.tsx  # Custom map controls
│   ├── LoadingSpinner.tsx
│   └── ErrorDisplay.tsx
├── hooks/
│   └── useGoogleMaps.ts # Custom Google Maps hook
├── types/
│   └── maps.ts          # TypeScript type definitions
├── data/
│   └── texasLocations.ts # City and location data
└── App.tsx              # Main application component
```

### Key Components

- **TexasMap**: Main map component with Google Maps integration
- **MapControls**: Enhanced controls for zoom, reset, and marker fitting
- **LoadingSpinner**: Elegant loading states with Texas-themed styling
- **ErrorDisplay**: User-friendly error handling with retry functionality and troubleshooting tips

## 🎨 Design Features

- **Apple-level Design Aesthetics**: Clean, minimal, and sophisticated
- **Smooth Animations**: Subtle transitions and micro-interactions
- **Responsive Layout**: Adapts beautifully to all screen sizes
- **Custom Map Styling**: Enhanced visual appeal with custom map themes
- **Intuitive Controls**: Easy-to-use interface with clear visual feedback

## 📍 Featured Cities

The map includes 12 major Texas cities:

- Houston (Population: 2.3M+)
- San Antonio (Population: 1.5M+)
- Dallas (Population: 1.3M+)
- Austin (Population: 965K+)
- Fort Worth (Population: 918K+)
- El Paso (Population: 695K+)
- Arlington (Population: 394K+)
- Corpus Christi (Population: 317K+)
- Plano (Population: 285K+)
- Lubbock (Population: 258K+)
- Laredo (Population: 255K+)
- Irving (Population: 256K+)

## 🛠️ Technologies Used

- **React 18**: Modern React with hooks and functional components
- **TypeScript**: Full type safety and excellent developer experience
- **@vis.gl/react-google-maps**: Modern React Google Maps integration
- **Google Maps API**: Industry-standard mapping service
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Fast, modern build tool
- **Lucide React**: Beautiful, customizable icons

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🔧 API Configuration

### Required Google Maps APIs

1. **Maps JavaScript API**: Core mapping functionality
2. **Places API**: Enhanced location data (optional)

### API Key Security Best Practices

- **Development**: Restrict to `http://localhost:5173/*`
- **Production**: Restrict to your specific domain(s)
- **Enable only required APIs**: Maps JavaScript API (required), Places API (optional)
- **Monitor usage**: Set up billing alerts in Google Cloud Console
- **Regular rotation**: Consider rotating API keys periodically

### Environment Variables Security

- Never commit `.env.local` to version control
- Use different API keys for development and production
- Consider using environment-specific restrictions

## 📈 Performance Optimizations

- Lazy loading of map components
- Efficient marker management
- Debounced user interactions
- Optimized bundle size with Vite
- Preconnect to Google Maps domains
- Error boundaries for graceful failure handling

## 🚀 Deployment

The application is ready for deployment to any static hosting service:

### Netlify
1. Build the project: `npm run build`
2. Deploy the `dist` folder
3. Add environment variables in Netlify dashboard

### Vercel
1. Connect your Git repository
2. Add `VITE_GOOGLE_MAPS_API_KEY` in environment variables
3. Deploy automatically on push

### Other Platforms
- **GitHub Pages**: Upload `dist` folder contents
- **AWS S3**: Configure as static website
- **Firebase Hosting**: Use Firebase CLI

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with proper TypeScript types
4. Add detailed comments for complex logic
5. Test on multiple devices and browsers
6. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Google Maps Platform for excellent mapping services
- Texas cities data from official sources
- Lucide React for beautiful icons
- Tailwind CSS for utility-first styling
- @vis.gl/react-google-maps for modern React integration

---

Built with ❤️ for exploring the great state of Texas!