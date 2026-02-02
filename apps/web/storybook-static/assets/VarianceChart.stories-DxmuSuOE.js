import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{r as h}from"./index-oxIuDU2I.js";import{D as H,f as l,a as C}from"./anomalyDetection-Cm-lUaXa.js";import{T as b,C as _}from"./ChartTooltip-BYvINGyd.js";import{C as z}from"./circle-check-big-CXOjvlY5.js";import{T,a as A}from"./trending-up-B7BW5zOW.js";import"./_commonjsHelpers-CqkleIqs.js";import"./createLucideIcon-Ek28f7y5.js";import"./minus-BofYsvAw.js";function E({data:i,title:P,thresholds:s=H,showThresholdLines:I=!0,maxValue:f}){const[$,y]=h.useState(null),[B,j]=h.useState({x:0,y:0}),{maxValue:w,hasAnomalies:F,processedData:O}=h.useMemo(()=>{if(!i||i.length===0)return{maxValue:0,hasAnomalies:!1,processedData:[]};let r=f||0,a=0;const t=i.map(n=>{const g=n.current??0,o=n.prior??0,N=o!==0?(g-o)/Math.abs(o)*100:0,x=Math.abs(N);let p="normal";return x>=s.varianceCritical?(p="critical",a++):x>=s.varianceWarning&&(p="warning",a++),r=Math.max(r,Math.abs(g),Math.abs(o)),{...n,current:g,prior:o,variance:N,absVariance:x,status:p}});return{maxValue:r*1.1,hasAnomalies:a>0,processedData:t}},[i,s,f]);if(!i||i.length===0)return null;const m=(r,a)=>{if(a)return"rgb(var(--color-primary-300))";switch(r){case"critical":return"rgb(var(--color-error))";case"warning":return"rgb(var(--color-warning))";default:return"rgb(var(--color-primary-600))"}},Y=(r,a)=>a==="critical"?"rgb(var(--color-error))":a==="warning"?"rgb(var(--color-warning))":r>=0?"rgb(var(--color-success))":"rgb(var(--color-error))";return e.jsxs("div",{className:"card transition-all duration-200 hover:shadow-md",onMouseEnter:r=>{r.currentTarget.style.backgroundColor="rgb(var(--color-bg-muted))"},onMouseLeave:r=>{r.currentTarget.style.backgroundColor="rgb(var(--color-surface))"},children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("h3",{className:"text-lg font-semibold",style:{color:"rgb(var(--color-text))"},children:P}),F?e.jsxs("span",{className:"flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",style:{backgroundColor:"rgb(var(--color-warning) / 0.1)",color:"rgb(var(--color-warning))"},children:[e.jsx(b,{className:"w-3 h-3"}),"Anomalies détectées"]}):e.jsxs("span",{className:"flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",style:{backgroundColor:"rgb(var(--color-success) / 0.1)",color:"rgb(var(--color-success))"},children:[e.jsx(z,{className:"w-3 h-3"}),"Normal"]})]}),e.jsxs("div",{className:"flex items-center gap-4 text-xs",children:[e.jsxs("span",{className:"flex items-center gap-1.5",children:[e.jsx("span",{className:"w-3 h-3 rounded",style:{backgroundColor:"rgb(var(--color-primary-600))"}}),e.jsx("span",{style:{color:"rgb(var(--color-text-secondary))"},children:"Actuel"})]}),e.jsxs("span",{className:"flex items-center gap-1.5",children:[e.jsx("span",{className:"w-3 h-3 rounded",style:{backgroundColor:"rgb(var(--color-primary-300))"}}),e.jsx("span",{style:{color:"rgb(var(--color-text-secondary))"},children:"Précédent"})]})]})]}),I&&e.jsxs("div",{className:"flex items-center gap-4 mb-4 text-xs",style:{color:"rgb(var(--color-text-muted))"},children:[e.jsxs("span",{className:"flex items-center gap-1",children:[e.jsx("span",{className:"w-8 h-0.5",style:{backgroundColor:"rgb(var(--color-warning))"}}),"Attention (±",s.varianceWarning,"%)"]}),e.jsxs("span",{className:"flex items-center gap-1",children:[e.jsx("span",{className:"w-8 h-0.5",style:{backgroundColor:"rgb(var(--color-error))"}}),"Critique (±",s.varianceCritical,"%)"]})]}),e.jsx("div",{className:"space-y-3",children:O.map(r=>{const a=r.code||r.label,t=$===a;return e.jsxs("div",{className:"group relative cursor-pointer",onMouseEnter:n=>{y(a),j({x:n.clientX,y:n.clientY})},onMouseMove:n=>{j({x:n.clientX,y:n.clientY})},onMouseLeave:()=>y(null),children:[e.jsxs("div",{className:"flex justify-between items-center mb-1",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[r.code&&e.jsx("span",{className:"text-xs font-mono",style:{color:"rgb(var(--color-text-muted))"},children:r.code}),e.jsx("span",{className:"text-sm font-medium transition-colors",style:{color:t?"rgb(var(--color-primary-500))":"rgb(var(--color-text))"},children:r.label}),r.status!=="normal"&&e.jsx(b,{className:"w-4 h-4",style:{color:r.status==="critical"?"rgb(var(--color-error))":"rgb(var(--color-warning))"}})]}),e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("span",{className:"text-sm font-mono tabular-nums font-medium",style:{color:"rgb(var(--color-text))"},children:l(r.current)}),e.jsxs("span",{className:"text-xs font-mono tabular-nums",style:{color:"rgb(var(--color-text-muted))"},children:["(",l(r.prior),")"]}),e.jsxs("span",{className:"flex items-center gap-0.5 text-xs font-medium min-w-[60px] justify-end",style:{color:Y(r.variance,r.status)},children:[r.variance>=0?e.jsx(T,{className:"w-3 h-3"}):e.jsx(A,{className:"w-3 h-3"}),C(r.variance)]})]})]}),e.jsxs("div",{className:"relative h-6 flex gap-0.5",children:[e.jsx("div",{className:"h-full rounded-l transition-all",style:{backgroundColor:m(r.status,!0),width:`${Math.max(2,Math.abs(r.prior)/w*100)}%`,opacity:t?.8:.6,transform:t?"scaleY(1.1)":"scaleY(1)"}}),e.jsx("div",{className:"h-full rounded-r transition-all relative overflow-hidden",style:{backgroundColor:m(r.status,!1),width:`${Math.max(2,Math.abs(r.current)/w*100)}%`,transform:t?"scaleY(1.1)":"scaleY(1)",boxShadow:t?`0 0 12px ${m(r.status,!1)}40`:void 0},children:r.status!=="normal"&&e.jsx("div",{className:"absolute inset-0 animate-pulse",style:{backgroundColor:r.status==="critical"?"rgb(var(--color-error) / 0.3)":"rgb(var(--color-warning) / 0.3)"}})})]}),r.status!=="normal"&&e.jsxs("div",{className:"mt-1 text-xs px-2 py-1 rounded",style:{backgroundColor:r.status==="critical"?"rgb(var(--color-error) / 0.1)":"rgb(var(--color-warning) / 0.1)",color:r.status==="critical"?"rgb(var(--color-error))":"rgb(var(--color-warning))"},children:["⚠️ Variance de ",r.absVariance.toFixed(1),"% dépasse le seuil de ",r.status==="critical"?s.varianceCritical:s.varianceWarning,"%"]}),t&&e.jsx(_,{visible:!0,position:B,children:e.jsxs("div",{className:"min-w-[200px]",children:[e.jsxs("div",{className:"flex items-center justify-between gap-3 mb-2",children:[e.jsx("span",{className:"text-gray-400 text-xs font-medium uppercase tracking-wide",children:r.code||r.label}),r.status!=="normal"&&e.jsx(b,{className:`w-4 h-4 ${r.status==="critical"?"text-red-400":"text-amber-400"}`})]}),e.jsx("p",{className:"text-white font-medium mb-3",children:r.label}),e.jsxs("div",{className:"space-y-2",children:[e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{className:"text-gray-400 text-sm",children:"Actuel"}),e.jsx("span",{className:"text-white font-bold",children:l(r.current)})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{className:"text-gray-400 text-sm",children:"Précédent"}),e.jsx("span",{className:"text-gray-300",children:l(r.prior)})]}),e.jsxs("div",{className:"flex justify-between pt-2 border-t border-gray-700",children:[e.jsx("span",{className:"text-gray-400 text-sm",children:"Variation"}),e.jsxs("span",{className:`font-medium flex items-center gap-1 ${r.status==="critical"?"text-red-400":r.status==="warning"?"text-amber-400":r.variance>=0?"text-green-400":"text-red-400"}`,children:[r.variance>=0?e.jsx(T,{className:"w-3 h-3"}):e.jsx(A,{className:"w-3 h-3"}),C(r.variance)]})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{className:"text-gray-400 text-sm",children:"Montant"}),e.jsxs("span",{className:`font-mono ${r.current>=r.prior?"text-green-400":"text-red-400"}`,children:[r.current>=r.prior?"+":"",l(r.current-r.prior)]})]})]}),r.status!=="normal"&&e.jsxs("div",{className:`mt-3 pt-2 border-t border-gray-700 text-xs ${r.status==="critical"?"text-red-400":"text-amber-400"}`,children:[r.status==="critical"?"🔴 Critique":"🟡 Attention",": variance > ",r.status==="critical"?s.varianceCritical:s.varianceWarning,"%"]})]})})]},a)})})]})}E.__docgenInfo={description:"",methods:[],displayName:"VarianceChart",props:{data:{required:!0,tsType:{name:"Array",elements:[{name:"DataPoint"}],raw:"DataPoint[]"},description:""},title:{required:!0,tsType:{name:"string"},description:""},thresholds:{required:!1,tsType:{name:"ThresholdConfig"},description:"",defaultValue:{value:`{
  // Variance: flag items with significant changes
  // IFRS suggests investigating variances >10% on material items
  // 15% warning is balanced between sensitivity and noise reduction
  varianceWarning: 15, // 15% change triggers warning (IFRS suggests 10-15%)
  varianceCritical: 30, // 30% change triggers critical (requires investigation)
  
  // Financial ratios - Industry standard ranges
  // Current Ratio: 1.5-2.0 is considered healthy across most industries
  // Quick Ratio: >1.0 indicates good short-term liquidity
  // Debt-to-Equity: varies by industry (1.5-2.5 general, 3-4 real estate)
  currentRatioMin: 1.2, // Below 1.0 indicates potential liquidity issues
  currentRatioMax: 3.0, // Above 3.0 may indicate inefficient asset use
  quickRatioMin: 0.8, // Acid test - ability to pay without selling inventory
  debtToEquityMax: 2.0, // Leverage threshold (lower = less risk)
  
  // Trend detection - Statistical significance thresholds
  // 3 consecutive periods with >10% change is statistically meaningful
  trendConsecutivePeriods: 3,
  trendPercentageChange: 10,
  
  // Aging - Based on DSO (Days Sales Outstanding) benchmarks
  // Average DSO across industries: 30-45 days
  // >60 days significantly increases bad debt risk
  // >90 days has ~25% probability of becoming uncollectible
  receivablesAgingWarning: 45, // Industry standard warning threshold
  receivablesAgingCritical: 90, // Significant collection risk
  payablesAgingWarning: 45, // May indicate cash flow issues
  
  // Balance checks - Control environment best practices
  negativeBalanceCheck: true, // Always flag negative asset balances
  unusualHoursCheck: true, // Flag transactions outside business hours
  duplicateThresholdDays: 7, // Window for duplicate detection
  
  // Amount thresholds - Based on company size (adjust per organization)
  // Default suitable for mid-size companies ($5M-50M revenue)
  largeTransactionAmount: 25000, // Transactions requiring additional review
  roundNumberThreshold: 1000, // Detect potential estimates/manipulations
}`,computed:!1}},showThresholdLines:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"true",computed:!1}},maxValue:{required:!1,tsType:{name:"number"},description:""}}};const ae={title:"Charts/VarianceChart",component:E,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{data:{description:"Array of data points with current and prior values"},title:{description:"Chart title"},showThresholdLines:{description:"Show threshold lines for warnings",control:{type:"boolean"}}}},v=[{label:"Revenue",current:12e4,prior:1e5},{label:"Expenses",current:85e3,prior:9e4},{label:"Net Income",current:35e3,prior:1e4},{label:"COGS",current:6e4,prior:55e3},{label:"Marketing",current:15e3,prior:2e4}],c={args:{data:v,title:"Variance Analysis",showThresholdLines:!0}},d={args:{data:[...v,{label:"R&D",current:5e4,prior:2e4},{label:"Sales",current:95e3,prior:1e5}],title:"Variance Analysis with Anomalies",showThresholdLines:!0}},u={args:{data:v,title:"Variance Analysis",showThresholdLines:!1}};var k,D,M;c.parameters={...c.parameters,docs:{...(k=c.parameters)==null?void 0:k.docs,source:{originalSource:`{
  args: {
    data: mockData,
    title: 'Variance Analysis',
    showThresholdLines: true
  }
}`,...(M=(D=c.parameters)==null?void 0:D.docs)==null?void 0:M.source}}};var V,S,q;d.parameters={...d.parameters,docs:{...(V=d.parameters)==null?void 0:V.docs,source:{originalSource:`{
  args: {
    data: [...mockData, {
      label: 'R&D',
      current: 50000,
      prior: 20000
    },
    // Large variance
    {
      label: 'Sales',
      current: 95000,
      prior: 100000
    } // Negative variance
    ],
    title: 'Variance Analysis with Anomalies',
    showThresholdLines: true
  }
}`,...(q=(S=d.parameters)==null?void 0:S.docs)==null?void 0:q.source}}};var L,R,W;u.parameters={...u.parameters,docs:{...(L=u.parameters)==null?void 0:L.docs,source:{originalSource:`{
  args: {
    data: mockData,
    title: 'Variance Analysis',
    showThresholdLines: false
  }
}`,...(W=(R=u.parameters)==null?void 0:R.docs)==null?void 0:W.source}}};const se=["Default","WithAnomalies","WithoutThresholds"];export{c as Default,d as WithAnomalies,u as WithoutThresholds,se as __namedExportsOrder,ae as default};
