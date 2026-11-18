import { useEffect, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, Checkbox, FormControlLabel, Chip, CircularProgress,
  Divider, FormControl, InputLabel, MenuItem, Select, Stack, Table,
  TableBody, TableCell, TableHead, TableRow, Typography
} from "@mui/material";
import { Database, FileUp, ShieldCheck, BrainCircuit, RefreshCw, Download } from "lucide-react";
import {
  getDatasets, getDataset, uploadDataset, saveDatasetMapping, validateDataset, predictDataset
} from "../services/api";

const fields = [
  ["type", "Machine type"], ["air_temperature", "Air temperature"],
  ["process_temperature", "Process temperature"], ["rotational_speed", "Rotational speed"],
  ["torque", "Torque"], ["tool_wear", "Tool wear"], ["failure_target", "Failure label (optional)"]
];

export default function DatasetManager() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedData, setSelectedData] = useState(null);
  const [mapping, setMapping] = useState({});
  const [validation, setValidation] = useState(null);
  const [confirmUnits, setConfirmUnits] = useState(false);
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const refresh = async (chooseId) => {
    const data = await getDatasets();
    setItems(data.datasets || []);
    if (chooseId) {
      setSelected(chooseId);
      const detail = await getDataset(chooseId);
      setSelectedData(detail);
    }
  };
  useEffect(() => { refresh().catch(e => setError(e.message)); }, []);

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true); setError(""); setMessage(""); setValidation(null); setReport(null);
    try {
      const result = await uploadDataset(file);
      setMapping(result.dataset.mapping || {}); setConfirmUnits(false);
      setSelectedData(result.dataset);
      await refresh(result.dataset.id);
      setMessage(`Uploaded ${result.dataset.filename} (${result.dataset.rows.toLocaleString()} rows). Review column mapping below.`);
    } catch (e) { setError(e.response?.data?.detail || e.message); }
    finally { setBusy(false); }
  };

  const saveMapping = async () => {
    setBusy(true); setError("");
    try {
      await saveDatasetMapping(selected, mapping, confirmUnits);
      setValidation(null); setReport(null); setMessage("Column mapping saved.");
    } catch (e) { setError(e.response?.data?.detail || e.message); }
    finally { setBusy(false); }
  };
  const validate = async () => {
    setBusy(true); setError(""); setReport(null);
    try {
      const result = await validateDataset(selected);
      setValidation(result);
      setMessage(result.compatible ? "Dataset passed the AI4I schema and unit checks. Domain equivalence still needs validation." : "Validation completed. Resolve the issues below.");
      await refresh(selected);
    } catch (e) { setError(e.response?.data?.detail || e.message); }
    finally { setBusy(false); }
  };
  const runPrediction = async () => {
    setBusy(true); setError("");
    try {
      const result = await predictDataset(selected);
      setReport(result);
      setMessage("Prediction report generated. The report covers up to 5,000 eligible rows.");
    } catch (e) { setError(e.response?.data?.detail || e.message); }
    finally { setBusy(false); }
  };

  const downloadReport = () => {
    if (!report?.results?.length) return;
    const rows = report.results;
    const cols = ["row", "failure_probability", "health_score", "health_status", "TWF", "HDF", "PWF", "OSF", "RNF"];
    const escape = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [cols.map(escape).join(","), ...rows.map(row => cols.map(col =>
      escape(col in (row.failure_modes || {}) ? row.failure_modes[col] : row[col])
    ).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "motormind_dataset_prediction_report.csv"; anchor.click();
    URL.revokeObjectURL(url);
  };

  const current = selectedData || items.find(x => x.id === selected);

  return <Box>
    <Box sx={{mb:3}}>
      <Typography variant="h4" fontWeight={750}>Dataset Manager</Typography>
      <Typography color="text.secondary" sx={{mt:0.7}}>
        Import industrial CSV data, map columns, validate schema and units, and assess compatibility with the pretrained model.
      </Typography>
    </Box>
    <Alert severity="info" sx={{mb:2}}>
      The included model was trained for the AI4I 2020 feature schema and operating domain. Uploading another dataset does not automatically make that model valid for a different machine or sensor system. New domains need appropriately labelled data and separately trained and evaluated models.
    </Alert>
    {error && <Alert severity="error" sx={{mb:2}}>{error}</Alert>}
    {message && <Alert severity="success" sx={{mb:2}}>{message}</Alert>}
    <Card sx={{mb:2}}><CardContent>
      <Stack direction={{xs:"column",sm:"row"}} alignItems={{sm:"center"}} justifyContent="space-between" gap={2}>
        <Box><Stack direction="row" gap={1} alignItems="center"><Database size={20}/><Typography variant="h6" fontWeight={700}>Dataset profiles</Typography></Stack>
          <Typography color="text.secondary" variant="body2">CSV only · maximum 25 MB · 250,000 rows</Typography></Box>
        <Stack direction="row" gap={1}>
          <Button component="label" variant="contained" startIcon={<FileUp size={17}/>} disabled={busy}>
            Upload CSV<input hidden type="file" accept=".csv,text/csv" onChange={upload}/>
          </Button>
          <Button variant="outlined" onClick={()=>refresh().catch(e=>setError(e.message))} startIcon={<RefreshCw size={16}/>} disabled={busy}>Refresh</Button>
        </Stack>
      </Stack>
      <Divider sx={{my:2}}/>
      {items.length===0 ? <Typography color="text.secondary">No uploaded datasets yet. Your default AI4I fleet dataset remains available in Fleet Overview.</Typography> :
        <Stack direction="row" flexWrap="wrap" gap={1}>{items.map(item=><Chip key={item.id} clickable color={selected===item.id?"primary":"default"} variant={selected===item.id?"filled":"outlined"} label={`${item.filename} · ${item.rows.toLocaleString()} rows`} onClick={async()=>{setSelected(item.id);setMapping(item.mapping||{});setConfirmUnits(Boolean(item.units_confirmed_by_user));setValidation(item.validation||null);setReport(null);setError("");try{setSelectedData(await getDataset(item.id));}catch(e){setError(e.message);}}}/>)}</Stack>}
    </CardContent></Card>
    {current && <Card sx={{mb:2}}><CardContent>
      <Typography variant="h6" fontWeight={700}>Column mapping</Typography>
      <Typography color="text.secondary" variant="body2" sx={{mb:2}}>Confirm the detected columns. Units must be Kelvin, RPM, Nm and minutes for the current pretrained model.</Typography>
      <Box sx={{display:"grid",gridTemplateColumns:{xs:"1fr",sm:"1fr 1fr"},gap:2}}>
        {fields.map(([key,label])=><FormControl key={key} size="small" fullWidth>
          <InputLabel>{label}</InputLabel>
          <Select label={label} value={mapping[key]||""} onChange={e=>setMapping(prev=>({...prev,[key]:e.target.value}))}>
            <MenuItem value=""><em>Not mapped</em></MenuItem>
            {current.columns.map(col=><MenuItem key={col} value={col}>{col}</MenuItem>)}
          </Select>
        </FormControl>)}
      </Box>
      <FormControlLabel sx={{mt:1,display:"flex"}} control={<Checkbox checked={confirmUnits} onChange={e=>setConfirmUnits(e.target.checked)} />} label="I confirm that mapped values use Kelvin (K), RPM, Nm and minutes, in that order." />
      <Stack direction="row" gap={1} flexWrap="wrap" sx={{mt:1}}>
        <Button variant="outlined" onClick={saveMapping} disabled={busy}>Save mapping</Button>
        <Button variant="contained" onClick={validate} disabled={busy} startIcon={<ShieldCheck size={17}/>}>Validate compatibility</Button>
        <Button variant="contained" color="success" onClick={runPrediction} disabled={busy || !validation?.compatible} startIcon={<BrainCircuit size={17}/>}>Generate prediction report</Button>
        {busy && <CircularProgress size={24}/>}
      </Stack>
      {validation && <Box sx={{mt:2}}>
        <Chip label={validation.compatible?"Schema-compatible":"Not schema-compatible"} color={validation.compatible?"success":"warning"}/>
        {validation.errors?.map((x,i)=><Alert key={`e${i}`} severity="error" sx={{mt:1}}>{x}</Alert>)}
        {validation.warnings?.map((x,i)=><Alert key={`w${i}`} severity="warning" sx={{mt:1}}>{x}</Alert>)}
      </Box>}
    </CardContent></Card>}
    {current?.preview?.length>0 && <Card sx={{mb:2}}><CardContent>
      <Typography variant="h6" fontWeight={700} sx={{mb:1}}>Data preview</Typography>
      <Box sx={{overflowX:"auto"}}><Table size="small"><TableHead><TableRow>{current.columns.slice(0,8).map(c=><TableCell key={c}>{c}</TableCell>)}</TableRow></TableHead>
        <TableBody>{current.preview.slice(0,5).map((r,i)=><TableRow key={i}>{current.columns.slice(0,8).map(c=><TableCell key={c}>{String(r[c]??"—")}</TableCell>)}</TableRow>)}</TableBody></Table></Box>
    </CardContent></Card>}
    {report && <Card><CardContent>
      <Typography variant="h6" fontWeight={700}>Prediction report</Typography>
      <Typography color="text.secondary" variant="body2" sx={{mb:2}}>AI4I pretrained model estimates · not ground-truth labels</Typography>
      <Stack direction="row" gap={1} flexWrap="wrap">
        <Chip label={`Processed ${report.processed_rows}`}/>
        <Chip color="success" label={`Healthy ${report.summary.healthy}`}/>
        <Chip color="warning" label={`Warning ${report.summary.warning}`}/>
        <Chip color="error" label={`Critical ${report.summary.critical}`}/>
        <Chip label={`Average health ${report.summary.average_health}%`}/>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{mt:2}}>Skipped rows: {report.skipped_rows}. Results are limited to the first 5,000 eligible records per request.</Typography>
      <Button sx={{mt:2}} variant="outlined" startIcon={<Download size={17}/>} onClick={downloadReport}>Download report CSV</Button>
    </CardContent></Card>}
    <Typography variant="caption" color="text.secondary" sx={{display:"block",mt:2}}>
      Uploaded CSV files are stored locally in backend/storage/datasets. Do not upload personal or confidential data unless you are authorized to process it. User-supplied model files (pickle/joblib) are not accepted.
    </Typography>
  </Box>;
}
