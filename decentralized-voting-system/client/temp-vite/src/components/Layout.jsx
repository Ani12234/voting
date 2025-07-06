import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAccountContext } from '../context/AccountContext.jsx';

const Layout = () => {
  const { account, disconnect } = useAccountContext();
  const isAdmin = account?.isAdmin;
  const navigate = useNavigate();

  const handleLogout = () => {
    disconnect();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-md sticky top-0 z-50">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-gray-800">
            <NavLink to="/">D-Vote</NavLink>
          </div>
          <div className="hidden md:flex items-center space-x-6">
                        {account ? (
              <NavLink to="/dashboard" className={({ isActive }) => `text-gray-600 hover:text-blue-500 ${isActive ? 'text-blue-500' : ''}`}>Dashboard</NavLink>
            ) : (
              <NavLink to="/" className={({ isActive }) => `text-gray-600 hover:text-blue-500 ${isActive ? 'text-blue-500' : ''}`}>Home</NavLink>
            )}
            {account && (
              <>
                <NavLink to="/polls" className={({ isActive }) => `text-gray-600 hover:text-blue-500 ${isActive ? 'text-blue-500' : ''}`}>Polls</NavLink>
                <NavLink to="/history" className={({ isActive }) => `text-gray-600 hover:text-blue-500 ${isActive ? 'text-blue-500' : ''}`}>My Votes</NavLink>
                <NavLink to="/results" className={({ isActive }) => `text-gray-600 hover:text-blue-500 ${isActive ? 'text-blue-500' : ''}`}>Results</NavLink>
                {isAdmin && (
                  <NavLink to="/admin/dashboard" className={({ isActive }) => `text-gray-600 hover:text-blue-500 ${isActive ? 'text-blue-500' : ''}`}>Admin</NavLink>
                )}
              </>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {account ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-700 bg-gray-200 px-3 py-1 rounded-full">
                  {account.address ? `${account.address.substring(0, 6)}...${account.address.substring(account.address.length - 4)}` : 'Admin'}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm font-medium"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-medium">
                  Login
                </button>
                <button onClick={() => navigate('/register')} className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm font-medium">
                  Register
                </button>
              </>
            )}
          </div>
        </nav>
      </header>
      <main className="container mx-auto p-6">
        <Outlet />
      </main>
      <footer className="bg-gray-800 mt-auto">
        <div className="container mx-auto py-4 px-6">
          <p className="text-center text-sm text-gray-400">
            © {new Date().getFullYear()} Decentralized Voting Platform. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
