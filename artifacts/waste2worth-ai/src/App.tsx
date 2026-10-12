import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BiomassProvider } from '@/lib/biomass-state';
import { TransactionProvider } from '@/lib/transaction-state';
import { JourneyProvider } from '@/lib/journey-state';
import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import Scan from '@/pages/scan';
import Market from '@/pages/market';
import Reports from '@/pages/reports';
import ProfilePage from '@/pages/profile';
import Impact from '@/pages/impact';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/scan" component={Scan} />
        <Route path="/analyze" component={Scan} />
        <Route path="/market" component={Market} />
        <Route path="/exchange" component={Market} />
        <Route path="/reports" component={Reports} />
        <Route path="/impact" component={Reports} />
        <Route path="/reports/legacy" component={Impact} />
        <Route path="/profile" component={ProfilePage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BiomassProvider>
          <TransactionProvider>
          <JourneyProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          </JourneyProvider>
          </TransactionProvider>
        </BiomassProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
