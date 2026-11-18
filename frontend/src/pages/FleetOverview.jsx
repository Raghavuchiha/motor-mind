
import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Download,
  Factory,
  Gauge,
  RefreshCw,
  Search,
} from "lucide-react";


import { getFleetOverview } from "../services/api";


const chartColors = {
  Healthy: "#2E9D67",
  Warning: "#EDAA35",
  Critical: "#DC5353",
};


function StatCard({ title, value, subtitle, icon, color }) {
  const Icon = icon;

  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        border: "1px solid #E8EDF3",
        borderRadius: 3,
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography color="text.secondary" fontSize={13} fontWeight={600}>
            {title}
          </Typography>

          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2,
              bgcolor: `${color}15`,
              color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={21} />
          </Box>
        </Box>

        <Typography variant="h4" fontWeight={750} sx={{ mt: 2 }}>
          {value}
        </Typography>

        <Typography color="text.secondary" fontSize={12} sx={{ mt: 0.5 }}>
          {subtitle}
        </Typography>
      </CardContent>
    </Card>
  );
}


function statusColor(status) {
  if (status === "Healthy") return "success";
  if (status === "Warning") return "warning";
  if (status === "Critical") return "error";
  return "default";
}


function downloadCSV(records) {
  if (!records || records.length === 0) return;

  const columns = Object.keys(records[0]);

  const escapeValue = (value) => {
    const text = value === null || value === undefined
      ? ""
      : String(value);

    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv = [
    columns.map(escapeValue).join(","),
    ...records.map((record) =>
      columns.map((column) => escapeValue(record[column])).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "motormind_fleet_report.csv";
  link.click();

  URL.revokeObjectURL(url);
}


export default function FleetOverview() {
  const [fleet, setFleet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const loadFleet = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getFleetOverview();
      setFleet(response);
    } catch (err) {
      console.error("Fleet overview error:", err);
      setError(
        err.response?.data?.detail ||
        "Unable to load fleet data. Check the backend connection."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFleet();
  }, []);

  const records = fleet?.records || [];
  const summary = fleet?.summary;

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      const matchesStatus =
        statusFilter === "All" ||
        record["Health status"] === statusFilter;

      const matchesSearch =
        !query ||
        Object.values(record).some((value) =>
          String(value ?? "").toLowerCase().includes(query)
        );

      return matchesStatus && matchesSearch;
    });
  }, [records, search, statusFilter]);

  const visibleRecords = filteredRecords.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 400,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography color="text.secondary">
          Loading fleet intelligence...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          startIcon={<RefreshCw size={17} />}
          onClick={loadFleet}
        >
          Retry
        </Button>
      </Box>
    );
  }

  const chartData = fleet?.distribution || [];

  return (
    <Box>
      {/* Page heading */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={750}>
            Fleet Overview
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.7 }}>
            Monitor machine health and predictive maintenance insights.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshCw size={17} />}
          onClick={loadFleet}
        >
          Refresh Data
        </Button>
      </Box>

      {/* KPI cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <StatCard
          title="Total Machines"
          value={summary.total_machines.toLocaleString()}
          subtitle="Machines in the fleet dataset"
          icon={Factory}
          color="#2878D0"
        />

        <StatCard
          title="Healthy Machines"
          value={summary.healthy.toLocaleString()}
          subtitle="Currently classified as healthy"
          icon={CheckCircle2}
          color={chartColors.Healthy}
        />

        <StatCard
          title="Warning Machines"
          value={summary.warning.toLocaleString()}
          subtitle="Require closer monitoring"
          icon={AlertTriangle}
          color={chartColors.Warning}
        />

        <StatCard
          title="Average Health"
          value={`${summary.average_health.toFixed(1)}%`}
          subtitle={`${summary.critical} critical machines`}
          icon={Gauge}
          color="#7656C8"
        />
      </Box>

      {/* Charts and health summary */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "1.2fr 0.8fr",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Card
          elevation={0}
          sx={{
            border: "1px solid #E8EDF3",
            borderRadius: 3,
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="h6" fontWeight={700}>
              Machine Health Distribution
            </Typography>

            <Typography color="text.secondary" fontSize={13}>
              Classification across all fleet records
            </Typography>

            <Box sx={{ mt: 3 }}>
              {chartData.map((item) => {
                const percentage = summary.total_machines > 0
                  ? (item.value / summary.total_machines) * 100 : 0;
                return (
                  <Box key={item.name} sx={{ mb: 2.5 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.7 }}>
                      <Typography fontWeight={600}>{item.name}</Typography>
                      <Typography fontWeight={700}>{item.value.toLocaleString()} · {percentage.toFixed(1)}%</Typography>
                    </Box>
                    <Box sx={{ height: 13, borderRadius: 8, bgcolor: "#EEF1F5", overflow: "hidden" }}>
                      <Box sx={{ height: "100%", width: `${percentage}%`, bgcolor: chartColors[item.name] || "#999999", borderRadius: 8 }} />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </CardContent>
        </Card>

        <Card
          elevation={0}
          sx={{
            border: "1px solid #E8EDF3",
            borderRadius: 3,
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="h6" fontWeight={700}>
              Fleet Health Summary
            </Typography>

            <Typography color="text.secondary" fontSize={13}>
              Breakdown by machine condition
            </Typography>

            <Box sx={{ mt: 3 }}>
              {chartData.map((item) => {
                const percentage =
                  summary.total_machines > 0
                    ? (item.value / summary.total_machines) * 100
                    : 0;

                return (
                  <Box key={item.name} sx={{ mb: 3 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 1,
                      }}
                    >
                      <Typography fontWeight={600}>
                        {item.name}
                      </Typography>

                      <Typography fontWeight={700}>
                        {item.value.toLocaleString()} ({percentage.toFixed(1)}%)
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        height: 10,
                        borderRadius: 5,
                        bgcolor: "#EEF1F5",
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        sx={{
                          height: "100%",
                          width: `${percentage}%`,
                          bgcolor: chartColors[item.name] || "#999999",
                          borderRadius: 5,
                        }}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Activity size={18} color="#2878D0" />
              <Typography color="text.secondary" fontSize={13}>
                Health scores are model-derived estimates.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Machine records */}
      <Card
        elevation={0}
        sx={{
          border: "1px solid #E8EDF3",
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              mb: 2,
            }}
          >
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Machine Records
              </Typography>

              <Typography color="text.secondary" fontSize={13}>
                Search and inspect individual machine records
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<Download size={17} />}
              onClick={() => downloadCSV(filteredRecords)}
              disabled={filteredRecords.length === 0}
            >
              Export CSV
            </Button>
          </Box>

          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexWrap: "wrap",
              mb: 2,
            }}
          >
            <TextField
              size="small"
              placeholder="Search machine records..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              sx={{ flex: 1, minWidth: 220 }}
              InputProps={{
                startAdornment: (
                  <Box sx={{ display: "flex", mr: 1, color: "text.secondary" }}>
                    <Search size={17} />
                  </Box>
                ),
              }}
            />

            <TextField
              select
              size="small"
              label="Health Status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(0);
              }}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="All">All Statuses</MenuItem>
              <MenuItem value="Healthy">Healthy</MenuItem>
              <MenuItem value="Warning">Warning</MenuItem>
              <MenuItem value="Critical">Critical</MenuItem>
            </TextField>
          </Box>

          <TableContainer component={Paper} elevation={0}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#F7F9FC" }}>
                  <TableCell><b>Machine Type</b></TableCell>
                  <TableCell align="right"><b>RPM</b></TableCell>
                  <TableCell align="right"><b>Torque (Nm)</b></TableCell>
                  <TableCell align="right"><b>Tool Wear</b></TableCell>
                  <TableCell align="right"><b>Failure Probability</b></TableCell>
                  <TableCell align="right"><b>Health Score</b></TableCell>
                  <TableCell><b>Status</b></TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {visibleRecords.map((record, index) => (
                  <TableRow hover key={`${page}-${index}`}>
                    <TableCell>
                      <Chip
                        label={record.Type || "N/A"}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>

                    <TableCell align="right">
                      {Number(record["Rotational speed [rpm]"]).toLocaleString()}
                    </TableCell>

                    <TableCell align="right">
                      {Number(record["Torque [Nm]"]).toFixed(1)}
                    </TableCell>

                    <TableCell align="right">
                      {record["Tool wear [min]"]}
                    </TableCell>

                    <TableCell align="right">
                      {record["Failure probability"] != null
                        ? `${(Number(record["Failure probability"]) * 100).toFixed(1)}%`
                        : "N/A"}
                    </TableCell>

                    <TableCell align="right">
                      {record["Health score"] != null
                        ? `${Number(record["Health score"]).toFixed(1)}%`
                        : "N/A"}
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={record["Health status"] || "Unknown"}
                        color={statusColor(record["Health status"])}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}

                {visibleRecords.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      No machine records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredRecords.length}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50]}
          />
        </CardContent>
      </Card>

      <Typography
        color="text.secondary"
        fontSize={12}
        sx={{ mt: 2, textAlign: "center" }}
      >
        MotorMind AI · Fleet analytics based on the available dataset.
        Predictions are decision-support estimates, not safety certification.
      </Typography>
    </Box>
  );
}
