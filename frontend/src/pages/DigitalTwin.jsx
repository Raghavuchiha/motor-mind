import { useState } from "react";
import { Alert, Box, Button, Card, CardContent, Chip, Grid, LinearProgress, MenuItem, TextField, Typography } from "@mui/material";
import { Activity, RotateCcw, Zap } from "lucide-react";
import { predictMachine } from "../services/api";

const defaults={type:"M",air_temperature:298.1,process_temperature:308.6,rotational_speed:1551,torque:42.8,tool_wear:100};
export default function DigitalTwin(){
 const [v,setV]=useState(defaults),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const change=e=>setV(p=>({...p,[e.target.name]:e.target.name==="type"?e.target.value:Number(e.target.value)}));
 const run=async()=>{setBusy(true);setError("");try{const r=await predictMachine(v);setResult(r.prediction);}catch(e){setError(e.response?.data?.detail||e.message);}finally{setBusy(false);}};
 const status=result?.health_status;
 return <Box><Typography variant="h4" fontWeight={750}>Digital Twin</Typography>
 <Typography color="text.secondary" sx={{mt:.7,mb:3}}>Interactive software representation of a machine operating state, connected to the MotorMind AI prediction service.</Typography>
 <Alert severity="info" sx={{mb:2}}>Prototype scope: this is a parameter-driven software twin, not a physics-based motor simulation or live industrial telemetry connection.</Alert>
 <Grid container spacing={2}>
  <Grid item xs={12} md={6}><Card sx={{height:"100%"}}><CardContent>
   <Typography variant="h6" fontWeight={700}>Motor representation</Typography>
   <Box sx={{my:3,display:"flex",justifyContent:"center"}}>
    <svg viewBox="0 0 520 250" width="100%" role="img" aria-label="Illustration of an industrial electric motor">
     <defs><linearGradient id="motorBody" x1="0" x2="1"><stop stopColor="#7893AD"/><stop offset=".5" stopColor="#D8E2EB"/><stop offset="1" stopColor="#7893AD"/></linearGradient></defs>
     <rect x="65" y="65" width="330" height="125" rx="20" fill="url(#motorBody)" stroke="#42617E" strokeWidth="4"/>
     <rect x="90" y="48" width="180" height="24" rx="7" fill="#718CA5" stroke="#42617E" strokeWidth="3"/>
     {Array.from({length:9},(_,i)=><path key={i} d={`M ${105+i*29} 75 v105`} stroke="#718CA5" strokeWidth="7" opacity=".8"/>)}
     <rect x="395" y="105" width="72" height="44" rx="8" fill="#9FB3C6" stroke="#42617E" strokeWidth="4"/>
     <rect x="462" y="119" width="38" height="16" rx="3" fill="#647E98"/>
     <path d="M125 190 v20 h-30 v-20 M330 190 v20 h-30 v-20" fill="#718CA5" stroke="#42617E" strokeWidth="4"/>
     <circle cx="225" cy="128" r="33" fill="#EAF1F7" stroke="#42617E" strokeWidth="4"/>
     <path d="M225 102 v52 M199 128 h52" stroke="#42617E" strokeWidth="7" strokeLinecap="round"/>
     <text x="230" y="238" textAnchor="middle" fill="#52677B" fontSize="15" fontWeight="bold">INDUSTRIAL MOTOR · MODEL VIEW</text>
    </svg>
   </Box>
   <Chip label="Software twin · simulated inputs" color="info" variant="outlined"/>
   <Typography color="text.secondary" variant="body2" sx={{mt:2}}>Change the operating parameters and request an updated AI health estimate. No physical motor is controlled.</Typography>
  </CardContent></Card></Grid>
  <Grid item xs={12} md={6}><Card><CardContent>
   <Typography variant="h6" fontWeight={700} sx={{mb:2}}>Operating parameters</Typography>
   <TextField select fullWidth label="Machine type" name="type" value={v.type} onChange={change} sx={{mb:2}}>{["L","M","H"].map(x=><MenuItem key={x} value={x}>{x}</MenuItem>)}</TextField>
   {[["air_temperature","Air temperature (K)",290,310],["process_temperature","Process temperature (K)",300,320],["rotational_speed","Rotational speed (RPM)",1000,3000],["torque","Torque (Nm)",3,80],["tool_wear","Tool wear (min)",0,300]].map(([name,label,min,max])=><TextField key={name} type="number" fullWidth label={label} name={name} value={v[name]} onChange={change} inputProps={{min,max}} sx={{mb:2}}/>)}
   {error&&<Alert severity="error" sx={{mb:2}}>{error}</Alert>}
   <Button variant="contained" fullWidth onClick={run} disabled={busy} startIcon={<Activity size={17}/>}>{busy?"Evaluating...":"Update twin state"}</Button>
  </CardContent></Card></Grid>
 </Grid>
 {result&&<Card sx={{mt:2}}><CardContent><Typography variant="h6" fontWeight={700}>AI condition estimate</Typography><Grid container spacing={3} sx={{mt:1}}>
  <Grid item xs={12} sm={4}><Typography color="text.secondary">Health status</Typography><Typography variant="h5" fontWeight={700}>{status}</Typography><Chip label={status} color={status==="Healthy"?"success":status==="Warning"?"warning":"error"}/></Grid>
  <Grid item xs={12} sm={4}><Typography color="text.secondary">Health score</Typography><Typography variant="h5" fontWeight={700}>{result.health_score}%</Typography><LinearProgress sx={{mt:1}} variant="determinate" value={result.health_score}/></Grid>
  <Grid item xs={12} sm={4}><Typography color="text.secondary">Failure probability</Typography><Typography variant="h5" fontWeight={700}>{result.failure_probability}%</Typography><LinearProgress color="error" sx={{mt:1}} variant="determinate" value={result.failure_probability}/></Grid>
 </Grid></CardContent></Card>}
 </Box>;
}
