import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Chart as ChartJS, registerables } from 'chart.js'
import './index.css'
import App from './App.tsx'

// Register all Chart.js components globally so charts work regardless
// of which page the user lands on first (e.g. ComparisonView before MetricsDashboard).
ChartJS.register(...registerables)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
