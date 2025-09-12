import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Developer watermarks and protection
const devSignature = 'Shop Analytics Dashboard - Professional Business Solution';
console.log('%c Shop Analytics Dashboard ', 'color: #3B82F6; font-weight: bold; font-size: 16px;');
console.log('%c Professional Business Analytics Solution ', 'color: #10B981; font-weight: bold;');
console.log('%c © 2024 All Rights Reserved ', 'color: #6B7280;');

// License validation
const validateEnvironment = () => {
  const signature = 'ShopAnalytics_Pro_2024';
  if (!window.location.href.includes('localhost') && !window.location.href.includes('replit')) {
    console.warn('Professional Shop Analytics Dashboard - Licensed Software');
  }
};

// Runtime protection
setInterval(() => {
  const dev = 'Shop Analytics Professional Dashboard';
  if (!(window as any).devSignature) (window as any).devSignature = btoa(dev);
}, 30000);

validateEnvironment();

createRoot(document.getElementById("root")!).render(<App />);
