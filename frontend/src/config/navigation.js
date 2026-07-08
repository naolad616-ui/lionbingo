import {
  BalanceIcon,
  BingoIcon,
  CollectIcon,
  CommissionIcon,
  DashboardIcon,
  SalesIcon,
  SalesReportIcon,
  SettingIcon,
} from '../components/icons/NavIcons';

export const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: DashboardIcon,
    end: true,
  },
  {
    id: 'bingo',
    label: 'Bingo',
    path: '/bingo',
    icon: BingoIcon,
  },
  {
    id: 'collect',
    label: 'collect',
    path: '/collect',
    icon: CollectIcon,
  },
  {
    id: 'sales',
    label: 'Sales',
    path: '/sales',
    icon: SalesIcon,
  },
  {
    id: 'balance',
    label: 'Balance',
    path: '/balance',
    icon: BalanceIcon,
  },
  {
    id: 'setting',
    label: 'Setting',
    path: '/setting',
    icon: SettingIcon,
  },
  {
    id: 'commision',
    label: 'Commision',
    path: '/commision',
    icon: CommissionIcon,
  },
  {
    id: 'sales-report',
    label: 'Sales Report',
    path: '/sales-report',
    icon: SalesReportIcon,
  },
  {
    id: 'admin-panel',
    label: 'Admin Panel',
    path: '/admin',
    icon: SettingIcon,
  },
];
