import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminLayout from './layout/AdminLayout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Words from './pages/Words';
import Login from './pages/Login';
import CreateWordPack from './pages/CreateWordPack';
import WordPackList from './pages/WordPackList';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route id="protected-routes" element={<ProtectedRoute />}>
            <Route path="/" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="users" element={<Users />} />
              <Route path="words" element={<Words />} />
              <Route path="word-packs" element={<WordPackList />} />
              <Route path="word-packs/create" element={<CreateWordPack />} />
              <Route path="word-packs/edit/:id" element={<CreateWordPack />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
