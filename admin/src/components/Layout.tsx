import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/disputes', label: 'Disputes', icon: '⚠️' },
  { path: '/traders', label: 'Traders', icon: '👥' },
  { path: '/audit', label: 'Audit Log', icon: '📋' },
];

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '240px',
          background: '#0B0E11',
          color: '#fff',
          padding: '20px 0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '0 20px', marginBottom: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo.png" alt="CyxTrade" style={{ width: '40px', height: '40px' }} />
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#00a78e' }}>
              CyxTrade Admin
            </h1>
          </div>
        </div>

        <nav style={{ flex: 1 }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 20px',
                  color: isActive ? '#fff' : '#9CA3AF',
                  textDecoration: 'none',
                  background: isActive ? 'rgba(0, 167, 142, 0.15)' : 'transparent',
                  borderLeft: isActive ? '3px solid #00a78e' : '3px solid transparent',
                }}
              >
                <span style={{ marginRight: '10px' }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '10px' }}>
            {user?.displayName || user?.phone}
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '8px 16px',
              background: '#f7941d',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, background: '#1E2329', padding: '24px' }}>
        <Outlet />
      </main>
    </div>
  );
}
