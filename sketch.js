// --- ゲームの変数定義 ---
let paddle;
let balls = [];
let blocks = [];
let items = [];
let bottomFloor = null; // 全て跳ね返す板の管理用

const ROWS = 5;
const COLS = 8;
const BLOCK_W = 45;
const BLOCK_H = 20;
const PADDLE_H = 15;

function setup() {
  createCanvas(400, 500);
  rectMode(CENTER);
  ellipseMode(CENTER);
  resetGame();
}

function draw() {
  background(30);

  // --- 1. 底板（アイテム効果）の処理 ---
  if (bottomFloor) {
    bottomFloor.display();
    bottomFloor.update();
    if (bottomFloor.isExpired()) {
      bottomFloor = null;
    }
  }

  // --- 2. パドルの処理 ---
  paddle.update();
  paddle.display();

  // --- 3. ブロックの処理 ---
  for (let i = blocks.length - 1; i >= 0; i--) {
    blocks[i].display();
  }

  // --- 4. ボールの処理（逆順ループで安全に削除） ---
  for (let i = balls.length - 1; i >= 0; i--) {
    let ball = balls[i];
    ball.update();
    ball.bounceWalls();
    
    // パドルとの衝突
    ball.bouncePaddle(paddle);
    
    // 底板との衝突
    if (bottomFloor && ball.y + ball.r >= height - 10) {
      ball.vy *= -1;
      ball.y = height - 10 - ball.r; // めり込み防止
    }

    // ブロックとの衝突判定
    for (let j = blocks.length - 1; j >= 0; j--) {
      if (ball.hitsBlock(blocks[j])) {
        // 30%の確率でアイテムをドロップ
        if (random(1) < 0.3) {
          items.push(new Item(blocks[j].x, blocks[j].y));
        }
        blocks.splice(j, 1);
        ball.vy *= -1; // 反転
        break; 
      }
    }

    ball.display();

    // 画面外（下部）に出たボールを削除
    if (ball.isOutOfBounds()) {
      balls.splice(i, 1);
    }
  }

  // --- 5. アイテムの処理 ---
  for (let i = items.length - 1; i >= 0; i--) {
    let item = items[i];
    item.update();
    item.display();

    // パドルがアイテムをキャッチしたか
    if (item.hitsPaddle(paddle)) {
      applyItemEffect(item.type);
      items.splice(i, 1);
      continue;
    }

    // 画面外に落ちたアイテムの削除
    if (item.y > height) {
      items.splice(i, 1);
    }
  }

  // --- 6. ゲームオーバー・クリア判定 ---
  if (balls.length === 0) {
    fill(255, 50, 50);
    textSize(32);
    textAlign(CENTER, CENTER);
    text("GAME OVER", width / 2, height / 2);
    textSize(16);
    text("Press 'R' to Restart", width / 2, height / 2 + 40);
    noLoop();
  } else if (blocks.length === 0) {
    fill(50, 255, 50);
    textSize(32);
    textAlign(CENTER, CENTER);
    text("GAME CLEAR!", width / 2, height / 2);
    noLoop();
  }
}

// キー入力によるリスタート
function keyPressed() {
  if ((key === 'r' || key === 'R')) {
    resetGame();
    loop();
  }
}

// ゲームの初期化
function resetGame() {
  paddle = new Paddle();
  balls = [new Ball(width / 2, height - 100)];
  blocks = [];
  items = [];
  bottomFloor = null;

  let startX = (width - (COLS * BLOCK_W + (COLS - 1) * 5)) / 2 + BLOCK_W / 2;
  for (let i = 0; i < COLS; i++) {
    for (let j = 0; j < ROWS; j++) {
      let x = startX + i * (BLOCK_W + 5);
      let y = 50 + j * (BLOCK_H + 5);
      blocks.push(new Block(x, y));
    }
  }
}

// アイテムの効果を発動
function applyItemEffect(type) {
  if (type === 'MULTIBALL') {
    // 現在あるすべてのボールから新しいボールを複製
    let currentLength = balls.length;
    for (let i = 0; i < currentLength; i++) {
      let b = balls[i];
      balls.push(new Ball(b.x, b.y, random(-4, 4), -5));
    }
  } else if (type === 'LONG') {
    paddle.w = min(paddle.w + 40, 200); // 最大200
  } else if (type === 'SHORT') {
    paddle.w = max(paddle.w - 30, 40);   // 最小40
  } else if (type === 'FLOOR') {
    bottomFloor = new BottomFloor();
  }
}

// --- 各種クラス定義 ---

// 1. パドルクラス
class Paddle {
  constructor() {
    this.w = 80;
    this.h = PADDLE_H;
    this.x = width / 2;
    this.y = height - 40;
  }

  update() {
    this.x = mouseX;
    this.x = constrain(this.x, this.w / 2, width - this.w / 2);
  }

  display() {
    fill(200);
    noStroke();
    rect(this.x, this.y, this.w, this.h, 5);
  }
}

// 2. ボールクラス
class Ball {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.r = 8;
    this.vx = vx || random(-3, 3);
    this.vy = vy || -5;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
  }

  bounceWalls() {
    if (this.x - this.r < 0 || this.x + this.r > width) {
      this.vx *= -1;
    }
    if (this.y - this.r < 0) {
      this.vy *= -1;
    }
  }

  bouncePaddle(p) {
    if (this.x > p.x - p.w / 2 && this.x < p.x + p.w / 2) {
      if (this.y + this.r > p.y - p.h / 2 && this.y - this.r < p.y + p.h / 2) {
        // パドルの中心からの距離に応じて跳ね返る角度を変える
        let hitPos = this.x - p.x;
        this.vx = map(hitPos, -p.w / 2, p.w / 2, -5, 5);
        this.vy = -abs(this.vy); 
        this.y = p.y - p.h / 2 - this.r; // めり込み防止
      }
    }
  }

  hitsBlock(b) {
    let d = dist(this.x, this.y, b.x, b.y);
    return (this.x > b.x - BLOCK_W/2 && this.x < b.x + BLOCK_W/2 &&
            this.y > b.y - BLOCK_H/2 && this.y < b.y + BLOCK_H/2);
  }

  isOutOfBounds() {
    return this.y - this.r > height;
  }

  display() {
    fill(255, 215, 0);
    ellipse(this.x, this.y, this.r * 2);
  }
}

// 3. ブロッククラス
class Block {
  constructor(x, y) {
    let colors = ['#ff4b5c', '#ffb400', '#00d2c4', '#5c73f2'];
    this.x = x;
    this.y = y;
    this.color = random(colors);
  }

  display() {
    fill(this.color);
    stroke(30);
    strokeWeight(2);
    rect(this.x, this.y, BLOCK_W, BLOCK_H, 3);
  }
}

// 4. アイテムクラス
class Item {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = 10;
    this.speed = 2;
    
    // 4つのタイプをランダムに決定
    let types = ['MULTIBALL', 'LONG', 'SHORT', 'FLOOR'];
    this.type = random(types);
  }

  update() {
    this.y += this.speed;
  }

  hitsPaddle(p) {
    return (this.x > p.x - p.w / 2 && this.x < p.x + p.w / 2 &&
            this.y > p.y - p.h / 2 && this.y < p.y + p.h / 2);
  }

  display() {
    stroke(255);
    strokeWeight(1);
    
    // アイテムの種類に応じて色と文字を変える
    if (this.type === 'MULTIBALL') {
      fill(255, 100, 100); // 赤: ボール増
      ellipse(this.x, this.y, this.r * 2);
      fill(255); textSize(10); textAlign(CENTER, CENTER); text("M", this.x, this.y);
    } else if (this.type === 'LONG') {
      fill(100, 255, 100); // 緑: パドル長く
      ellipse(this.x, this.y, this.r * 2);
      fill(0); textSize(10); textAlign(CENTER, CENTER); text("L", this.x, this.y);
    } else if (this.type === 'SHORT') {
      fill(100, 100, 255); // 青: パドル短く
      ellipse(this.x, this.y, this.r * 2);
      fill(255); textSize(10); textAlign(CENTER, CENTER); text("S", this.x, this.y);
    } else if (this.type === 'FLOOR') {
      fill(255, 100, 255); // ピンク: 底板
      ellipse(this.x, this.y, this.r * 2);
      fill(0); textSize(10); textAlign(CENTER, CENTER); text("F", this.x, this.y);
    }
  }
}

// 5. 底板クラス（全て跳ね返す板。5秒間有効）
class BottomFloor {
  constructor() {
    this.duration = 300; // 60fps * 5秒 = 300フレーム
  }

  update() {
    this.duration--;
  }

  isExpired() {
    return this.duration <= 0;
  }

  display() {
    // 残り1秒（60フレーム）以下になったら点滅させる
    if (this.duration > 60 || frameCount % 10 < 5) {
      fill(255, 100, 255, 150);
      noStroke();
      rect(width / 2, height - 5, width, 10);
    }
  }
}
