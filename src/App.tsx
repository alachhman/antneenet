import { Routes, Route } from 'react-router-dom';
import { AuthGate } from './app/AuthGate';
import { Login } from './app/Login';
import { Dashboard } from './app/Dashboard';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<AuthGate><Dashboard /></AuthGate>} />
    </Routes>
  );
}
