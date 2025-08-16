import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAccountContext } from '../context/AccountContext.jsx';
import { useState } from 'react';

const Layout = () => {
  const { account, disconnect } = useAccountContext();
  const isAdmin = account?.isAdmin;
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

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
          {/* Desktop navigation */}
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
          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              aria-label="Toggle menu"
              onClick={() => setMobileOpen((v) => !v)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <svg className={`h-6 w-6 ${mobileOpen ? 'hidden' : 'block'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
              </svg>
              <svg className={`h-6 w-6 ${mobileOpen ? 'block' : 'hidden'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
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
              </>
            )}
          </div>
        </nav>
        {/* Mobile menu panel */}
        <div className={`md:hidden ${mobileOpen ? 'block' : 'hidden'} border-t border-gray-200 bg-white`}>
          <div className="px-6 py-3 space-y-2">
            {account ? (
              <NavLink onClick={() => setMobileOpen(false)} to="/dashboard" className={({ isActive }) => `block py-2 text-gray-700 ${isActive ? 'text-blue-600 font-semibold' : ''}`}>Dashboard</NavLink>
            ) : (
              <NavLink onClick={() => setMobileOpen(false)} to="/" className={({ isActive }) => `block py-2 text-gray-700 ${isActive ? 'text-blue-600 font-semibold' : ''}`}>Home</NavLink>
            )}
            {account && (
              <>
                <NavLink onClick={() => setMobileOpen(false)} to="/polls" className={({ isActive }) => `block py-2 text-gray-700 ${isActive ? 'text-blue-600 font-semibold' : ''}`}>Polls</NavLink>
                <NavLink onClick={() => setMobileOpen(false)} to="/history" className={({ isActive }) => `block py-2 text-gray-700 ${isActive ? 'text-blue-600 font-semibold' : ''}`}>My Votes</NavLink>
                <NavLink onClick={() => setMobileOpen(false)} to="/results" className={({ isActive }) => `block py-2 text-gray-700 ${isActive ? 'text-blue-600 font-semibold' : ''}`}>Results</NavLink>
                {isAdmin && (
                  <NavLink onClick={() => setMobileOpen(false)} to="/admin/dashboard" className={({ isActive }) => `block py-2 text-gray-700 ${isActive ? 'text-blue-600 font-semibold' : ''}`}>Admin</NavLink>
                )}
              </>
            )}
          </div>
        </div>
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
