import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { TokenProvider } from "./contexts/TokenContext";
import { CartProvider } from "./contexts/CartContext";
import { ProtectedRoute, PublicRoute } from "./components/ProtectedRoute";
import { SignIn } from "./pages/SignIn";
import { SignUp } from "./pages/SignUp";
import { ActivateAccount } from "./pages/ActivateAccount";
import { Dashboard } from "./pages/Dashboard";
import { RagSettings } from "./pages/RagSettings";
import { Users } from "./pages/Users";
import { Cart } from "./pages/Cart";
import "./i18n";

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <TokenProvider>
            <CartProvider>
              <Router>
                <div className="App">
                  <Routes>
                    <Route
                      path="/"
                      element={<Navigate to="/dashboard" replace />}
                    />
                    <Route
                      path="/sign-in"
                      element={
                        <PublicRoute>
                          <SignIn />
                        </PublicRoute>
                      }
                    />
                    <Route
                      path="/sign-up"
                      element={
                        <PublicRoute>
                          <SignUp />
                        </PublicRoute>
                      }
                    />
                    <Route
                      path="/activate-account"
                      element={
                        <PublicRoute>
                          <ActivateAccount />
                        </PublicRoute>
                      }
                    />
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/rag-settings"
                      element={
                        <ProtectedRoute>
                          <RagSettings />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/users"
                      element={
                        <ProtectedRoute>
                          <Users />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/cart"
                      element={
                        <ProtectedRoute>
                          <Cart />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="*"
                      element={<Navigate to="/dashboard" replace />}
                    />
                  </Routes>
                </div>
              </Router>
            </CartProvider>
          </TokenProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
export default App;
