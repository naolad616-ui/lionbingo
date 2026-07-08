import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { SidebarProvider } from './context/SidebarContext';
import { UserProvider } from './context/UserContext';
import GameSalesTrackingInit from './components/sales/GameSalesTrackingInit';
import AppRouter from './routes/AppRouter';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AdminAuthProvider>
            <UserProvider>
              <SidebarProvider>
                <GameSalesTrackingInit />
                <AppRouter />
              </SidebarProvider>
            </UserProvider>
          </AdminAuthProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
