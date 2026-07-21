import * as T from "https://esm.sh/three@0.160.0";
import {OrbitControls} from "https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import {views} from "./data.js?v=12";
import {build} from "./model.js?v=12";

const host=document.querySelector("#canvas"),scene=new T.Scene();
scene.background=new T.Color(0xdde4e8);scene.fog=new T.Fog(0xdde4e8,65,130);
const camera=new T.PerspectiveCamera(52,innerWidth/innerHeight,.05,280);
const r=new T.WebGLRenderer({antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,2));r.setSize(innerWidth,innerHeight);r.shadowMap.enabled=true;host.appendChild(r.domElement);
scene.add(new T.HemisphereLight(0xffffff,0x62696d,2.1));
const sun=new T.DirectionalLight(0xffffff,2.2);sun.position.set(25,36,20);sun.castShadow=true;scene.add(sun);
const ctl=new OrbitControls(camera,r.domElement);ctl.enableDamping=true;ctl.minDistance=1;ctl.maxDistance=120;ctl.maxPolarAngle=Math.PI/2.015;ctl.screenSpacePanning=true;
const L=build(scene,r);let anim;
function go(k){const v=views[k],a=camera.position.clone(),b=ctl.target.clone(),A=new T.Vector3(...v[0]),B=new T.Vector3(...v[1]);anim={t:performance.now(),a,b,A,B};title.textContent=v[2];desc.textContent=v[3];document.querySelectorAll("button[data-v]").forEach(x=>x.classList.toggle("active",x.dataset.v===k));}
const names={overview:"整體鳥瞰",entrance:"主要入口",publicDouble:"公共走廊雙門",equipment:"設備牆",partA:"Part Plan A",drain:"沉板／去水",accessible:"無障礙洗手間",publicCorridor:"公共走廊門",link:"升降機接駁",partB:"Part Plan B",tailPortal:"尾段入口",tail:"較暗尾段"};
Object.entries(names).forEach(([k,n])=>{const b=document.createElement("button");b.textContent=n;b.dataset.v=k;b.onclick=()=>go(k);buttons.appendChild(b);});
for(const[id,key]of[["plan","plan"],["mep","mep"],["labels","label"],["shell","shell"],["doors","door"],["route","route"]])document.getElementById(id).onchange=e=>L[key].visible=e.target.checked;
const reset=document.createElement("button");reset.textContent="重設";reset.onclick=()=>go("overview");buttons.appendChild(reset);
const fs=document.createElement("button");fs.textContent="全螢幕";fs.onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();buttons.appendChild(fs);
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();r.setSize(innerWidth,innerHeight);});
go("overview");loading.remove();
(function loop(now){requestAnimationFrame(loop);if(anim){const t=Math.min(1,(now-anim.t)/900),e=1-(1-t)**3;camera.position.lerpVectors(anim.a,anim.A,e);ctl.target.lerpVectors(anim.b,anim.B,e);if(t>=1)anim=null;}ctl.update();r.render(scene,camera);})(0);
