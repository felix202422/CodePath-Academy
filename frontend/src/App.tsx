import { Route, Routes } from 'react-router';
import { ApiStatus } from './features/health/ApiStatus';

/**
 * Route shell. Public/student/admin layouts are added in Phase 2; Phase 1 proves
 * the SPA builds, runs, and talks to the backend through the typed API client.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ApiStatus />} />
      <Route path="*" element={<ApiStatus />} />
    </Routes>
  );
}
