import * as T from "https://esm.sh/three@0.160.0";
import {S,W,D,walls,columns,zones,pits,routes,labels,doors,videoRoute} from "./data.js?v=13";

export function build(scene,renderer){
  const p=x=>x/S;
  const L={plan:new T.Group(),shell:new T.Group(),door:new T.Group(),mep:new T.Group(),label:new T.Group(),route:new T.Group()};
  scene.add(L.plan,L.shell,L.door,L.mep,L.label,L.route);
  L.route.visible=false;

  const M={
    concrete:new T.MeshStandardMaterial({color:0x777975,roughness:.97}),
    painted:new T.MeshStandardMaterial({color:0xd8d3ca,roughness:.85}),
    tile:new T.MeshStandardMaterial({color:0xe7e4dc,roughness:.75}),
    dark:new T.MeshStandardMaterial({color:0x555854,roughness:.98}),
    metal:new T.MeshStandardMaterial({color:0xaab1b4,roughness:.42,metalness:.58}),
    pipe:new T.MeshStandardMaterial({color:0x9f342e,roughness:.45}),
    blue:new T.MeshStandardMaterial({color:0x1597c5,transparent:true,opacity:.82}),
    public:new T.MeshStandardMaterial({color:0x6e777d,roughness:.72}),
    tileFloor:new T.MeshStandardMaterial({color:0xf0eee8,roughness:.85}),
    brightFloor:new T.MeshStandardMaterial({color:0xf5f5f2,roughness:.75}),
    darkFloor:new T.MeshStandardMaterial({color:0x3f4342,roughness:1})
  };

  // The uploaded plan is 582×1600. Rotated clockwise it is exactly 1600×582.
  // Existing model coordinates were traced from crop (65,45)–(1410,525),
  // therefore the complete plan starts at (-65,-45) in the same pixel coordinate system.
  const PLAN_W=1600/S,PLAN_D=582/S,PLAN_X=-65/S,PLAN_Z=-45/S;
  const planMat=new T.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:.86,roughness:1,side:T.DoubleSide});
  const plan=new T.Mesh(new T.PlaneGeometry(PLAN_W,PLAN_D),planMat);
  plan.rotation.x=-Math.PI/2;
  plan.position.set(PLAN_X+PLAN_W/2,.006,PLAN_Z+PLAN_D/2);
  plan.receiveShadow=true;
  L.plan.add(plan);
  new T.TextureLoader().load("./assets/latest-plan.svg?v=13",tex=>{
    tex.colorSpace=T.SRGBColorSpace;
    tex.anisotropy=renderer.capabilities.getMaxAnisotropy();
    planMat.map=tex;
    planMat.needsUpdate=true;
  },undefined,e=>console.error("Unable to load proportional floor-plan underlay",e));

  const slab=new T.Mesh(new T.BoxGeometry(PLAN_W+.7,.16,PLAN_D+.7),new T.MeshStandardMaterial({color:0xbcb9b3,roughness:1}));
  slab.position.set(PLAN_X+PLAN_W/2,-.12,PLAN_Z+PLAN_D/2);
  scene.add(slab);

  function wall(a){
    let[x,z,X,Z,m]=a.map((v,i)=>i<4?p(v):v),dx=X-x,dz=Z-z,n=Math.hypot(dx,dz);
    const q=new T.Mesh(new T.BoxGeometry(n,3.15,.16),M[m]||M.concrete);
    q.position.set((x+X)/2,1.575,(z+Z)/2);
    q.rotation.y=-Math.atan2(dz,dx);
    q.castShadow=q.receiveShadow=true;
    L.shell.add(q);
  }
  walls.forEach(wall);

  columns.forEach(a=>{
    const g=a[0]==="round"?new T.CylinderGeometry(p(a[3])/2,p(a[3])/2,a[5],32):new T.BoxGeometry(p(a[3]),a[5],p(a[4]));
    const q=new T.Mesh(g,a[0]==="round"?M.concrete:M.dark);
    q.position.set(p(a[1]),a[5]/2,p(a[2]));
    q.castShadow=q.receiveShadow=true;
    L.shell.add(q);
  });

  zones.forEach(a=>{
    const q=new T.Mesh(new T.PlaneGeometry(p(a[3]),p(a[4])),M[a[5]]);
    q.rotation.x=-Math.PI/2;
    q.position.set(p(a[1]),.018,p(a[2]));
    q.receiveShadow=true;
    L.shell.add(q);
  });

  function pit(poly){
    const sh=new T.Shape();
    poly.forEach((pt,i)=>i?sh.lineTo(p(pt[0]),-p(pt[1])):sh.moveTo(p(pt[0]),-p(pt[1])));
    sh.closePath();
    const q=new T.Mesh(new T.ShapeGeometry(sh),new T.MeshStandardMaterial({color:0x7f7b73,roughness:1,side:T.DoubleSide}));
    q.rotation.x=-Math.PI/2;
    q.position.y=.028;
    L.shell.add(q);
    const pts=poly.map(v=>new T.Vector3(p(v[0]),.05,p(v[1])));
    pts.push(pts[0].clone());
    L.shell.add(new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:0xe98b00})));
  }
  pits.forEach(a=>pit(a[0]));
  for(let i=0;i<9;i++){
    const q=new T.Mesh(new T.CylinderGeometry(.05,.05,.85,12),new T.MeshStandardMaterial({color:0xeeeeea,roughness:.8}));
    q.position.set(p(535+i*11),.43,p(112+(i%3)*13));
    L.shell.add(q);
  }

  function frame(x,z,w,o){
    const h=2.25;let a,b,H;
    if(o==="h"){
      a=new T.Mesh(new T.BoxGeometry(.09,h,.12),M.metal);b=a.clone();
      a.position.set(p(x-w/2),h/2,p(z));b.position.set(p(x+w/2),h/2,p(z));
      H=new T.Mesh(new T.BoxGeometry(p(w),.09,.12),M.metal);
    }else{
      a=new T.Mesh(new T.BoxGeometry(.12,h,.09),M.metal);b=a.clone();
      a.position.set(p(x),h/2,p(z-w/2));b.position.set(p(x),h/2,p(z+w/2));
      H=new T.Mesh(new T.BoxGeometry(.12,.09,p(w)),M.metal);
    }
    H.position.set(p(x),h,p(z));
    L.door.add(a,b,H);
  }
  function leaf(x,z,w,o,s=1,m="blue"){
    const q=new T.Mesh(new T.BoxGeometry(p(w),2.15,.05),m==="public"?M.public:(M[m]||M.blue));
    q.position.set(p(x),1.075,p(z));
    q.rotation.y=(o==="h"?0:Math.PI/2)+s*.38;
    L.door.add(q);
  }
  doors.forEach(a=>{
    const col=a[5]==="painted"?"painted":a[5];
    frame(a[1],a[2],a[3],a[4]);
    if(a[0]==="double"){
      leaf(a[1]-a[3]/4,a[2],a[3]/2,a[4],-1,col);
      leaf(a[1]+a[3]/4,a[2],a[3]/2,a[4],1,col);
    }else leaf(a[1],a[2],a[3],a[4],a[5],a[6]);
  });

  for(let i=0;i<5;i++){
    const q=new T.Mesh(new T.BoxGeometry(.48,.62,.2),M.metal);
    q.position.set(p(120+i*13),1.12,p(58));
    L.shell.add(q);
  }
  const screen=new T.Mesh(new T.BoxGeometry(.9,.52,.08),new T.MeshStandardMaterial({color:0x111519}));
  screen.position.set(p(175),1.7,p(58));
  L.shell.add(screen);

  routes.forEach(a=>{
    let[x,z,X,Z,t]=a.map((v,i)=>i<4?p(v):v),dx=X-x,dz=Z-z,n=Math.hypot(dx,dz);
    const q=new T.Mesh(t==="duct"?new T.BoxGeometry(n,.34,.62):new T.BoxGeometry(n,.12,.12),t==="duct"?M.metal:M.pipe);
    q.position.set((x+X)/2,t==="duct"?2.75:2.98,(z+Z)/2);
    q.rotation.y=-Math.atan2(dz,dx);
    L.mep.add(q);
  });

  function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
  labels.forEach(a=>{
    const cv=document.createElement("canvas"),c=cv.getContext("2d");
    cv.width=560;cv.height=90;c.font="bold 22px Arial, Microsoft JhengHei";
    const w=Math.min(530,c.measureText(a[0]).width+35);
    c.fillStyle="rgba(255,255,255,.94)";c.strokeStyle=a[3];c.lineWidth=4;
    rr(c,3,3,w,55,10);c.fill();c.stroke();c.fillStyle=a[3];c.fillText(a[0],18,39);
    const q=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(cv),depthTest:false,transparent:true}));
    q.scale.set(5.7,1,1);q.position.set(p(a[1]),3.7,p(a[2]));L.label.add(q);
  });

  const pts=videoRoute.map(v=>new T.Vector3(p(v[0]),.08,p(v[1])));
  L.route.add(new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:0x1597c5})));
  pts.forEach(v=>{const q=new T.Mesh(new T.SphereGeometry(.12,16,12),M.blue);q.position.copy(v);L.route.add(q);});
  return L;
}
