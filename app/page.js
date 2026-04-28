"use client";
import { useEffect, useMemo, useState } from "react";
import LeafletMap from "./LeafletMap";

export default function Home(){
const [reports,setReports]=useState([]);
const [mode,setMode]=useState("all");
const [status,setStatus]=useState("");

function today(){return new Date().toISOString().slice(0,10)}

function filterReports(r){
 if(mode==="24h"){
  const d=new Date();d.setDate(d.getDate()-1);
  return r.filter(x=>new Date(x.incident_date)>=d);
 }
 return r;
}

const filtered=filterReports(reports);

function alertCount(){
 const d=new Date();d.setDate(d.getDate()-1);
 return reports.filter(r=>new Date(r.incident_date)>=d).length;
}

async function load(){
 const res=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/reports?select=*`,{
  headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}
 });
 const data=await res.json();
 setReports(data);
}

useEffect(()=>{load()},[]);

async function share(){
 try{
  await navigator.share({title:"Scammer Safari",url:window.location.href});
 }catch{}
}

return <main style={{background:"#111",color:"white",padding:30}}>

{/* ALERT */}
{alertCount()>0&&<div style={{background:"#7f1d1d",padding:14,borderRadius:12,marginBottom:20}}>
⚠️ {alertCount()} scams reported in last 24h
</div>}

<h1>Scammer Safari</h1>

{/* TOGGLE */}
<div style={{display:"flex",gap:10,marginBottom:20}}>
<button onClick={()=>setMode("all")}>All time</button>
<button onClick={()=>setMode("24h")}>Last 24h</button>
<button onClick={share}>Share</button>
</div>

{/* QUICK REPORT */}
<div style={{marginBottom:20}}>
<button style={{background:"#ef4444",padding:14,borderRadius:12}}
onClick={()=>alert("Use full form below")}>🚨 QUICK REPORT</button>
</div>

{/* MAP */}
<LeafletMap points={filtered} heat height={320}/>

{/* LIST */}
<div style={{marginTop:20}}>
{filtered.slice(0,10).map(r=><div key={r.id} style={{border:"1px solid #333",padding:10,marginBottom:10}}>
{r.area}, {r.city}
</div>)}
</div>

{/* LEGAL */}
<div style={{marginTop:40,fontSize:12,color:"#aaa"}}>
This platform collects anonymous reports. Do not identify or confront individuals.
</div>

</main>
}
