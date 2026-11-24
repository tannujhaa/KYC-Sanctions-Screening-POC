import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { NewScreeningPage } from './pages/NewScreeningPage';
import { ScreeningCasesPage } from './pages/ScreeningCasesPage';
import { ScreeningResultPage } from './pages/ScreeningResultPage';
import { AuditTrailPage } from './pages/AuditTrailPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="new-case" element={<NewScreeningPage />} />
            <Route path="screening/new" element={<NewScreeningPage />} />
            <Route path="cases" element={<ScreeningCasesPage />} />
            <Route path="result/:caseId" element={<ScreeningResultPage />} />
            <Route path="audit" element={<AuditTrailPage />} />
            <Route path="audit/:caseId" element={<AuditTrailPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  );
}

export default App;
