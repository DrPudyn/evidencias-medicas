export function trackClinicalEvent(event:string,topic="all",source="all") {
 if(typeof window==="undefined"||window.localStorage.getItem("em-analytics-consent")!=="yes")return;
 void fetch("/api/analytics/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event,topic,source}),keepalive:true}).catch(()=>{});
}
