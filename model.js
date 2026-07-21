import * as T from "https://esm.sh/three@0.160.0";
import { S, W, D, walls, columns, zones, pits, routes, labels, doors, videoRoute } from "./data.js";

export function build(scene, renderer) {
  const p = (x) => x / S;
  const L = {
    plan: new T.Group(),
    shell: new T.Group(),
    door: new T.Group(),
    mep: new T.Group(),
    label: new T.Group(),
    route: new T.Group(),
  };
  scene.add(L.plan, L.shell, L.door, L.mep, L.label, L.route);
  L.route.visible = false;

  const M = {
    concrete: new T.MeshStandardMaterial({ color: 0x777975, roughness: 0.97 }),
    painted: new T.MeshStandardMaterial({ color: 0xd8d3ca, roughness: 0.85 }),
    tile: new T.MeshStandardMaterial({ color: 0xe7e4dc, roughness: 0.75 }),
    dark: new T.MeshStandardMaterial({ color: 0x555854, roughness: 0.98 }),
    metal: new T.MeshStandardMaterial({ color: 0xaab1b4, roughness: 0.42, metalness: 0.58 }),
    pipe: new T.MeshStandardMaterial({ color: 0x9f342e, roughness: 0.45 }),
    orange: new T.MeshStandardMaterial({ color: 0xe98b00, roughness: 0.7 }),
    blue: new T.MeshStandardMaterial({ color: 0x1597c5, transparent: true, opacity: 0.82 }),
    public: new T.MeshStandardMaterial({ color: 0x6e777d, roughness: 0.72 }),
    tileFloor: new T.MeshStandardMaterial({ color: 0xf0eee8, roughness: 0.85 }),
    brightFloor: new T.MeshStandardMaterial({ color: 0xf5f5f2, roughness: 0.75 }),
    darkFloor: new T.MeshStandardMaterial({ color: 0x3f4342, roughness: 1 }),
  };

  const planMaterial = new T.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.82,
    roughness: 1,
    side: T.DoubleSide,
  });
  const planFloor = new T.Mesh(new T.PlaneGeometry(W, D), planMaterial);
  planFloor.rotation.x = -Math.PI / 2;
  planFloor.position.set(W / 2, 0.006, D / 2);
  planFloor.receiveShadow = true;
  L.plan.add(planFloor);

  new T.TextureLoader().load(
    "./assets/latest-plan.svg?v=11",
    (texture) => {
      texture.colorSpace = T.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      planMaterial.map = texture;
      planMaterial.color.set(0xffffff);
      planMaterial.needsUpdate = true;
    },
    undefined,
    (error) => console.error("Unable to load latest floor-plan underlay", error),
  );

  const slab = new T.Mesh(
    new T.BoxGeometry(W + 0.7, 0.16, D + 0.7),
    new T.MeshStandardMaterial({ color: 0xbcb9b3, roughness: 1 }),
  );
  slab.position.set(W / 2, -0.12, D / 2);
  scene.add(slab);

  function addWall(a) {
    let [x, z, X, Z, materialName] = a.map((v, i) => (i < 4 ? p(v) : v));
    const dx = X - x;
    const dz = Z - z;
    const length = Math.hypot(dx, dz);
    const mesh = new T.Mesh(
      new T.BoxGeometry(length, 3.15, 0.16),
      M[materialName] || M.concrete,
    );
    mesh.position.set((x + X) / 2, 1.575, (z + Z) / 2);
    mesh.rotation.y = -Math.atan2(dz, dx);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    L.shell.add(mesh);
  }
  walls.forEach(addWall);

  columns.forEach((a) => {
    const geometry = a[0] === "round"
      ? new T.CylinderGeometry(p(a[3]) / 2, p(a[3]) / 2, a[5], 32)
      : new T.BoxGeometry(p(a[3]), a[5], p(a[4]));
    const mesh = new T.Mesh(geometry, a[0] === "round" ? M.concrete : M.dark);
    mesh.position.set(p(a[1]), a[5] / 2, p(a[2]));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    L.shell.add(mesh);
  });

  zones.forEach((a) => {
    const mesh = new T.Mesh(new T.PlaneGeometry(p(a[3]), p(a[4])), M[a[5]]);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(p(a[1]), 0.018, p(a[2]));
    mesh.receiveShadow = true;
    L.shell.add(mesh);
  });

  function addPit(poly) {
    const shape = new T.Shape();
    poly.forEach((pt, i) => {
      if (i) shape.lineTo(p(pt[0]), -p(pt[1]));
      else shape.moveTo(p(pt[0]), -p(pt[1]));
    });
    shape.closePath();
    const mesh = new T.Mesh(
      new T.ShapeGeometry(shape),
      new T.MeshStandardMaterial({ color: 0x7f7b73, roughness: 1, side: T.DoubleSide }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.028;
    L.shell.add(mesh);

    const points = poly.map((v) => new T.Vector3(p(v[0]), 0.05, p(v[1])));
    points.push(points[0].clone());
    L.shell.add(new T.Line(
      new T.BufferGeometry().setFromPoints(points),
      new T.LineBasicMaterial({ color: 0xe98b00 }),
    ));
  }
  pits.forEach((a) => addPit(a[0]));

  for (let i = 0; i < 9; i += 1) {
    const pipe = new T.Mesh(
      new T.CylinderGeometry(0.05, 0.05, 0.85, 12),
      new T.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.8 }),
    );
    pipe.position.set(p(535 + i * 11), 0.43, p(112 + (i % 3) * 13));
    L.shell.add(pipe);
  }

  function addFrame(x, z, width, orientation) {
    const height = 2.25;
    let a;
    let b;
    let head;
    if (orientation === "h") {
      a = new T.Mesh(new T.BoxGeometry(0.09, height, 0.12), M.metal);
      b = a.clone();
      a.position.set(p(x - width / 2), height / 2, p(z));
      b.position.set(p(x + width / 2), height / 2, p(z));
      head = new T.Mesh(new T.BoxGeometry(p(width), 0.09, 0.12), M.metal);
    } else {
      a = new T.Mesh(new T.BoxGeometry(0.12, height, 0.09), M.metal);
      b = a.clone();
      a.position.set(p(x), height / 2, p(z - width / 2));
      b.position.set(p(x), height / 2, p(z + width / 2));
      head = new T.Mesh(new T.BoxGeometry(0.12, 0.09, p(width)), M.metal);
    }
    head.position.set(p(x), height, p(z));
    L.door.add(a, b, head);
  }

  function addLeaf(x, z, width, orientation, swing = 1, materialName = "blue") {
    const material = materialName === "public" ? M.public : M[materialName] || M.blue;
    const leaf = new T.Mesh(new T.BoxGeometry(p(width), 2.15, 0.05), material);
    leaf.position.set(p(x), 1.075, p(z));
    leaf.rotation.y = (orientation === "h" ? 0 : Math.PI / 2) + swing * 0.38;
    L.door.add(leaf);
  }

  doors.forEach((a) => {
    const color = a[5] === "painted" ? "painted" : a[5];
    if (a[0] === "double") {
      addFrame(a[1], a[2], a[3], a[4]);
      addLeaf(a[1] - a[3] / 4, a[2], a[3] / 2, a[4], -1, color);
      addLeaf(a[1] + a[3] / 4, a[2], a[3] / 2, a[4], 1, color);
    } else {
      addFrame(a[1], a[2], a[3], a[4]);
      addLeaf(a[1], a[2], a[3], a[4], a[5], a[6]);
    }
  });

  for (let i = 0; i < 5; i += 1) {
    const equipment = new T.Mesh(new T.BoxGeometry(0.48, 0.62, 0.20), M.metal);
    equipment.position.set(p(120 + i * 13), 1.12, p(58));
    L.shell.add(equipment);
  }
  const screen = new T.Mesh(
    new T.BoxGeometry(0.9, 0.52, 0.08),
    new T.MeshStandardMaterial({ color: 0x111519 }),
  );
  screen.position.set(p(175), 1.7, p(58));
  L.shell.add(screen);

  routes.forEach((a) => {
    let [x, z, X, Z, type] = a.map((v, i) => (i < 4 ? p(v) : v));
    const dx = X - x;
    const dz = Z - z;
    const length = Math.hypot(dx, dz);
    const mesh = new T.Mesh(
      type === "duct"
        ? new T.BoxGeometry(length, 0.34, 0.62)
        : new T.BoxGeometry(length, 0.12, 0.12),
      type === "duct" ? M.metal : M.pipe,
    );
    mesh.position.set((x + X) / 2, type === "duct" ? 2.75 : 2.98, (z + Z) / 2);
    mesh.rotation.y = -Math.atan2(dz, dx);
    L.mep.add(mesh);
  });

  function roundedRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
  }

  labels.forEach((a) => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 560;
    canvas.height = 90;
    context.font = "bold 22px Arial, Microsoft JhengHei";
    const width = Math.min(530, context.measureText(a[0]).width + 35);
    context.fillStyle = "rgba(255,255,255,.94)";
    context.strokeStyle = a[3];
    context.lineWidth = 4;
    roundedRect(context, 3, 3, width, 55, 10);
    context.fill();
    context.stroke();
    context.fillStyle = a[3];
    context.fillText(a[0], 18, 39);
    const sprite = new T.Sprite(new T.SpriteMaterial({
      map: new T.CanvasTexture(canvas),
      depthTest: false,
      transparent: true,
    }));
    sprite.scale.set(5.7, 1, 1);
    sprite.position.set(p(a[1]), 3.7, p(a[2]));
    L.label.add(sprite);
  });

  const routePoints = videoRoute.map((v) => new T.Vector3(p(v[0]), 0.08, p(v[1])));
  L.route.add(new T.Line(
    new T.BufferGeometry().setFromPoints(routePoints),
    new T.LineBasicMaterial({ color: 0x1597c5 }),
  ));
  routePoints.forEach((point) => {
    const marker = new T.Mesh(new T.SphereGeometry(0.12, 16, 12), M.blue);
    marker.position.copy(point);
    L.route.add(marker);
  });

  return L;
}
