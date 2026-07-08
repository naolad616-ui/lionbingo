import { Routes, Route, Navigate } from 'react-router-dom';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Profile from '../pages/Profile';
import Bingo from '../pages/Bingo';
import BingoCaller from '../pages/BingoCaller';
import CardRegistry from '../pages/CardRegistry';
import WinnerVerification from '../pages/WinnerVerification';
import Settings from '../pages/Settings';
import NavCollect from '../pages/nav/NavCollect';
import Sales from '../pages/Sales';
import NavBalance from '../pages/nav/NavBalance';
import SidebarSetting from '../pages/nav/NavSetting';
import NavCommision from '../pages/nav/NavCommision';
import NavSalesReport from '../pages/nav/NavSalesReport';
import ProtectedRoute from './ProtectedRoute';
import AdminProtectedRoute from './AdminProtectedRoute';
import AdminLayout from '../layouts/AdminLayout';
import AdminLogin from '../pages/admin/AdminLogin';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminCommission from '../pages/admin/AdminCommission';
import AdminReports from '../pages/admin/AdminReports';
import AdminSecurity from '../pages/admin/AdminSecurity';
import AdminManagement from '../pages/admin/AdminManagement';
import AdminSettings from '../pages/admin/AdminSettings';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/admin/login" element={<AdminLogin />} />
      <Route element={<AdminProtectedRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route element={<AdminProtectedRoute permission="commission" />}>
            <Route path="commission" element={<AdminCommission />} />
          </Route>
          <Route element={<AdminProtectedRoute permission="reports" />}>
            <Route path="reports" element={<AdminReports />} />
          </Route>
          <Route element={<AdminProtectedRoute permission="security" />}>
            <Route path="security" element={<AdminSecurity />} />
          </Route>
          <Route element={<AdminProtectedRoute permission="admin_management" />}>
            <Route path="admins" element={<AdminManagement />} />
          </Route>
          <Route element={<AdminProtectedRoute permission="settings" />}>
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route index element={<Home />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
        <Route path="bingo" element={<Bingo />} />
        <Route path="collect" element={<NavCollect />} />
        <Route path="sales" element={<Sales />} />
        <Route path="balance" element={<NavBalance />} />
        <Route path="setting" element={<SidebarSetting />} />
        <Route path="commision" element={<NavCommision />} />
        <Route path="sales-report" element={<NavSalesReport />} />
        <Route path="caller" element={<BingoCaller />} />
        <Route path="cards" element={<CardRegistry />} />
        <Route path="winner" element={<WinnerVerification />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
