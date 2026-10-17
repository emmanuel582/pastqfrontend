
import { Component, lazy, Suspense, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import ContentSkeleton from './app/components/ContentSkeleton';
import './styles/index.css';

const App = lazy(() => import('./app/App'));
class AppLoadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <main className="study-app library-empty" role="alert"><h1>PastQ couldn’t open.</h1><button className="study-primary" onClick={() => window.location.reload()}>Try again</button></main> : this.props.children;
  }
}
createRoot(document.getElementById('root')!).render(<AppLoadBoundary><Suspense fallback={<ContentSkeleton kind="page" label="Opening PastQ" fullPage />}><App /></Suspense></AppLoadBoundary>);
