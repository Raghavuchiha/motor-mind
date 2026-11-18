
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
} from "@mui/material";

import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import PrecisionManufacturingRoundedIcon from "@mui/icons-material/PrecisionManufacturingRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import ThreeDRotationRoundedIcon from "@mui/icons-material/ThreeDRotationRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";

const drawerWidth = 260;

const menuItems = [
  { label: "Fleet Overview", icon: <DashboardRoundedIcon /> },
  { label: "Machine Prediction", icon: <PrecisionManufacturingRoundedIcon /> },
  { label: "Dataset Manager", icon: <StorageRoundedIcon /> },
  { label: "Digital Twin", icon: <ThreeDRotationRoundedIcon /> },
  { label: "What-If Simulator", icon: <TuneRoundedIcon /> },
];

export default function Sidebar({ activePage, onNavigate, mobileOpen, onClose }) {
  const content = (
    <Box sx={{ height: "100%", bgcolor: "#fff" }}>
      <Box sx={{ px: 3, py: 3 }}>
        <Typography variant="h5" color="primary" fontWeight={800}>
          MotorMind AI
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Predictive Maintenance Platform
        </Typography>
      </Box>

      <Divider sx={{ mx: 2 }} />

      <Typography
        sx={{ px: 3, pt: 3, pb: 1, fontSize: 11, fontWeight: 700,
          color: "text.secondary", letterSpacing: 1 }}
      >
        MAIN MENU
      </Typography>

      <List sx={{ px: 1.5 }}>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.label}
            selected={activePage === item.label}
            onClick={() => {
              onNavigate(item.label);
              onClose?.();
            }}
            sx={{
              borderRadius: 2,
              mb: 0.7,
              py: 1.2,
              "&.Mui-selected": {
                bgcolor: "#E3F2FD",
                color: "primary.main",
              },
              "&.Mui-selected .MuiListItemIcon-root": {
                color: "primary.main",
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 42, color: "text.secondary" }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }}
            />
          </ListItemButton>
        ))}
      </List>

      <Box sx={{ position: "absolute", bottom: 20, px: 3 }}>
        <Typography variant="caption" color="text.secondary">
          MotorMind AI · Version 2.0
        </Typography>
      </Box>
    </Box>
  );

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: "1px solid #F0F2F5",
          },
        }}
      >
        {content}
      </Drawer>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { width: drawerWidth },
        }}
      >
        {content}
      </Drawer>
    </>
  );
}
