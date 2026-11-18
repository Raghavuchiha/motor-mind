
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Chip,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";

export default function Topbar({ activePage, backendStatus, onMenuClick }) {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: "#FFFFFF",
        color: "text.primary",
        borderBottom: "1px solid #F0F2F5",
      }}
    >
      <Toolbar sx={{ minHeight: "76px !important" }}>
        <IconButton
          onClick={onMenuClick}
          sx={{ display: { md: "none" }, mr: 1 }}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Pages / {activePage}
          </Typography>
          <Typography variant="h6">{activePage}</Typography>
        </Box>

        <Chip
          size="small"
          label={backendStatus}
          color={backendStatus === "Connected" ? "success" : "warning"}
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />

        <IconButton sx={{ ml: 1 }}>
          <NotificationsNoneRoundedIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
