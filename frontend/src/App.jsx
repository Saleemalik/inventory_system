
// src/App.jsx
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layout/AppLayout";
import GlobalLoader from "./components/GlobalLoader";

export default function App() {
  return (
    <Router>
      {/* <GlobalLoader /> */}
      <Routes>
        <Route path="/" element={<Login />} />
      

        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
        </Route>
      </Routes>
      
    </Router>
  );
}
