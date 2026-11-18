
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976D2",
      light: "#E3F2FD",
      dark: "#1259A7",
    },
    secondary: {
      main: "#64748B",
    },
    success: {
      main: "#2E7D32",
      light: "#E8F5E9",
    },
    warning: {
      main: "#ED9C00",
      light: "#FFF4D6",
    },
    error: {
      main: "#D32F2F",
      light: "#FDECEA",
    },
    background: {
      default: "#F8F9FA",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#344767",
      secondary: "#7B809A",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid #F0F2F5",
          boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
        },
      },
    },
  },
});

export default theme;
