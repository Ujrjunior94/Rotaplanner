import React from 'react';
import { DriverProvider } from './context/DriverContext';
import { DriverPlannerApp } from './components/DriverPlannerApp';

export default function App() {
  return (
    <DriverProvider>
      <DriverPlannerApp />
    </DriverProvider>
  );
}
