import { useState } from "react";
import { Alert, Box, Button, Card, CardContent, Chip, Grid, MenuItem, TextField, Typography } from "@mui/material";
import { ArrowLeftRight, Play } from "lucide-react";
import { predictMachine } from "../services/api";
const initial={type:"M",air_temperature:298.1,process_temperature:308.6,rotational_speed:1551,torque:42.8,tool_wear:100};
export default function WhatIfSimulator(){
 const [base,setBase]=useState(initial),[test,setTest]=useState({...initial,tool_wear:150,torque:45}),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const update=(setter)=>(e)=>setter(p=>({...p,[e.target.name]:e.target.name==="type"?e.target.value:Number(e.target.value)}));
 const compare=async()=>{setBusy(true);setError("");try{const [a,b]=await Promise.all([predictMachine(base),predictMachine(test)]);setResult({baseline:a.prediction,scenario:b.prediction});}catch(e){setError(e.response?.data?.detail||e.message);}finally{setBusy(false);}};
 const editor=(title,value,onChange)=><Card sx={{height:"100%"}}><CardContent><Typography variant="h6" fontWeight={700} sx={{mb:2}}>{title}</Typography>
 <TextField select fullWidth label="Machine type" name="type" value={value.type} onChange={onChange} sx={{mb:2}}>{["L","M","H"].map(x=><MenuItem key={x} value={x}>{x}</MenuItem>)}</TextField>
 {[["air_temperature","Air temperature (K)",290,310],["process_temperature","Process temperature (K)",300,320],["rotational_speed","Speed (RPM)",1000,3000],["torque","Torque (Nm)",3,80],["tool_wear","Tool wear (min)",0,300]].map(([name,label,min,max])=><TextField key={name} fullWidth type="number" label={label} name={name} value={value[name]} onChange={onChange} inputProps={{min,max}} sx={{mb:2}}/>)}
 </CardContent></Card>;
 const delta=result?result.scenario.failure_probability-result.baseline.failure_probability:0;
 return <Box><Typography variant="h4" fontWeight={750}>What-If Simulator</Typography><Typography color="text.secondary" sx={{mt:.7,mb:3}}>Compare baseline operating conditions with a proposed scenario using the same predictive model.</Typography>
 <Alert severity="warning" sx={{mb:2}}>Scenario outputs are model estimates, not proof that a physical intervention will reduce risk. Validate proposed operating changes with qualified engineering review.</Alert>
 <Grid container spacing={2}><Grid item xs={12} md={6}>{editor("Baseline conditions",base,update(setBase))}</Grid><Grid item xs={12} md={6}>{editor("Proposed scenario",test,update(setTest))}</Grid></Grid>
 {error&&<Alert severity="error" sx={{mt:2}}>{error}</Alert>}
 <Button sx={{mt:2}} variant="contained" onClick={compare} disabled={busy} startIcon={<Play size={17}/>}>{busy?"Comparing...":"Compare scenarios"}</Button>
 {result&&<Card sx={{mt:2}}><CardContent><Typography variant="h6" fontWeight={700} sx={{mb:2}}>Scenario comparison</Typography><Grid container spacing={2}>
 {[["Baseline",result.baseline],["Proposed",result.scenario]].map(([label,r])=><Grid item xs={12} sm={6} key={label}><Typography color="text.secondary">{label}</Typography><Typography variant="h5" fontWeight={700}>{r.health_score}% health</Typography><Typography>Failure probability: {r.failure_probability}%</Typography><Chip sx={{mt:1}} label={r.health_status} color={r.health_status==="Healthy"?"success":r.health_status==="Warning"?"warning":"error"}/></Grid>)}
 </Grid><Box sx={{mt:2,p:2,bgcolor:"background.default",borderRadius:2}}><Typography fontWeight={700}>Change in estimated failure probability</Typography><Typography variant="h5" fontWeight={700}>{delta>0?"+":""}{delta.toFixed(2)} percentage points</Typography><Typography color="text.secondary" variant="body2">{Math.abs(delta)<0.01?"No material change":delta<0?"Lower model estimate in proposed scenario":"Higher model estimate in proposed scenario"}</Typography></Box>
 <Typography variant="subtitle2" sx={{mt:2}}>Failure mode estimates (baseline → proposed)</Typography>{Object.keys(result.baseline.failure_modes||{}).map(k=><Typography key={k} variant="body2">{k}: {result.baseline.failure_modes[k]}% → {result.scenario.failure_modes[k]}%</Typography>)}
 </CardContent></Card>}
 </Box>;
}
