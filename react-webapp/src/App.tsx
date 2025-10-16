import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SignIn } from "./pages/SignIn";
import { SignUp } from "./pages/SignUp";
import { ActivateAccount } from "./pages/ActivateAccount";
import { Dashboard } from "./pages/Dashboard";

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Navigate to="/sign-up" replace />} />
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/activate-account" element={<ActivateAccount />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/users" element={<Dashboard />} />
            <Route path="/settings" element={<Dashboard />} />
            <Route path="*" element={<Navigate to="/sign-up" replace />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
