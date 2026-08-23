import { AppProviders } from './providers/AppProviders';
import { AppRouter } from './router';

export const App = () => (
  <AppProviders>
    <AppRouter />
  </AppProviders>
);

export default App;
