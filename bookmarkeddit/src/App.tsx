import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import styles from "./App.module.scss";
import { StoreProvider } from "./hooks/use-store";
import { Header } from "./components/Header";

function App() {
  const [count, setCount] = useState(0);

  return (
    <StoreProvider>
      <Header />
      <div className={styles.root}>
        <h1>welelele</h1>
      </div>
    </StoreProvider>
  );
}

export default App;
