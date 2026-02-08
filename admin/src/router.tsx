import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DisputeListPage } from './pages/DisputeListPage';
import { DisputeDetailPage } from './pages/DisputeDetailPage';
import { TraderListPage } from './pages/TraderListPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'disputes',
        element: <DisputeListPage />,
      },
      {
        path: 'disputes/:id',
        element: <DisputeDetailPage />,
      },
      {
        path: 'traders',
        element: <TraderListPage />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
