
import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  ThemeProvider,
  CssBaseline,
} from "@mui/material";

import DashboardLayout from "./components/layout/DashboardLayout";

import FleetOverview from "./pages/FleetOverview";
import MachinePrediction from "./pages/MachinePrediction";
import DatasetManager from "./pages/DatasetManager";
import DigitalTwin from "./pages/DigitalTwin";
import WhatIfSimulator from "./pages/WhatIfSimulator";

import theme from "./theme/theme";
import { checkBackend, getModelStatus } from "./services/api";

function App() {
  const [activePage, setActivePage] = useState("Fleet Overview");
  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function connectBackend() {
      try {
        const backend = await checkBackend();
        const modelData = await getModelStatus();

        setBackendStatus(
          backend.status === "Running" ? "Connected" : "Unavailable"
        );

        setModels(modelData.models || []);
      } catch (error) {
        console.error("Backend connection error:", error);
        setBackendStatus("Disconnected");
      } finally {
        setLoading(false);
      }
    }

    connectBackend();
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case "Fleet Overview":
        return (
          <FleetOverview
            backendStatus={backendStatus}
            models={models}
          />
        );

      case "Machine Prediction":
        return <MachinePrediction />;
      case "Dataset Manager":
        return <DatasetManager />;
      case "Digital Twin":
        return <DigitalTwin />;
      case "What-If Simulator":
        return <WhatIfSimulator />;

      default:
        return <FleetOverview backendStatus={backendStatus} models={models} />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {loading ? (
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <CircularProgress />

          <Typography color="text.secondary">
            Connecting to MotorMind AI...
          </Typography>
        </Box>
      ) : (
        <DashboardLayout
          activePage={activePage}
          onNavigate={setActivePage}
          backendStatus={backendStatus}
        >
          {renderPage()}
        </DashboardLayout>
      )}
    </ThemeProvider>
  );
}

export default App;
