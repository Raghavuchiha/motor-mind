
import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  MenuItem,
  TextField,
  Typography,
  LinearProgress,
  Divider,
} from "@mui/material";
import { Activity, Brain, Gauge, RotateCcw, Zap } from "lucide-react";
import { predictMachine } from "../services/api";

const initialValues = {
  type: "M",
  air_temperature: 298.1,
  process_temperature: 308.6,
  rotational_speed: 1551,
  torque: 42.8,
  tool_wear: 100,
};

export default function MachinePrediction() {
  const [values, setValues] = useState(initialValues);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((previous) => ({
      ...previous,
      [name]:
        name === "type"
          ? value
          : value === ""
            ? ""
            : Number(value),
    }));
  };

  const handleReset = () => {
    setValues(initialValues);
    setResult(null);
    setError("");
  };

  const handlePredict = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      if (values.process_temperature <= values.air_temperature) {
        throw new Error(
          "Process temperature must be greater than air temperature."
        );
      }

      const response = await predictMachine(values);
      setResult(response.prediction);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to generate prediction."
      );
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (status) => {
    if (status === "Healthy") return "success";
    if (status === "Warning") return "warning";
    return "error";
  };

  const fields = [
    {
      name: "air_temperature",
      label: "Air Temperature (K)",
      min: 290,
      max: 310,
    },
    {
      name: "process_temperature",
      label: "Process Temperature (K)",
      min: 300,
      max: 320,
    },
    {
      name: "rotational_speed",
      label: "Rotational Speed (RPM)",
      min: 1000,
      max: 3000,
    },
    {
      name: "torque",
      label: "Torque (Nm)",
      min: 3,
      max: 80,
    },
    {
      name: "tool_wear",
      label: "Tool Wear (Minutes)",
      min: 0,
      max: 300,
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Machine Prediction
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          Analyze machine parameters and predict potential failures using AI.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={5}>
          <Card sx={{ height: "100%", borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Activity size={21} />
                <Typography variant="h6" fontWeight={700}>
                  Machine Parameters
                </Typography>
              </Box>

              <Typography color="text.secondary" variant="body2" mb={3}>
                Enter the operating conditions of the machine.
              </Typography>

              <TextField
                select
                fullWidth
                label="Machine Type"
                name="type"
                value={values.type}
                onChange={handleChange}
                margin="normal"
              >
                <MenuItem value="L">L - Low</MenuItem>
                <MenuItem value="M">M - Medium</MenuItem>
                <MenuItem value="H">H - High</MenuItem>
              </TextField>

              {fields.map((field) => (
                <TextField
                  key={field.name}
                  fullWidth
                  type="number"
                  label={field.label}
                  name={field.name}
                  value={values[field.name]}
                  onChange={handleChange}
                  inputProps={{
                    min: field.min,
                    max: field.max,
                  }}
                  margin="normal"
                />
              ))}

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}

              <Box display="flex" gap={2} mt={3}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handlePredict}
                  disabled={loading}
                  startIcon={
                    loading ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <Brain size={18} />
                    )
                  }
                >
                  {loading ? "Analyzing..." : "Predict Failure"}
                </Button>

                <Button
                  variant="outlined"
                  onClick={handleReset}
                  startIcon={<RotateCcw size={17} />}
                >
                  Reset
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={7}>
          {!result ? (
            <Card
              sx={{
                height: "100%",
                minHeight: 420,
                borderRadius: 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CardContent sx={{ textAlign: "center" }}>
                <Gauge size={55} color="#9e9e9e" />
                <Typography variant="h6" fontWeight={700} mt={2}>
                  Prediction Results
                </Typography>
                <Typography color="text.secondary" mt={1}>
                  Enter machine parameters and click Predict Failure to see
                  the AI analysis.
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Box>
              <Card sx={{ borderRadius: 3, mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    flexWrap="wrap"
                    gap={2}
                  >
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        Machine Health Status
                      </Typography>
                      <Typography variant="h4" fontWeight={700} mt={0.5}>
                        {result.health_status}
                      </Typography>
                    </Box>
                    <Chip
                      label={result.health_status}
                      color={statusColor(result.health_status)}
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>

                  <Divider sx={{ my: 3 }} />

                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <Typography color="text.secondary" variant="body2">
                        Health Score
                      </Typography>
                      <Typography variant="h3" fontWeight={700}>
                        {Number(result.health_score).toFixed(2)}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={Math.max(
                          0,
                          Math.min(100, Number(result.health_score))
                        )}
                        color={statusColor(result.health_status)}
                        sx={{ height: 9, borderRadius: 5, mt: 1 }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography color="text.secondary" variant="body2">
                        Failure Probability
                      </Typography>
                      <Typography variant="h3" fontWeight={700}>
                        {Number(result.failure_probability).toFixed(2)}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={Math.max(
                          0,
                          Math.min(100, Number(result.failure_probability))
                        )}
                        color="error"
                        sx={{ height: 9, borderRadius: 5, mt: 1 }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Card sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Zap size={21} />
                    <Typography variant="h6" fontWeight={700}>
                      Failure Mode Analysis
                    </Typography>
                  </Box>

                  <Typography color="text.secondary" variant="body2" mb={3}>
                    Estimated probability for each machine failure mode.
                  </Typography>

                  {Object.entries(result.failure_modes || {}).map(
                    ([mode, probability]) => (
                      <Box key={mode} mb={2}>
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          mb={0.7}
                        >
                          <Typography fontWeight={600}>{mode}</Typography>
                          <Typography fontWeight={600}>
                            {Number(probability).toFixed(2)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.max(
                            0,
                            Math.min(100, Number(probability))
                          )}
                          sx={{ height: 9, borderRadius: 5 }}
                        />
                      </Box>
                    )
                  )}
                </CardContent>
              </Card>
            </Box>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
