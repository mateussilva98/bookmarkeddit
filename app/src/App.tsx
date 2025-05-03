import styles from "./App.module.scss";
import { StoreProvider } from "./hooks/use-store";
import { Navigate, Route, Routes } from "react-router-dom";
import { Home } from "./components/Home";
import { Posts } from "./pages/Posts";
import { LoginCallback } from "./components/LoginCallback";
import { InstallPrompt } from "./components/InstallPrompt";

function App() {
  return (
    <StoreProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login/callback" element={<LoginCallback />} />
        <Route path="/posts" element={<Posts />} />
        <Route path="*" element={<Navigate to={"/"} />} />
      </Routes>
      <InstallPrompt />
    </StoreProvider>
  );
}

export default App;
