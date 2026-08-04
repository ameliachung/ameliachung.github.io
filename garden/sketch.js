// ====== 調色盤 ======
const BALLOON_CLR = ["#afbe92", "#cae3c5", "#5a956e", "#e0e3ad", "#D9D2EC"]; // 桔梗：紫藍系
const AMARYLLIS_CLR = ["#D24A3F", "#C0392E", "#E2705F", "#EDA294", "#F4E2D8"]; // 孤挺花：紅到粉白
const BABY_CLR = ["#FFFFFF", "#FCF7F3", "#F8EAEF"]; // 滿天星：白、極淡粉
const STEM_CLR = ["#5C8A4A", "#4E7A3E", "#6A9850", "#3E6A32", "#76A85C"];
const BABY_STEM_CLR = ["#93AC80", "#A2B98F", "#89A276"];

// 地圖用色（等高線分層設色）
const MAP_BANDS = ["#EFE7D5", "#E2D7BC", "#D3C5A3", "#C4B48C", "#B5A276"];
const MAP_INK = "#96805D";
const MAP_WATER = "#A6C0CB";

let flowers = [];
let mapLayer; // 地圖只畫一次，之後每幀貼圖

// 花瓣輪廓：以正多邊形為底，尖端在角度 0、seg、2seg…，notch 控制花瓣間的凹陷深度
function lobeRadius(R, a, lobes, notch) {
  let seg = TWO_PI / lobes;
  let half = seg / 2;
  let phi = ((a % seg) + seg) % seg;
  let d = min(phi, seg - phi); // 離最近花瓣尖端的角距
  let r = (R * cos(half)) / cos(half - d);
  let s = d / half;
  return r - R * notch * s * s;
}

// 兩端尖、中段飽滿的葉/瓣形，沿 +x 方向長 len、最寬 w
function lensShape(len, w, sharp = 0.65) {
  beginShape();
  for (let i = 0; i <= 18; i++) {
    let t = i / 18;
    vertex(t * len, -(w / 2) * pow(sin(PI * t), sharp));
  }
  for (let i = 18; i >= 0; i--) {
    let t = i / 18;
    vertex(t * len, (w / 2) * pow(sin(PI * t), sharp));
  }
  endShape(CLOSE);
}

class Flower {
  constructor(x, y, species, size, stemH) {
    this.species = species;
    this.x = x;
    this.rootY = y; // 莖底部
    this.stemH = stemH;
    this.y = y - stemH; // 花的位置 = 莖頂端
    this.size = size;
    this.leanX = random(-0.16, 0.16) * stemH; // 天生的傾斜

    this.sway = 0;
    this.swayVel = 0;

    if (species === "baby") {
      this.stemClr = random(BABY_STEM_CLR);
      this.stemW = 1.1;
      this.stiff = 0.08; // 越小越軟
      this.push = 3.2;
      this.initBaby();
    } else if (species === "amaryllis") {
      this.stemClr = random(STEM_CLR);
      this.stemW = 4.5;
      this.stiff = 0.16;
      this.push = 1.6;
      this.initAmaryllis();
    } else {
      this.stemClr = random(STEM_CLR);
      this.stemW = 2.3;
      this.stiff = 0.12;
      this.push = 2.5;
      this.initBalloon();
    }
  }

  headX() {
    return this.x + this.leanX + this.sway;
  }

  // ---------- 桔梗 ----------
  initBalloon() {
    this.isBud = random() < 0.28; // 桔梗的花苞是鼓起來的氣球狀
    this.R = this.size * 2.6;
    this.rot = random(TWO_PI);
    let base = color(random(BALLOON_CLR.slice(0, 4)));
    this.clr = base;
    this.clrDeep = lerpColor(base, color("#33265E"), 0.4);
    this.clrLight = lerpColor(base, color(255), 0.62);
    this.leaves = [];
    for (let i = 0; i < 2; i++) {
      this.leaves.push({
        f: random(0.3, 0.72), // 沿莖的高度比例
        side: random() < 0.5 ? -1 : 1,
        len: this.size * random(1.6, 2.4),
        ang: random(-0.5, 0.1),
      });
    }
  }

  drawBalloon() {
    let R = this.R;
    push();
    rotate(this.rot);

    // 花萼（五枚小綠片）
    push();
    noStroke();
    fill("#6A9850");
    beginShape();
    for (let i = 0; i <= 60; i++) {
      let a = (i / 60) * TWO_PI;
      let r = lobeRadius(R * 0.62, a + TWO_PI / 10, 5, 0.45);
      vertex(cos(a) * r, sin(a) * r);
    }
    endShape(CLOSE);
    pop();

    stroke(this.clrDeep);
    strokeWeight(1);
    fill(this.clr);

    if (this.isBud) {
      // 花苞：幾乎沒有凹陷的鼓脹五角
      beginShape();
      for (let i = 0; i <= 70; i++) {
        let a = (i / 70) * TWO_PI;
        let r = lobeRadius(R * 0.8, a, 5, 0.04);
        vertex(cos(a) * r, sin(a) * r);
      }
      endShape(CLOSE);
      // 五道稜線
      stroke(this.clrDeep);
      strokeWeight(0.9);
      for (let i = 0; i < 5; i++) {
        let a = (i / 5) * TWO_PI;
        line(0, 0, cos(a) * R * 0.76, sin(a) * R * 0.76);
      }
    } else {
      // 開花：五枚尖瓣
      beginShape();
      for (let i = 0; i <= 100; i++) {
        let a = (i / 100) * TWO_PI;
        let r = lobeRadius(R, a, 5, 0.3);
        vertex(cos(a) * r, sin(a) * r);
      }
      endShape(CLOSE);

      // 花瓣上的深色脈紋
      stroke(this.clrDeep);
      strokeWeight(0.7);
      for (let i = 0; i < 5; i++) {
        let a = (i / 5) * TWO_PI;
        line(
          cos(a) * R * 0.18,
          sin(a) * R * 0.18,
          cos(a) * R * 0.86,
          sin(a) * R * 0.86,
        );
        for (let s of [-0.22, 0.22]) {
          line(
            cos(a) * R * 0.2,
            sin(a) * R * 0.2,
            cos(a + s) * R * 0.6,
            sin(a + s) * R * 0.6,
          );
        }
      }

      // 花心：淡色底 + 五裂柱頭
      noStroke();
      fill(this.clrLight);
      circle(0, 0, R * 0.52);
      fill(255, 235);
      beginShape();
      for (let i = 0; i <= 50; i++) {
        let a = (i / 50) * TWO_PI;
        let r = lobeRadius(R * 0.22, a + TWO_PI / 10, 5, 0.55);
        vertex(cos(a) * r, sin(a) * r);
      }
      endShape(CLOSE);
      fill(this.clrDeep);
      circle(0, 0, R * 0.09);
    }
    pop();
  }

  // ---------- 孤挺花 ----------
  initAmaryllis() {
    let base = color(random(AMARYLLIS_CLR.slice(0, 4)));
    this.clr = base;
    this.clrDeep = lerpColor(base, color("#7A1E1E"), 0.4);
    this.clrLight = lerpColor(base, color(255), 0.5);
    this.throatClr = lerpColor(base, color("#F2E9C8"), 0.75);
    this.L = this.size * 3.2;

    this.heads = [];
    if (random() < 0.45) {
      // 一梗兩朵，朝兩側岔開
      this.heads.push({
        dx: -this.size * 1.1,
        dy: this.size * 0.4,
        s: 0.9,
        rot: random(TWO_PI),
      });
      this.heads.push({
        dx: this.size * 1.2,
        dy: -this.size * 0.25,
        s: 1,
        rot: random(TWO_PI),
      });
    } else {
      this.heads.push({ dx: 0, dy: 0, s: 1, rot: random(TWO_PI) });
    }

    // 基部的帶狀葉
    this.straps = [];
    for (let i = 0; i < 3; i++) {
      this.straps.push({
        side: i % 2 === 0 ? -1 : 1,
        h: this.stemH * random(0.45, 0.75),
        spread: random(0.5, 1.1),
        w: random(3, 5),
      });
    }
  }

  drawAmaryllisHead(s, rot) {
    push();
    scale(s);
    rotate(rot);
    let L = this.L;

    // 花喉
    noStroke();
    fill(this.throatClr);
    circle(0, 0, L * 0.55);

    // 六枚花被片：外三片較長，內三片較窄
    for (let i = 0; i < 6; i++) {
      let outer = i % 2 === 0;
      push();
      rotate((i / 6) * TWO_PI);
      stroke(this.clrDeep);
      strokeWeight(0.9);
      fill(outer ? this.clr : this.clrLight);
      lensShape(outer ? L : L * 0.88, outer ? L * 0.52 : L * 0.44, 0.62);

      // 中肋與淡色喉斑
      stroke(this.clrDeep);
      strokeWeight(0.7);
      line(L * 0.1, 0, L * 0.9, 0);
      noStroke();
      fill(this.throatClr);
      ellipse(L * 0.22, 0, L * 0.3, L * 0.2);
      pop();
    }

    // 雄蕊六枚 + 花柱
    stroke(this.clrDeep);
    strokeWeight(1);
    noFill();
    for (let i = 0; i < 6; i++) {
      let a = (i / 6) * TWO_PI + 0.35;
      let tx = cos(a) * L * 0.5;
      let ty = sin(a) * L * 0.5;
      line(0, 0, tx, ty);
      push();
      translate(tx, ty);
      rotate(a);
      noStroke();
      fill("#E4C55E");
      ellipse(0, 0, L * 0.12, L * 0.06);
      pop();
    }
    let pa = 0.35 + TWO_PI / 12;
    stroke(this.clrLight);
    strokeWeight(1.2);
    line(0, 0, cos(pa) * L * 0.68, sin(pa) * L * 0.68);
    noStroke();
    fill("#F6EFDF");
    circle(cos(pa) * L * 0.68, sin(pa) * L * 0.68, L * 0.08);
    pop();
  }

  // ---------- 滿天星 ----------
  initBaby() {
    this.segs = [];
    this.buds = [];
    let build = (x, y, ang, len, depth) => {
      if (depth === 0) {
        this.buds.push({ x, y, r: random(2, 3.6), pink: random() < 0.22 });
        return;
      }
      let nx = x + cos(ang) * len;
      let ny = y + sin(ang) * len;
      this.segs.push({ x1: x, y1: y, x2: nx, y2: ny, w: depth * 0.42 });
      let n = floor(random(2, 5));
      for (let i = 0; i < n; i++) {
        build(
          nx,
          ny,
          ang + random(-0.8, 0.8),
          len * random(0.52, 0.75),
          depth - 1,
        );
      }
    };
    build(0, 0, -HALF_PI + random(-0.25, 0.25), this.size * 2.6, 3);
    this.budClr = random(BABY_CLR);
  }

  drawBaby() {
    stroke(this.stemClr);
    strokeCap(ROUND);
    noFill();
    for (let s of this.segs) {
      strokeWeight(s.w);
      line(s.x1, s.y1, s.x2, s.y2);
    }
    stroke("#C9BFAF");
    strokeWeight(0.5);
    for (let b of this.buds) {
      fill(b.pink ? "#F8EAEF" : this.budClr);
      circle(b.x, b.y, b.r * 2);
    }
  }

  // ---------- 共用 ----------
  display() {
    let topX = this.headX();

    // 地上的淡影
    push();
    noStroke();
    fill(120, 100, 70, 22);
    ellipse(this.x, this.rootY + 2, this.size * 2.6, this.size * 0.9);
    pop();

    // 孤挺花的基生葉畫在莖後面
    if (this.species === "amaryllis") {
      push();
      stroke(this.stemClr);
      strokeWeight(this.straps[0].w);
      strokeCap(ROUND);
      noFill();
      for (let s of this.straps) {
        bezier(
          this.x,
          this.rootY,
          this.x + s.side * s.h * 0.1,
          this.rootY - s.h * 0.6,
          this.x + s.side * s.h * s.spread * 0.5,
          this.rootY - s.h * 0.9,
          this.x + s.side * s.h * s.spread,
          this.rootY - s.h * 0.75,
        );
      }
      pop();
    }

    // 莖
    push();
    stroke(this.stemClr);
    strokeWeight(this.stemW);
    strokeCap(ROUND);
    noFill();
    let dx = topX - this.x;
    bezier(
      this.x,
      this.rootY,
      this.x + dx * 0.1,
      this.rootY - this.stemH * 0.4,
      this.x + dx * 0.55,
      this.rootY - this.stemH * 0.78,
      topX,
      this.y,
    );
    pop();

    // 桔梗的莖生葉
    if (this.species === "balloon") {
      push();
      noStroke();
      fill(this.stemClr);
      for (let lf of this.leaves) {
        push();
        translate(this.x + dx * lf.f * 0.5, this.rootY - this.stemH * lf.f);
        rotate(lf.side > 0 ? lf.ang : PI - lf.ang);
        lensShape(lf.len, lf.len * 0.42, 0.7);
        pop();
      }
      pop();
    }

    // 花
    push();
    translate(topX, this.y);
    if (this.species === "balloon") {
      this.drawBalloon();
    } else if (this.species === "amaryllis") {
      for (let h of this.heads) {
        push();
        stroke(this.stemClr);
        strokeWeight(this.stemW * 0.6);
        line(0, 0, h.dx, h.dy);
        pop();
        push();
        translate(h.dx, h.dy);
        this.drawAmaryllisHead(h.s, h.rot);
        pop();
      }
    } else {
      this.drawBaby();
    }
    pop();
  }

  update(mx, my) {
    let hx = this.headX();
    let dx = hx - mx;
    let d = dist(hx, this.y, mx, my);

    let mouseForce = 0;
    if (d < 90) {
      // 滑鼠距離花頂 90px 以內才有推力
      let dir = dx / (d + 1); // 推開方向，-1 到 1
      let strength = 1 - d / 90; // 越近越強，越遠越弱
      mouseForce = dir * strength;
    }

    // 一點點風，讓花不會完全靜止
    let wind = sin(frameCount * 0.012 + this.x * 0.02) * 0.06;

    this.swayVel += -this.sway * this.stiff + mouseForce * this.push + wind;
    this.swayVel *= 0.88;
    this.sway += this.swayVel;
  }
}

// ====== 地圖地面 ======
// 海岸線的基礎半徑係數（角度 → 0.82~1.16）
function landBase(a) {
  return map(noise(cos(a) * 1.35 + 8.2, sin(a) * 1.35 + 3.6), 0, 1, 0.82, 1.16);
}

// 每層等高線的微擾動，幅度遠小於層距，所以不會互相交叉
function bandWobble(a, k) {
  return (
    1 +
    (noise(cos(a) * 2.4 + k * 12 + 30, sin(a) * 2.4 + k * 12 + 30) - 0.5) * 0.1
  );
}

function insideLand(x, y, cx, cy, rx, ry) {
  let dx = (x - cx) / rx;
  let dy = (y - cy) / ry;
  let r = sqrt(dx * dx + dy * dy);
  return r < landBase(atan2(dy, dx));
}

function landOutline(g, cx, cy, rx, ry, scale, k) {
  g.beginShape();
  for (let i = 0; i <= 160; i++) {
    let a = (i / 160) * TWO_PI;
    let f = landBase(a) * scale * bandWobble(a, k);
    g.vertex(cx + cos(a) * rx * f, cy + sin(a) * ry * f);
  }
  g.endShape(CLOSE);
}

function drawMapGround(g, cx, cy, rx, ry) {
  // 海岸外圍的暈圈（老海圖的水線）
  g.noFill();
  g.strokeWeight(1);
  for (let i = 1; i <= 3; i++) {
    g.stroke(`#CFC3AC${i === 1 ? "88" : "44"}`);
    landOutline(g, cx, cy, rx, ry, 1 + i * 0.045, 0);
  }

  // 分層設色 + 等高線
  for (let k = 0; k < MAP_BANDS.length; k++) {
    g.fill(MAP_BANDS[k]);
    g.stroke(k === 0 ? MAP_INK : MAP_INK + "AA");
    g.strokeWeight(k === 0 ? 1.4 : 0.8);
    landOutline(g, cx, cy, rx, ry, 1 - k * 0.15, k);
  }

  // 經緯格線（只畫在陸地上）
  g.stroke(MAP_INK + "44");
  g.strokeWeight(0.6);
  let step = 42;
  for (let x = cx - rx * 1.2; x <= cx + rx * 1.2; x += step) {
    drawClippedLine(g, x, cy - ry * 1.3, x, cy + ry * 1.3, cx, cy, rx, ry);
  }
  for (let y = cy - ry * 1.3; y <= cy + ry * 1.3; y += step) {
    drawClippedLine(g, cx - rx * 1.2, y, cx + rx * 1.2, y, cx, cy, rx, ry);
  }

  // 一條河 + 一個湖
  let a0 = 2.6;
  let px = cx + cos(a0) * rx * landBase(a0);
  let py = cy + sin(a0) * ry * landBase(a0);
  let ang = atan2(cy - py, cx - px);
  g.stroke(MAP_WATER);
  g.strokeCap(ROUND);
  for (let i = 0; i < 70; i++) {
    ang += (noise(i * 0.12, 77) - 0.5) * 0.55;
    let nx = px + cos(ang) * 4.5;
    let ny = py + sin(ang) * 4.5;
    if (!insideLand(nx, ny, cx, cy, rx, ry)) break;
    g.strokeWeight(map(i, 0, 70, 2.4, 0.7));
    g.line(px, py, nx, ny);
    px = nx;
    py = ny;
  }
  g.noStroke();
  g.fill(MAP_WATER);
  g.beginShape();
  for (let i = 0; i <= 40; i++) {
    let a = (i / 40) * TWO_PI;
    let r = map(noise(cos(a) + 20, sin(a) + 20), 0, 1, 8, 15);
    g.vertex(px + cos(a) * r, py + sin(a) * r * 0.7);
  }
  g.endShape(CLOSE);

  // 指北針
  g.push();
  g.translate(cx + rx * 0.74, cy + ry * 0.52);
  g.stroke(MAP_INK);
  g.strokeWeight(0.8);
  g.noFill();
  g.circle(0, 0, 20);
  g.fill(MAP_INK);
  g.noStroke();
  g.triangle(0, -9, -3.5, 2, 3.5, 2);
  g.fill(MAP_INK + "66");
  g.triangle(0, 9, -3.5, -2, 3.5, -2);
  g.fill(MAP_INK);
  g.textAlign(CENTER, BOTTOM);
  g.textSize(8);
  g.text("N", 0, -11);
  g.pop();

  // 比例尺
  g.push();
  g.translate(cx - rx * 0.78, cy + ry * 0.62);
  g.stroke(MAP_INK);
  g.strokeWeight(0.8);
  for (let i = 0; i < 4; i++) {
    g.fill(i % 2 === 0 ? MAP_INK : "#00000000");
    g.rect(i * 11, 0, 11, 4);
  }
  g.pop();
}

function drawClippedLine(g, x1, y1, x2, y2, cx, cy, rx, ry) {
  let steps = ceil(dist(x1, y1, x2, y2) / 4);
  let drawing = false;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i <= steps; i++) {
    let t = i / steps;
    let x = lerp(x1, x2, t);
    let y = lerp(y1, y2, t);
    let inside = insideLand(x, y, cx, cy, rx, ry);
    if (inside && !drawing) {
      drawing = true;
      sx = x;
      sy = y;
    } else if (!inside && drawing) {
      drawing = false;
      g.line(sx, sy, x, y);
    }
  }
  if (drawing) g.line(sx, sy, x2, y2);
}

function setup() {
  createCanvas(600, 600);

  noiseSeed(9);
  mapLayer = createGraphics(width, height);
  drawMapGround(mapLayer, width / 2, height * 0.6, width * 0.38, height * 0.17);

  // 三種花的數量配置：孤挺花少而高，滿天星多而細碎
  let plan = [
    { species: "amaryllis", count: 7 },
    { species: "balloon", count: 56 },
    { species: "baby", count: 216 },
  ];

  for (let p of plan) {
    for (let i = 0; i < p.count; i++) {
      // sqrt 讓花均勻散佈在整片橢圓上，不會全擠在中心
      let t = sqrt(random());
      let ang = random(TWO_PI);
      let x = t * width * 0.32 * cos(ang);
      let y = t * height * 0.115 * sin(ang);
      // t：離中心的比例，0=中心，1=邊緣
      let stemH;
      let sz;
      if (p.species === "amaryllis") {
        stemH = lerp(150 + random(25), 95 + random(20), t);
        sz = lerp(14 + random(2), 10 + random(2), t);
      } else if (p.species === "balloon") {
        stemH = lerp(95 + random(25), 45 + random(15), t);
        sz = lerp(8 + random(2), 5.5 + random(1.5), t);
      } else {
        stemH = lerp(75 + random(25), 30 + random(15), t);
        sz = lerp(7 + random(2), 4 + random(1.5), t);
      }

      flowers.push(
        new Flower(width / 2 + x, height * 0.6 + y, p.species, sz, stemH),
      );
    }
  }

  // 越靠前（y 越大）越晚畫，才不會被後排蓋住
  flowers.sort((a, b) => a.rootY - b.rootY);
}

function draw() {
  background(245, 240, 230);
  image(mapLayer, 0, 0);

  for (let f of flowers) {
    f.update(mouseX, mouseY);
    f.display();
  }
}
