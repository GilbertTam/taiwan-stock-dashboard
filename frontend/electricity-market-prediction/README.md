# Frontend Developer Guide

> Next.js 14 frontend for the JP Electricity Spot Market Dashboard

---

## 📂 Project Structure

```
electricity-market-prediction/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── page.tsx         # Dashboard home
│   │   ├── layout.tsx       # Root layout
│   │   └── login/           # Auth pages
│   ├── components/          # React components
│   │   ├── chart/           # Chart components (Recharts)
│   │   ├── sidebar/         # Control sidebar
│   │   ├── layout/          # Layout components
│   │   └── ui/              # Shared UI components
│   ├── hooks/               # Custom React hooks
│   │   └── useMarketData.ts # Main data hook
│   ├── services/            # API client
│   │   └── api.tsx          # Backend API functions
│   ├── types/               # TypeScript definitions
│   │   └── index.tsx        # All interfaces
│   ├── context/             # React contexts
│   │   └── AuthContext.tsx  # Authentication
│   └── utils/               # Utility functions
│       ├── chartUtils.ts    # Chart helpers
│       └── apiConfig.ts     # API configuration
├── public/                  # Static assets
├── .env.local               # Local environment
├── next.config.js           # Next.js config
├── tailwind.config.ts       # Tailwind CSS config
├── tsconfig.json            # TypeScript config
└── package.json             # Dependencies
```

---

## 🔧 Environment Setup

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+ or yarn 1.22+

### 1. Install Dependencies

```bash
cd frontend/electricity-market-prediction
npm install
```

### 2. Environment Variables

Create `.env.local`:

```env
# API Configuration
# Port of the backend API for local development
NEXT_PUBLIC_API_PORT=6873

# Optional: Full API URL override (for production)
# NEXT_PUBLIC_API_URL=https://api.example.com
```

### 3. Run Development Server

```bash
npm run dev
```

🎉 **Open:** http://localhost:3000

---

## 🚀 Development Workflow

### Available Scripts

```bash
# Development with hot reload
npm run dev

# Type checking
npm run type-check
# or
npx tsc --noEmit

# Production build
npm run build

# Start production server
npm start

# Linting
npm run lint

# Format with Prettier
npx prettier --write "src/**/*.{ts,tsx}"
```

### Recommended VS Code Extensions

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Nightly

---

## 🗂️ Key Components

### `useMarketData` Hook

The main data hook that manages all market data state:

```tsx
import { useMarketData } from '@/hooks/useMarketData';

function Dashboard() {
  const {
    // Data
    areas,
    selectedArea,
    actualPrices,
    predictionsByModel,
    weatherActual,
    
    // Handlers
    handleAreaChange,
    handleModelChange,
    refreshData,
    
    // Loading states
    isLoading,
    error
  } = useMarketData();

  if (isLoading) return <Spinner />;
  return <Chart data={actualPrices} />;
}
```

### API Service

Typed API functions for backend communication:

```tsx
import { fetchAreas, fetchPredictions } from '@/services/api';

// Fetch all areas
const areas = await fetchAreas();

// Fetch predictions
const predictions = await fetchPredictions({
  start_date: '20250101',
  end_date: '20250107',
  area_name: 'tokyo',
  model_name: 'ModelA'
});
```

### Types

All TypeScript interfaces are centralized:

```tsx
import { Area, PricePrediction, WeatherData } from '@/types';
```

---

## 🎨 Styling

### Tailwind CSS

The project uses Tailwind CSS with custom configuration:

```tsx
// Example component with Tailwind
<div className="bg-gray-900 text-white p-4 rounded-lg shadow-lg">
  <h1 className="text-2xl font-bold">Dashboard</h1>
</div>
```

### Material UI

MUI components are used for forms and data display:

```tsx
import { Select, MenuItem, Button } from '@mui/material';

<Select value={area} onChange={handleChange}>
  {areas.map(a => (
    <MenuItem key={a.id} value={a.name}>{a.name_ch}</MenuItem>
  ))}
</Select>
```

---

## 📊 Charts

Charts are built with Recharts:

```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

<LineChart data={prices}>
  <XAxis dataKey="trade_date" />
  <YAxis />
  <Line dataKey="price" stroke="#8884d8" />
  <Tooltip />
</LineChart>
```

---

## 🐛 Troubleshooting

### TypeScript Errors

```
Type error: Property 'X' does not exist on type 'Y'
```

**Fix:** Run type check and fix issues:
```bash
npx tsc --noEmit
```

### API Connection Failed

```
Error: No access token available
```

**Fix:** Ensure you're logged in and token is stored:
1. Check browser DevTools → Application → Cookies
2. Verify `auth_tokens` cookie exists

### Module Not Found

```
Module not found: Can't resolve '@/components/...'
```

**Fix:** Check path aliases in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Hydration Errors

```
Error: Hydration failed because the initial UI does not match
```

**Fix:** Ensure SSR-safe code:
```tsx
// ❌ Bad - runs on server
const [data, setData] = useState(localStorage.getItem('key'));

// ✅ Good - runs only on client
const [data, setData] = useState<string | null>(null);
useEffect(() => {
  setData(localStorage.getItem('key'));
}, []);
```

---

## 📚 Reference

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [React 18 Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Material UI](https://mui.com/material-ui/)
- [Recharts](https://recharts.org/en-US/)
