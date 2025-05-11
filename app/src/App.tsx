/**
 * Main application component for Bookmarkeddit
 * Handles routing and provides global state through StoreProvider
 */
import { StoreProvider } from "./hooks/use-store";
import { Navigate, Route, Routes } from "react-router-dom";
import { Home } from "./pages/Home";
import { Posts } from "./pages/Posts";
import { LoginCallback } from "./components/LoginCallback";

/**
 * App component defines the main application routes
 * - / => Home page (landing page)
 * - /login/callback => OAuth callback handler
 * - /posts => Main posts display page (requires authentication)
 * - * => Redirect to home for any undefined routes
 */
function App() {
  return (
    <StoreProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login/callback" element={<LoginCallback />} />
        <Route path="/posts" element={<Posts />} />
        <Route path="*" element={<Navigate to={"/"} />} />
      </Routes>
    </StoreProvider>
  );
}

export default App;
