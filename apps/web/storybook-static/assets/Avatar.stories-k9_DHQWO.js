import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{r as h}from"./index-oxIuDU2I.js";import{c as W}from"./createLucideIcon-Ek28f7y5.js";import"./_commonjsHelpers-CqkleIqs.js";/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _=[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]],k=W("User",_),M={xs:"w-6 h-6 text-[10px]",sm:"w-8 h-8 text-xs",md:"w-10 h-10 text-sm",lg:"w-12 h-12 text-base",xl:"w-20 h-20 text-2xl","2xl":"w-24 h-24 text-3xl"},R={xs:"w-2 h-2 -right-0.5 -bottom-0.5",sm:"w-2.5 h-2.5 -right-0.5 -bottom-0.5",md:"w-3 h-3 -right-0.5 -bottom-0.5",lg:"w-3.5 h-3.5 -right-1 -bottom-1",xl:"w-4 h-4 -right-1 -bottom-1","2xl":"w-5 h-5 -right-1 -bottom-1"};function s({src:u,name:t,firstName:g,lastName:p,size:f="md",className:q="",showBadge:T=!1,badgeContent:$,onClick:o}){const[D,J]=h.useState(!1),[c,L]=h.useState(!1),r=(()=>{if(g&&p)return`${g[0]}${p[0]}`.toUpperCase();if(t){const a=t.trim().split(" ");return a.length>=2?`${a[0][0]}${a[a.length-1][0]}`.toUpperCase():t.substring(0,2).toUpperCase()}return""})(),d=u&&!D,U=()=>{if(!r)return"rgb(var(--color-bg-muted))";const a=["rgb(var(--color-text))","rgb(var(--color-gray-700))","rgb(var(--color-gray-600))","rgb(var(--color-gray-500))"],E=r.charCodeAt(0)+(r.charCodeAt(1)||0);return a[E%a.length]},B=o?"button":"div";return e.jsxs(B,{className:`
        relative inline-flex items-center justify-center rounded-full 
        font-semibold overflow-hidden flex-shrink-0 transition-transform
        ${M[f]}
        ${o?"cursor-pointer hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2":""}
        ${q}
      `,style:{backgroundColor:d&&c?"transparent":U(),color:"white"},onClick:o,type:o?"button":void 0,children:[d&&e.jsx("img",{src:u,alt:t||"User avatar",className:`absolute inset-0 w-full h-full object-cover transition-opacity ${c?"opacity-100":"opacity-0"}`,onLoad:()=>L(!0),onError:()=>J(!0),referrerPolicy:"no-referrer"}),(!d||!c)&&e.jsx(e.Fragment,{children:r?e.jsx("span",{className:"select-none",children:r}):e.jsx(k,{className:"w-1/2 h-1/2"})}),T&&e.jsx("span",{className:`absolute rounded-full border-2 ${R[f]}`,style:{borderColor:"rgb(var(--color-surface))",backgroundColor:"rgb(var(--color-success))"},children:$})]})}s.__docgenInfo={description:"",methods:[],displayName:"Avatar",props:{src:{required:!1,tsType:{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]},description:""},name:{required:!1,tsType:{name:"string"},description:""},firstName:{required:!1,tsType:{name:"string"},description:""},lastName:{required:!1,tsType:{name:"string"},description:""},size:{required:!1,tsType:{name:"union",raw:"'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'",elements:[{name:"literal",value:"'xs'"},{name:"literal",value:"'sm'"},{name:"literal",value:"'md'"},{name:"literal",value:"'lg'"},{name:"literal",value:"'xl'"},{name:"literal",value:"'2xl'"}]},description:"",defaultValue:{value:"'md'",computed:!1}},className:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"''",computed:!1}},showBadge:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},badgeContent:{required:!1,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},onClick:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};const O={title:"UI/Avatar",component:s,parameters:{layout:"centered"},tags:["autodocs"]},i={args:{src:"https://api.dicebear.com/7.x/avataaars/svg?seed=JohnDoe",name:"John Doe",size:"md"}},n={args:{firstName:"Jane",lastName:"Smith",size:"md"}},l={render:()=>e.jsxs("div",{style:{display:"flex",gap:"1rem",alignItems:"center"},children:[e.jsx(s,{firstName:"XS",lastName:"Size",size:"xs"}),e.jsx(s,{firstName:"SM",lastName:"Size",size:"sm"}),e.jsx(s,{firstName:"MD",lastName:"Size",size:"md"}),e.jsx(s,{firstName:"LG",lastName:"Size",size:"lg"}),e.jsx(s,{firstName:"XL",lastName:"Size",size:"xl"})]})},m={args:{firstName:"John",lastName:"Doe",size:"md",showBadge:!0,badgeContent:"✓"}};var x,v,N;i.parameters={...i.parameters,docs:{...(x=i.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    src: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JohnDoe',
    name: 'John Doe',
    size: 'md'
  }
}`,...(N=(v=i.parameters)==null?void 0:v.docs)==null?void 0:N.source}}};var b,y,z;n.parameters={...n.parameters,docs:{...(b=n.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    firstName: 'Jane',
    lastName: 'Smith',
    size: 'md'
  }
}`,...(z=(y=n.parameters)==null?void 0:y.docs)==null?void 0:z.source}}};var S,w,j;l.parameters={...l.parameters,docs:{...(S=l.parameters)==null?void 0:S.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    gap: '1rem',
    alignItems: 'center'
  }}>
      <Avatar firstName="XS" lastName="Size" size="xs" />
      <Avatar firstName="SM" lastName="Size" size="sm" />
      <Avatar firstName="MD" lastName="Size" size="md" />
      <Avatar firstName="LG" lastName="Size" size="lg" />
      <Avatar firstName="XL" lastName="Size" size="xl" />
    </div>
}`,...(j=(w=l.parameters)==null?void 0:w.docs)==null?void 0:j.source}}};var I,C,A;m.parameters={...m.parameters,docs:{...(I=m.parameters)==null?void 0:I.docs,source:{originalSource:`{
  args: {
    firstName: 'John',
    lastName: 'Doe',
    size: 'md',
    showBadge: true,
    badgeContent: '✓'
  }
}`,...(A=(C=m.parameters)==null?void 0:C.docs)==null?void 0:A.source}}};const P=["WithImage","WithInitials","Sizes","WithBadge"];export{l as Sizes,m as WithBadge,i as WithImage,n as WithInitials,P as __namedExportsOrder,O as default};
