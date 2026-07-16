# Yogo Admin Dashboard

A comprehensive e-commerce admin frontend built with React, Vite, and Tailwind CSS.

## 🚀 Features

- Real-time dashboard with analytics and charts
- Product and category management
- Order tracking and management with timeline dates
- Customer management
- Multi-language support (English/Arabic)
- Responsive design (mobile, tablet, desktop)
- Form validation with React Hook Form
- API integration with Axios
- **Light mode only (dark mode removed)**

## 🛠️ Tech Stack

- **React** - UI library
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **React Router DOM** - Navigation
- **Axios** - HTTP client
- **Recharts** - Charts and data visualization
- **React Hook Form** - Form management
- **Lucide React** - Icons
- **React Hot Toast** - Notifications

## 📁 Project Structure

```
yogo-admin-frontend/
├── dist/                    # Build output
├── src/
│   ├── Assets/              # Static assets (images, icons)
│   │   └── Image/
│   ├── components/          # Reusable UI components
│   │   ├── charts/          # Chart components
│   │   ├── ui/              # UI primitives and shared components
│   │   └── widgets/         # Reusable widgets (e.g., StatsCard)
│   ├── context/             # React context providers
│   │   ├── AuthContext.jsx  # Authentication state
│   │   └── ThemeContext.jsx # Theme state (dark/light)
│   ├── hooks/               # Custom React hooks
│   │   ├── useApi.js        # API integration hook
│   │   └── useDebounce.js   # Debounce hook
│   ├── layouts/             # Layout components
│   │   ├── AuthLayout.jsx   # Authentication layout
│   │   └── MainLayout.jsx   # Main application layout
│   ├── pages/               # Page components
│   │   ├── Dashboard.jsx
│   │   ├── Orders.jsx
│   │   ├── Products.jsx
│   │   └── ... (other pages)
│   ├── services/            # API services
│   │   ├── api.js           # API configuration
│   │   └── mockApi.js       # Mock API data
│   ├── styles/              # Global styles
│   │   └── globals.css
│   └── utils/               # Utility functions
│       └── helpers.js
├── .env                     # Environment variables
├── index.html               # HTML template
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js
```

## 📋 Prerequisites

Before running this project, make sure you have:

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- npm or yarn package manager

1. Navigate to the project directory:
```bash
cd "c:\Users\GOOD\Desktop\yogo admin final"
```

2. Install dependencies:
```bash
npm install
```

## ▶️ Running the Application

### Development Mode

```bash
npm run dev
```

Or:

```bash
npm start
```

The application will start on [http://localhost:5173](http://localhost:5173). The page will auto-reload as you make changes.

### Production Build

```bash
npm run build
```

The build folder will be created in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

### Linting

```bash
npm run lint
```

## 🔌 API Configuration

The application proxies API requests to a backend server. By default, it connects to:

- **Backend URL**: `http://localhost:5000`

To change the API endpoint, update the proxy configuration in `vite.config.js`:

```javascript
proxy: {
  '/api': {
    target: 'http://your-backend-url:port',
    changeOrigin: true,
    secure: false,
  },
},
```

You can also set environment variables in the `.env` file:

```env
# API Configuration
VITE_API_URL=http://localhost:5000

# App Configuration  
VITE_APP_NAME="Yogo Admin"
```

## 🗂️ Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# API Configuration
VITE_API_URL=http://localhost:5000

# App Configuration
VITE_APP_NAME="Yogo Admin"
```

**Note**: The `.env` file contains sensitive information and should not be committed to version control.

## 🗂️ Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# API Configuration
VITE_API_URL=http://localhost:5000

# App Configuration
VITE_APP_NAME="Yogo Admin"
```

## 🌐 Available Pages

- **Dashboard** - Main analytics dashboard with charts and statistics
- **Orders** - Order management and tracking
- **Products** - Product catalog management
- **Categories** - Category management
- **Customers** - Customer database
- **Reports** - Analytics and reports
- **Invoices** - Invoice generation and management
- **Quotes** - Quote management
- **Enquiries** - Customer enquiry management
- **Chatbot** - Support chatbot interface
- **Profile** - User profile management
- **Site Settings** - Site configuration

## 🎨 Styling

This project uses Tailwind CSS for styling. The configuration is in `tailwind.config.js`:

- **Theme**: Light mode only (dark mode has been removed)
- **Responsive**: Mobile-first responsive design with proper breakpoints
- **Custom Components**: Built using Tailwind utility classes

## 📱 Mobile Responsive

The application is fully responsive across all screen sizes:

- **Mobile (≤768px)**: Single column layout, horizontal scroll for tables, smaller fonts
- **Tablet (768px-1024px)**: Adaptive two-column grid, optimized spacing
- **Desktop (>1024px)**: Full layout with sidebar, responsive tables and charts

Key responsive features:
- Tables scroll horizontally within their containers (no page scroll)
- Buttons and action icons larger on mobile for touch interaction
- Grid layouts stack on mobile devices
- Proper padding and margins for all screen sizes

## 🔄 Hot Module Replacement (HMR)

The development server uses Vite's HMR for instant updates when you modify code.

## 📦 Building for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` folder with:
- Minified JavaScript and CSS
- Code splitting
- Asset optimization

## 🐳 Docker Deployment

The admin panel is containerised and deployed as a production nginx container. A multi-stage Dockerfile builds the Vite bundle and copies the static output into a minimal `nginx:alpine` image.

### Files added

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build: `node:20-alpine` (build) → `nginx:alpine` (serve) |
| `nginx.conf` | SPA routing (`try_files $uri /index.html`), gzip compression, long-term asset caching |
| `.dockerignore` | Excludes `node_modules`, `dist`, `.git` from build context |

### Build-time environment variables

These are baked into the JS bundle at `docker build` time via `--build-arg`:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:5000/api` | Backend REST API base URL |
| `VITE_SOCKET_URL` | `http://localhost:5000` | Socket.IO server URL |
| `VITE_DEMO_MODE` | `true` | When `true`, app falls back to mock data if backend is unreachable |

### Build and run

```bash
# Build image (with real backend URLs)
docker build \
  --build-arg VITE_API_URL=https://api.yourdomain.com/api \
  --build-arg VITE_SOCKET_URL=https://api.yourdomain.com \
  --build-arg VITE_DEMO_MODE=false \
  -t yogo-admin-panel .

# Run container
docker run -d \
  --name yogo-admin-panel \
  --restart unless-stopped \
  -p 28095:80 \
  yogo-admin-panel
```

### Live deployment

| Environment | URL |
|-------------|-----|
| Production VM | `http://106.51.20.225:28095` |

The container listens on port 80 internally and is exposed on host port **28095**.

---

## 🤝 Contributing

1. Create a new branch for your feature
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## 📝 License

This project is private and proprietary.

## 🔧 Recent Changes

### Docker containerisation (2025-07-01)
- Added `Dockerfile` — multi-stage production build using `node:20-alpine` and `nginx:alpine`
- Added `nginx.conf` — SPA-friendly routing, gzip, and immutable asset caching headers
- Added `.dockerignore` — keeps build context lean
- Deployed to VM at `http://106.51.20.225:28095` on port 28095
- App runs in `VITE_DEMO_MODE=true` by default; pass real backend URLs as build args when connecting a live backend

### Removed Dark Mode
- All dark mode functionality has been removed
- The application now only uses light theme
- Theme toggle has been removed from the header
- `.dark` classes have been removed from CSS files

### Order Tracking
- All dates now displayed in popup modal in grid format
- All dates now displayed in table for better visibility
- Enhanced mobile responsiveness with proper grid stacking

### Responsive Design
- Improved mobile responsiveness across all dimensions
- Tables automatically scroll horizontally within their containers
- Grid layouts stack properly on smaller screens
- Proper touch targets for mobile interaction
