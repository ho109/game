
  // ✅ 캔버스 및 게임 초기 설정
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const fightBox = { x: 50, y: 180, width: 400, height: 200 };
const player = {
  x: 240, y: 340, width: 20, height: 20, speed: 4,
  hp: 35, maxHp: 35, color: "lime", items: 0
};

//도움말 보기기
const text = {
  helpToggle: {
    ko: "❓ 도움말 보기 (Z / X / C)",
    en: "❓ Show Help (Z / X / C)"
  },
  helpLines: {
    ko: ["- Z: 공격 게이지 시작", "- X: 아이템 사용", "- C: 필살기 / 상점 나가기"],
    en: ["- Z: Start Attack Gauge", "- X: Use Item", "- C: Special / Exit Shop"]
  },
  restartPrompt: {
    ko: "스페이스바를 눌러 다시 시작",
    en: "Press Space to Restart"
  },
  victory: {
    ko: "Victory!",
    en: "Victory!"
  },
  gameOver: {
    ko: "Game Over",
    en: "Game Over"
  },
  shopTitle: {
    ko: "고블린 상점 🪙",
    en: "Goblin Shop 🪙"
  },
  shopItems: {
    ko: ["아이템 (5g)", "무기 (5g)"],
    en: ["Item (5g)", "Weapon (5g)"]
  },
  shopInstruction: {
    ko: "Z: 구매 | C: 나가기",
    en: "Z: Buy | C: Exit"
  },
  shopCoins: {
    ko: "보유 코인: ",
    en: "Coins: "
  },
  itemsLabel: {
    ko: "아이템: ",
    en: "Items: "
  },
  langLabel: {
    ko: "🇰🇷 한국어",
    en: "🇺🇸 English"
  }
}; // (기존 다국어 텍스트 객체 그대로 유지)

let coins = 0;
let currentEnemyIndex = 0;
let enemy = null;
let tick = 0;
const bullets = [];
let gameOver = false;
let gameWon = false;
let turn = "player";
let attackTimer = 0;
let attackDuration = 300;
let isAttackGaugeActive = false;
let gaugeX = 0;
let gaugeDir = 4;
let isGameRunning = false;
let keys = {};
let isInShop = false;
let shopSelection = 0;
let playerAttackPower = 1;
let robotWarnings = []; // 경고 타일들
let robotWarnTimer = 0;
let showHelp = false;
let language = "ko";
let animationFrameId = null; // 루프 추적용
let screenShake = 0;
let flashTimer = 0;
let difficulty = "normal";
let difficultyMenuActive = true;
let difficultyOptions = ["easy", "normal", "hard"];
let selectedDifficultyIndex = 1;
let cheatUnlocked = false;
let showLeclerc = false;
let leclercBuffApplied = false;

const imagePaths = [
  "image/slime.png",        // 0
  "image/bat.png",          // 1
  "image/skel.png",         // 2
  "image/skull.png",        // 3
  "image/king_slime.png",   // 4
  "image/gob_shop.png",     // ✅ 고블린 상점 1
  "image/robot.png",        // 6
  "image/weezered.png",     // 7
  "image/real_wizard.png",  // 8
  "image/gob_shop.png",     // ✅ 고블린 상점 2
  "image/fire.png"          // 10
];

const enemies = [
  { nameKo: "슬라임", nameEn: "Slime", maxHp: 10, atk: 1, coin: 2, pattern: () => spawnSlimeCornerSplits(), img: new Image() },
  { nameKo: "박쥐", nameEn: "Bat", maxHp: 12, atk: 2, coin: 3, pattern: () => spawnSideBullets(3), img: new Image() },
  { nameKo: "해골 궁수", nameEn: "Skeleton Archer", maxHp: 15, atk: 3, coin: 5, pattern: () => spawnDiagonalBulletsFromTopRight(), img: new Image() },
  { nameKo: "해골 머리", nameEn: "Skull", maxHp: 18, atk: 2, coin: 5, pattern: () => spawnRandomBullets(6), img: new Image() },
  { nameKo: "거대 슬라임", nameEn: "King Slime", maxHp: 80, atk: 2.5, coin: 7, pattern: () => spawnBouncingBullets(), scale: 2, img: new Image() },
  { nameKo: "고블린 상점", nameEn: "Goblin Shop", maxHp: 9999, atk: 0, coin: 0, pattern: () => {}, img: new Image() },
  { nameKo: "로봇", nameEn: "Robot", maxHp: 30, atk: 3, coin: 8, pattern: () => spawnModifiedRobotBullets(), img: new Image() },
  { nameKo: "마법사..?", nameEn: "Wizard..?", maxHp: 25, atk: 2, coin: 0, pattern: () => spawnSpiralBullets(), img: new Image() },
  { nameKo: "진짜 마법사", nameEn: "Real Wizard", maxHp: 40, atk: 3, coin: 15, pattern: () => realWizardPattern(), img: new Image() },
  { nameKo: "고블린 상점", nameEn: "Goblin Shop", maxHp: 9999, atk: 0, coin: 0, pattern: () => {}, img: new Image() },
  { nameKo: "불", nameEn: "Fire", maxHp: 50, atk: 5, coin: 50, pattern: () => spawnRisingBullets(), img: new Image() }
];

imagePaths.forEach((path, index) => {
  const img = new Image();
  img.src = path;
  img.onload = () => {
    enemies[index].img = img;

    // 마지막 이미지 로딩 완료 후 적 설정
    if (index === imagePaths.length - 1) {
      enemy = enemies[currentEnemyIndex];
      // ✅ 루프 시작은 무조건 update만 돌림
      if (animationFrameId === null) {
        animationFrameId = requestAnimationFrame(update);
      }
    }
  };
});

function applyDifficultyStats(enemy) {
  let factor = 1;
  if (difficulty === "easy") factor = 0.7;
  else if (difficulty === "normal") factor = 0.9;
  else if (difficulty === "hard") factor = 1.3;

  enemy.maxHp = Math.round(enemy.maxHp * factor);  // ✅ maxHp도 조정
  enemy.hp = enemy.maxHp;
  enemy.atk = Math.max(1, Math.round(enemy.atk * factor));
}


function resetPlayerStats() {
  const baseMax = 35;
  player.maxHp = difficulty === "easy" ? baseMax + 5 : difficulty === "hard" ? baseMax - 5 : baseMax;
  player.hp = player.maxHp;
}

function detectCollision(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function drawDifficultyMenu() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = "20px Arial";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.fillText(language === "ko" ? "난이도 선택" : "Select Difficulty", canvas.width / 2, 80);

  const howTo = language === "ko"
    ? ["이동: 화살표 또는 WASD", "Z: 공격", "X: 아이템 사용 (있을 경우에만)", "C: 특수공격"]
    : ["Move: Arrow keys or WASD", "Z: Attack", "X: Item", "C: Special / Shop"];

  ctx.font = "16px Arial"; //폰트 크기임
  howTo.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, 120 + i * 24); //폰트 간격임
  });

  // 엔터 안내 추가
  ctx.font = "14px Arial";
  ctx.fillText(language === "ko" ? "엔터를 눌러 시작" : "Press Enter to Start", canvas.width / 2, 450);
  
  // 언어 전환 버튼
  ctx.fillStyle = "white";
  ctx.fillRect(canvas.width - 90, canvas.height - 50, 70, 30);
  ctx.fillStyle = "black";
  ctx.fillText(language === "ko" ? "🇰🇷 한국어" : "🇺🇸 English", canvas.width - 55, canvas.height - 30);

  const labels = {
    easy:   { ko: "쉬움", en: "Easy" },
    normal: { ko: "보통", en: "Normal" },
    hard:   { ko: "어려움", en: "Hard" }
  };

  difficultyOptions.forEach((key, idx) => {
    const isSelected = idx === selectedDifficultyIndex;
    ctx.fillStyle = isSelected ? "lime" : "white";
    ctx.strokeStyle = "white";
    ctx.fillRect(150, 230 + idx * 60, 200, 40);
    ctx.strokeRect(150, 230 + idx * 60, 200, 40);
    ctx.fillStyle = "black";
    ctx.fillText(labels[key][language], canvas.width / 2, 260 + idx * 60);
  });
}

// 르클레르 모드 속도 보너스 적용 함수
function getSpeedWithLeclerc(baseSpeed) {
  return showLeclerc ? baseSpeed + 2 : baseSpeed;
}

function drawAttackGauge() {
  if (!isAttackGaugeActive) return;
  const barX = canvas.width / 2 - 150;
  const barY = 470;
  ctx.fillStyle = "white";
  ctx.fillRect(barX, barY, 300, 20);
  ctx.fillStyle = "gray";
  ctx.fillRect(barX + 145, barY, 10, 20); // 중앙 노란 목표 지점
  ctx.fillStyle = "red";
  ctx.fillRect(barX + gaugeX, barY, 10, 20); // 움직이는 게이지 바
  gaugeX += gaugeDir;

// 경계 충돌 시 한계값 고정 후 방향 반전
  if (gaugeX < 0) {
    gaugeX = 0;
    gaugeDir *= -1;
  } else if (gaugeX > 290) {
    gaugeX = 290;
    gaugeDir *= -1;
  }
}


function drawHealthBar(x, y, width, height, current, max, color) {
  ctx.fillStyle = "gray";
  ctx.fillRect(x, y, width, height);
  const ratio = Math.max(0, current / max);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width * ratio, height);
}

function startGameLoop() {
  isGameRunning = true; // ✅ 이 부분은 항상 설정되도록
  if (animationFrameId === null) {
    animationFrameId = requestAnimationFrame(update);
  }
}

function update() {
  if (!isGameRunning && difficultyMenuActive) {
    drawDifficultyMenu();
    animationFrameId = requestAnimationFrame(update);
    return;
  }

  if (!isGameRunning) return;
  
  tick++;

  // 💥 플래시 이펙트
  if (flashTimer > 0) {
    canvas.style.backgroundColor = (flashTimer % 2 === 0) ? "darkred" : "black";
    flashTimer--;
  } else {
    canvas.style.backgroundColor = "black";
  }

  // 💥 화면 흔들림 적용
  if (screenShake > 0) {
    const dx = (Math.random() - 0.5) * 10;
    const dy = (Math.random() - 0.5) * 10;
    ctx.save();
    ctx.translate(dx, dy);
    screenShake--;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawUI();
  drawAttackGauge();
  drawBullets();
  updatePlayerMovement();
  drawLeclerc();


  // ✅ 로봇 경고 후 폭발형 탄막
  if (robotWarnings.length > 0) {
    robotWarnTimer--;
    if (robotWarnTimer <= 0) {
      robotWarnings.forEach(pos => {
        const cx = pos.x;
        const cy = pos.y;
        const count = 8;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count;
          bullets.push({
            x: cx,
            y: cy,
            width: 8,
            height: 8,
            speedX: Math.cos(angle) * 2.5,
            speedY: Math.sin(angle) * 2.5
          });
        }
      });
      screenShake = 6;
      flashTimer = 5;
      robotWarnings = [];
    }
  }

  if (!gameOver && turn === "enemy") {
    enemy.pattern();
    updateBullets();
    attackTimer--;
    if (attackTimer <= 0) {
      turn = "player";
      bullets.length = 0;
    }
  }

  // 💥 흔들림 해제
  if (screenShake > 0) {
    ctx.restore();
  }

  animationFrameId = requestAnimationFrame(update);
}

function spawnDiagonalBulletsFromTopRight() {
  if (tick % 25 !== 0) return;
  const count = 5;
  for (let i = 0; i < count; i++) {
    const startX = fightBox.x + fightBox.width;
    const startY = fightBox.y;
    const dx = (player.x + player.width / 2) - startX;
    const dy = (player.y + player.height / 2) - startY;
    const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.25;
    const speed = getSpeedWithLeclerc(4 + Math.random() * 1.5);
    bullets.push({
      x: startX,
      y: startY,
      width: 10,
      height: 10,
      speedX: Math.cos(angle) * speed,
      speedY: Math.sin(angle) * speed
    });
  }
}
    
function spawnModifiedRobotBullets() {
  if (tick % 90 !== 0 || robotWarnings.length > 0) return;

  robotWarnings = [];
  robotWarnTimer = 50;

  for (let i = 0; i < 6; i++) {
    const x = fightBox.x + Math.random() * fightBox.width;
    const y = fightBox.y + Math.random() * fightBox.height;
    robotWarnings.push({ x, y });
  }

  // 경고 후 발사 타이밍에 실제 탄환 생성
  setTimeout(() => {
    robotWarnings.forEach(pos => {
      const cx = pos.x;
      const cy = pos.y;
      const count = 8;
      const speed = showLeclerc ? 4.5 : 2.5; // 르클레르 효과

      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        bullets.push({
          x: cx,
          y: cy,
          width: 8,
          height: 8,
          speedX: Math.cos(angle) * speed,
          speedY: Math.sin(angle) * speed
        });
      }
    });

    screenShake = 6;
    flashTimer = 5;
    robotWarnings = [];
  }, robotWarnTimer * 16); // 대략 프레임 변환
}

function spawnSpiralBullets() {
  if (tick % 30 !== 0) return;
  const angleCount = 12;
  const centerX = fightBox.x + fightBox.width / 2;
  const centerY = fightBox.y + fightBox.height / 2;
  const speed = getSpeedWithLeclerc(2);
  for (let i = 0; i < angleCount; i++) {
    const angle = (tick / 10) + (i * (Math.PI * 2 / angleCount));
    bullets.push({
      x: centerX,
      y: centerY,
      width: 8,
      height: 8,
      speedX: Math.cos(angle) * speed,
      speedY: Math.sin(angle) * speed
    });
  }
}

function realWizardPattern() {
  if (enemy.patternIndex === undefined) enemy.patternIndex = 0;
  if (enemy.patternTimer === undefined) enemy.patternTimer = 0;

  const stage = enemy.patternIndex;
  const timer = enemy.patternTimer;

  if (timer === 0) bullets.length = 0;

  if (stage === 0) spawnMeteorExplosions();
  if (stage === 1) spawnHomingShotsTeleport();
  if (stage === 2) spawnInwardSpiral();
  if (stage === 3) spawnDelayedBlastCross();

  enemy.patternTimer++;

  if (enemy.patternTimer > 300) {
    enemy.patternIndex++;
    enemy.patternTimer = 0;

    if (enemy.patternIndex > 3) {
      enemy.patternIndex = 0;
      if (enemy.hp > 0) {
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + Math.floor(enemy.maxHp / 3));
        flashTimer = 15;
        screenShake = 8;
      }
    }
  }
}

function spawnMeteorExplosions() {
  if (tick % 45 === 0) {
    const meteor = {
      x: fightBox.x + Math.random() * (fightBox.width - 30),
      y: fightBox.y - 30,
      width: 30,
      height: 30,
      speedY: showLeclerc ? 4.5 : 2.5, // 르클레르 효과 적용
      starburst: true,
      timer: 40,
      blink: 0
    };
    bullets.push(meteor);
  }
}


function spawnHomingShotsTeleport() {
  if (tick % 60 !== 0) return;

  const burstCount = 3; // 동시 발사 수
  for (let i = 0; i < burstCount; i++) {
    const fromX = fightBox.x + Math.random() * fightBox.width;
    const fromY = fightBox.y + Math.random() * fightBox.height;

    const dx = (player.x + player.width / 2) - fromX;
    const dy = (player.y + player.height / 2) - fromY;
    const angle = Math.atan2(dy, dx);
    const speed = 2 + Math.random() * 1.5;

    bullets.push({
      x: fromX,
      y: fromY,
      width: 10,
      height: 10,
      speedX: Math.cos(angle) * speed,
      speedY: Math.sin(angle) * speed
    });
  }

  screenShake = 2;
  flashTimer = 4;
}


function spawnInwardSpiral() {
  if (tick % 10 !== 0) return;

  const centerX = fightBox.x + fightBox.width / 2;
  const centerY = fightBox.y + fightBox.height / 2;

  const radius = 200;
  const count = 12;

  for (let i = 0; i < count; i++) {
    const angle = (tick / 20) + (Math.PI * 2 * i / count);
    bullets.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      width: 6,
      height: 6,
      speedX: -Math.cos(angle) * 1.5,
      speedY: -Math.sin(angle) * 1.5
    });
  }
}

function spawnDelayedBlastCross() {
  if (tick % 80 !== 0) return;

  const dropCount = 5;
  for (let i = 0; i < dropCount; i++) {
    const offsetX = Math.random() * fightBox.width;
    const startX = fightBox.x + offsetX;
    const startY = fightBox.y - 20 - Math.random() * 40; // 위쪽 + 약간 위에서 시작
    const delay = 50 + Math.random() * 30; // 각자 폭발 딜레이 다름

    bullets.push({
      x: startX,
      y: startY,
      width: 14,
      height: 14,
      speedY: 1.8,
      delayBlast: true,
      timer: delay,
      blink: 0
    });
  }
}

function spawnSideBullets(count = 2) {
  if (tick % 20 !== 0) return;
  const baseSpeed = getSpeedWithLeclerc(2);
  for (let i = 0; i < count; i++) {
    bullets.push({
      x: i % 2 === 0 ? fightBox.x : fightBox.x + fightBox.width,
      y: fightBox.y + Math.random() * fightBox.height,
      width: 10,
      height: 10,
      speedX: i % 2 === 0 ? baseSpeed : -baseSpeed,
      horizontal: true
    });
  }
}

function spawnRandomBullets(count = 4) {
  if (tick % 24 !== 0) return;
  for (let i = 0; i < count; i++) {
    let x = fightBox.x + Math.random() * fightBox.width;
    x += (Math.random() - 0.5) * 60;
    x = Math.max(fightBox.x, Math.min(fightBox.x + fightBox.width - 10, x));
    bullets.push({
      x,
      y: fightBox.y,
      width: 10,
      height: 10,
      speedY: getSpeedWithLeclerc(2.5 + Math.random() * 1.5)
    });
  }
}

function spawnBouncingBullets() {
  if (tick % 30 !== 0) return;
  const count = 10;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = getSpeedWithLeclerc(1.2 + Math.random() * 0.8);
    bullets.push({
      x: fightBox.x + fightBox.width / 2 + (Math.random() * 40 - 20),
      y: fightBox.y + fightBox.height / 2 + (Math.random() * 40 - 20),
      width: 6,
      height: 6,
      speedX: Math.cos(angle) * speed,
      speedY: Math.sin(angle) * speed,
      bounce: true,
      bouncesLeft: 2
    });
  }
}

function spawnRisingBullets() {
  if (tick % 20 !== 0) return;
  const spawnCount = Math.random() < 0.5 ? 1 : 2;
  for (let i = 0; i < spawnCount; i++) {
    bullets.push({
      x: fightBox.x + Math.random() * fightBox.width,
      y: fightBox.y + fightBox.height + Math.random() * 20,
      width: 10,
      height: 10,
      speedY: -getSpeedWithLeclerc(1.8),
      fireExplode: true,
      flicker: true,
      baseX: Math.random() * Math.PI * 2
    });
  }
}

function spawnSlimeCornerSplits() {
  if (tick % 60 !== 0) return;

  const corners = [
    { x: fightBox.x, y: fightBox.y },
    { x: fightBox.x + fightBox.width, y: fightBox.y },
    { x: fightBox.x, y: fightBox.y + fightBox.height },
    { x: fightBox.x + fightBox.width, y: fightBox.y + fightBox.height },
  ];

  corners.forEach(corner => {
    let dx = player.x - corner.x;
    let dy = player.y - corner.y;
    const magnitude = Math.sqrt(dx * dx + dy * dy) || 1;
    const baseSpeed = magnitude / 60;
    const speedBonus = showLeclerc ? 2 : 0;
    const speed = baseSpeed + speedBonus;

    bullets.push({
      x: corner.x,
      y: corner.y,
      width: 12,
      height: 12,
      speedX: (dx / magnitude) * speed,
      speedY: (dy / magnitude) * speed
    });
  });
}
function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];

    // 기본 이동
    if (b.speedX) b.x += b.speedX;
    if (b.speedY) b.y += b.speedY;

    // 💨 탄막 수명 관리 (10초 후 제거)
    b.lifetime = (b.lifetime || 0) + 1;
    if (b.lifetime >= 600) {
      bullets.splice(i, 1);
      continue;
    }

    // 일렁임 효과 (불꽃)
    if (b.flicker) {
      b.x += Math.sin(tick / 5 + (b.baseY || b.baseX || 0)) * 0.5;
    }

    // 🔥 불 패턴 폭발
    if (b.fireExplode && b.y + b.height <= fightBox.y) {
      explodeFireBullet(b);
      bullets.splice(i, 1);
      continue;
    }

    // ☄️ 유성 폭발형
    if (b.starburst) {
      b.timer--;
      b.blink = (b.blink + 1) % 20;
      if (b.timer <= 0) {
        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        for (let j = 0; j < 12; j++) {
          const angle = (Math.PI * 2 * j) / 12;
          bullets.push({
            x: cx,
            y: cy,
            width: 8,
            height: 8,
            speedX: Math.cos(angle) * 2,
            speedY: Math.sin(angle) * 2
          });
        }
        screenShake = 5;
        flashTimer = 10;
        bullets.splice(i, 1);
        continue;
      }
    }

    // 💣 지연 폭발형 (십자탄)
    if (b.delayBlast) {
      b.timer--;
      b.blink = (b.blink + 1) % 20;
      if (b.timer <= 0) {
        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        const spread = [
          { dx: 0, dy: -3 },
          { dx: 0, dy: 3 },
          { dx: -3, dy: 0 },
          { dx: 3, dy: 0 }
        ];
        for (const dir of spread) {
          bullets.push({
            x: cx,
            y: cy,
            width: 8,
            height: 8,
            speedX: dir.dx,
            speedY: dir.dy
          });
        }
        screenShake = 4;
        flashTimer = 8;
        bullets.splice(i, 1);
        continue;
      }
    }

    // 💥 플레이어 피격
    if (!b.starburst && !b.delayBlast && detectCollision(player, b)) {
      b.y = -100;
      const rawDamage = enemy.atk;
      const defense = showLeclerc ? 3 : 0;
      const finalDamage = Math.max(1, rawDamage - defense);
      player.hp -= finalDamage;
      if (player.hp <= 0) {
        gameOver = true;
        gameWon = false;
      }
    }
  }
}

function explodeFireBullet(bullet) {
  const centerX = bullet.x + bullet.width / 2;
  const centerY = bullet.y + bullet.height / 2;
  const angleCount = 7;
  for (let i = 0; i < angleCount; i++) {
    const angle = (Math.PI * 2 / angleCount) * i;
    const speed = 2 + Math.random() * 0.5;
    bullets.push({
      x: centerX,
      y: centerY,
      width: 8,
      height: 8,
      speedX: Math.cos(angle) * speed,
      speedY: Math.sin(angle) * speed
    });
  }
  flashTimer = 5;
  screenShake = 2;
}
function evaluateAttack() {
  const center = 150;
  const dist = Math.abs(gaugeX - center);
  let damage = 1;
  if (dist < 10) damage = 5;
  else if (dist < 30) damage = 3;
  else if (dist < 60) damage = 2;

  enemy.hp -= damage * playerAttackPower;
  if (enemy.hp <= 0) {
    coins += enemy.coin || 0;
    currentEnemyIndex++;
    if (currentEnemyIndex >= enemies.length) {
      gameOver = true;
      gameWon = true;
      return;
    } else {
      enemy = enemies[currentEnemyIndex];
      applyDifficultyStats(enemy);  // 난이도 반영
      resetPlayerStats();           // 플레이어 회복
      if (enemy.nameKo.includes("고블린") || enemy.nameEn.includes("Goblin")) {
        isInShop = true;
      } else {
        turn = "enemy";
        attackTimer = attackDuration;
        bullets.length = 0;
      }
    }
  }
  


  isAttackGaugeActive = false;
  turn = "enemy";
  attackTimer = attackDuration;
  bullets.length = 0;
}
    
function drawRobotWarnings() {
  ctx.fillStyle = "rgba(255, 100, 100, 0.5)"; // 연한 빨강 (50% 투명도)
  robotWarnings.forEach(pos => {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawBullets() {
  bullets.forEach(b => {
    if (b.starburst && b.blink < 10) return; // 깜빡일 때 안 그림
    ctx.fillStyle = b.starburst ? "yellow" : "red";
    ctx.fillRect(b.x, b.y, b.width, b.height);
  });
}

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // ✅ 난이도 메뉴 중일 때 클릭 처리
  if (difficultyMenuActive) {
    // 난이도 박스 클릭
    for (let i = 0; i < difficultyOptions.length; i++) {
      const y = 230 + i * 60;
      if (mouseX >= 150 && mouseX <= 350 && mouseY >= y && mouseY <= y + 40) {
        selectedDifficultyIndex = i;
      }
    }

    // 언어 전환 버튼 클릭
    if (
      mouseX >= canvas.width - 90 &&
      mouseX <= canvas.width - 20 &&
      mouseY >= canvas.height - 50 &&
      mouseY <= canvas.height - 20
    ) {
      language = language === "ko" ? "en" : "ko";
    }

    return;
  }

  // ✅ 도움말 토글 클릭 (전투 화면 UI)
  if (
    mouseX >= 10 &&
    mouseX <= 190 &&
    mouseY >= canvas.height - 60 &&
    mouseY <= canvas.height - 20
  ) {
    showHelp = !showHelp;
  }

  // ✅ 언어 전환 버튼 클릭 (전투 중 UI)
  if (
    mouseX >= canvas.width - 80 &&
    mouseX <= canvas.width - 10 &&
    mouseY >= canvas.height - 40 &&
    mouseY <= canvas.height - 10
  ) {
    language = language === "ko" ? "en" : "ko";
  }
});

function drawUI() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 전투 박스 시각화
  ctx.strokeStyle = "white";
  ctx.strokeRect(fightBox.x, fightBox.y, fightBox.width, fightBox.height);

  // 플레이어 그리기
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // 적 정보 및 체력
  ctx.font = "20px Arial";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.fillText(language === "ko" ? enemy.nameKo : enemy.nameEn, canvas.width / 2, 30);

  drawEnemyImage();
  drawHealthBar(canvas.width / 2 - 75, 40, 150, 15, enemy.hp, enemy.maxHp, "red");

  // 플레이어 체력 바 및 UI
  drawHealthBar(20, 520, 150, 15, player.hp, player.maxHp, "lime");
  ctx.font = "16px Arial";
  ctx.fillStyle = "white";
  ctx.textAlign = "left";
 
  // 보유 골드: 체력바 위로 이동
  ctx.font = "14px Arial";
  ctx.fillText("🧪 아이템: " + player.items, 20, 470);  // ← 아이템 수 먼저 표시
  ctx.fillText("🪙 " + coins + "g", 20, 485);            // ← 기존 코인 표시


  // 게임오버 표시
  if (gameOver) {
    ctx.fillStyle = gameWon ? "lime" : "red";
    ctx.font = "40px Arial";
    ctx.textAlign = "center";
    ctx.fillText(text[gameWon ? "victory" : "gameOver"][language], canvas.width / 2, canvas.height / 2);
    ctx.font = "20px Arial";
    ctx.fillText(text.restartPrompt[language], canvas.width / 2, canvas.height / 2 + 40);
  }

  // 고블린 상점 UI
  
  // 고블린 상점 UI
  if (isInShop) {
    ctx.fillStyle = "black";
    ctx.fillRect(50, 250, 400, 130);
    ctx.strokeStyle = "white";
    ctx.strokeRect(50, 250, 400, 130);
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.textAlign = "left";
    ctx.fillText(text.shopTitle[language], 60, 270);
    const shopItems = text.shopItems[language];
    ctx.fillText("Z: " + shopItems[1], 60, 300); // 무기
    ctx.fillText("X: " + shopItems[0], 60, 330); // 아이템
    ctx.fillText(text.shopInstruction[language], 60, 360);
  }


  drawHelpUI();
  drawRobotWarnings();
}

function drawEnemyImage() {
  if (!enemy || !enemy.img) return;
  const img = enemy.img;
  if (img.complete) {
    const sway = Math.sin(tick / 20) * 5;
    const scale = enemy.scale || 1;
    const width = 64 * scale;
    const height = 64 * scale;
    ctx.drawImage(
      img,
      canvas.width / 2 - width / 2 + sway,
      70 - (scale - 1) * 32,
      width,
      height
    );
  }
}

function drawHelpUI() {
  ctx.fillStyle = "black";
  ctx.fillRect(10, canvas.height - 60, 180, showHelp ? 100 : 40);
  ctx.fillStyle = "white";
  ctx.font = "14px Arial";
  ctx.fillText(text.helpToggle[language], 20, canvas.height - 40);
  if (showHelp) {
    text.helpLines[language].forEach((line, i) => {
      ctx.fillText(line, 20, canvas.height - 25 + i * 15);
    });
  }
  ctx.fillStyle = "black";
  ctx.fillRect(canvas.width - 80, canvas.height - 40, 70, 30);
  ctx.fillStyle = "white";
  ctx.fillText(text.langLabel[language], canvas.width - 70, canvas.height - 20);
}

function updatePlayerMovement() {
  if (gameOver || isInShop) return;

  const speedBoost = showLeclerc ? 1 : 0;
  const actualSpeed = player.speed + speedBoost;

  if ((keys["ArrowLeft"] || keys["a"]) && player.x > fightBox.x)
    player.x -= actualSpeed;
  if ((keys["ArrowRight"] || keys["d"]) && player.x + player.width < fightBox.x + fightBox.width)
    player.x += actualSpeed;
  if ((keys["ArrowUp"] || keys["w"]) && player.y > fightBox.y)
    player.y -= actualSpeed;
  if ((keys["ArrowDown"] || keys["s"]) && player.y + player.height < fightBox.y + fightBox.height)
    player.y += actualSpeed;
}


(function () {
  let devtoolsOpen = false;
  const element = new Image();

  Object.defineProperty(element, 'id', {
    get: function () {
      devtoolsOpen = true;
      throw new Error("DevTools Detected");
    }
  });

  setInterval(function () {
    devtoolsOpen = false;
    console.dir(element);

    const devtoolsSizeOpen =
      window.outerWidth - window.innerWidth > 160 ||
      window.outerHeight - window.innerHeight > 160;

    if ((devtoolsOpen || devtoolsSizeOpen) && !debugAllowed) {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "red";
      ctx.font = "20px Arial";
      ctx.textAlign = "center";
      ctx.fillText("⚠️ 개발자 도구 감지됨 - 게임 중단 ⚠️", canvas.width / 2, canvas.height / 2);

      alert("개발자 도구 사용이 감지되어 게임이 종료되었습니다.");
      // 이후 입력 무시
      document.onkeydown = document.onkeyup = () => false;
    }
  }, 1000);
})();


document.addEventListener("keydown", (e) => {
  const preventList = ["z", "x", "c", " ", "p", "o", "Enter"];
  if (preventList.includes(e.key)) e.preventDefault();

  keys[e.key] = true;

  // 난이도 선택 메뉴 조작
  if (difficultyMenuActive) {
    if (["ArrowUp", "w"].includes(e.key)) {
      selectedDifficultyIndex = (selectedDifficultyIndex + 2) % 3;
    }
    if (["ArrowDown", "s"].includes(e.key)) {
      selectedDifficultyIndex = (selectedDifficultyIndex + 1) % 3;
    }
    if (e.key === "Enter") {
      difficulty = difficultyOptions[selectedDifficultyIndex];
      difficultyMenuActive = false;
      enemy = enemies[currentEnemyIndex];
      applyDifficultyStats(enemy);
      resetPlayerStats();
      startGameLoop();
    }
    if (e.key.toLowerCase() === "z") {
      language = language === "ko" ? "en" : "ko";
    }
    return;
  }
// 수동 적 변경 (P)
if (e.key.toLowerCase() === "p" && !isInShop && !gameOver) {
  const input = prompt("Enter enemy index (0 ~ " + (enemies.length - 1) + ") or keyword:");
  const keyword = (input || "").toLowerCase();
  const triggers = ["르클레르", "charles", "leclerc", "르끌레르"];

  // 르클레르 트리거 감지
  if (triggers.some(k => keyword.includes(k))) {
    showLeclerc = true;

    if (!leclercBuffApplied) {
      player.defenseBoost = 5;
      enemies.forEach(e => {
        e.atk += 2;
        e.speedBonus = (e.speedBonus || 0) + 2;
      });
      leclercBuffApplied = true;
    }

    alert(language === "ko"
      ? "🎉 르클레르의 축복! 방어력 +3 / 적 공격력 & 속도 증가"
      : "🎉 Blessing of Leclerc! +3 You got Defense / Enemies get faster & stronger");
    return;

  }

  // 기존 적 인덱스 변경 처리
  const index = parseInt(input);
  if (!isNaN(index) && index >= 0 && index < enemies.length) {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    currentEnemyIndex = index;
    enemy = enemies[currentEnemyIndex];
    applyDifficultyStats(enemy);
    resetPlayerStats();
    bullets.length = 0;
    gameOver = false;
    gameWon = false;
    turn = "player";
    isAttackGaugeActive = false;
    gaugeX = 0;
    tick = 0;
    robotWarnings = [];
    robotWarnTimer = 0;
    isInShop = (enemy.nameKo === "고블린 상점");
    startGameLoop();
  }

  return;
}


  // 게임 재시작 (스페이스)
  if (gameOver && e.key === " ") {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    currentEnemyIndex = 0;
    enemy = enemies[currentEnemyIndex];
    applyDifficultyStats(enemy);
    resetPlayerStats();
    player.items = 0;
    coins = 0;
    playerAttackPower = 1;
    gameOver = false;
    gameWon = false;
    bullets.length = 0;
    turn = "player";
    isAttackGaugeActive = false;
    gaugeX = 0;
    tick = 0;
    robotWarnings = [];
    robotWarnTimer = 0;
    isInShop = false;
    startGameLoop();
    return;
  }

  // 상점 조작
  if (isInShop) {
    if (e.key === "z" && coins >= 5) {
      coins -= 5;
      playerAttackPower += 0.5;
    } else if (e.key === "x" && coins >= 5) {
      coins -= 5;
      player.items++;
    } else if (e.key === "c") {
      isInShop = false;
      currentEnemyIndex++;
      if (currentEnemyIndex >= enemies.length) {
        gameOver = true;
        gameWon = true;
        return;
      }
      enemy = enemies[currentEnemyIndex];
      applyDifficultyStats(enemy);
      resetPlayerStats();
      turn = "enemy";
      attackTimer = attackDuration;
      bullets.length = 0;
    }
    return;
  }

  // 디버그용 코인 증가 (O키 → 비밀번호 인증)
  if (e.key.toLowerCase() === "o") {
    if (!cheatUnlocked) {
      const input = prompt("비밀번호를 입력하세요:");
      if (input === "1211") {
        cheatUnlocked = true;
        alert("디버그 모드가 활성화되었습니다.");
      } else {
        alert("비밀번호가 틀렸습니다.");
        return;
      }
    }
    coins++;
    return;
  }


  // 공격 게이지 타이밍 입력
  if (isAttackGaugeActive && [" ", "Enter", "z"].includes(e.key)) {
    evaluateAttack();
    return;
  }

  // 플레이어 턴 조작
  if (turn === "player" && !gameOver && !isAttackGaugeActive) {
    if (e.key === "z") {
      isAttackGaugeActive = true;
      gaugeX = 0;
    } else if (e.key === "x" && player.items > 0) {
      player.items--;
      player.hp = Math.min(player.hp + Math.floor(player.maxHp / 4), player.maxHp);
      turn = "enemy";
      attackTimer = attackDuration;
      bullets.length = 0;
    } else if (e.key === "c") {
      player.hp -= Math.floor(player.maxHp / 4);
      enemy.hp -= Math.floor(enemy.maxHp / 3);
      if (enemy.hp <= 0) {
        coins += enemy.coin || 0;
        currentEnemyIndex++;
        if (currentEnemyIndex >= enemies.length) {
          gameOver = true;
          gameWon = true;
          return;
        } else {
          enemy = enemies[currentEnemyIndex];
          applyDifficultyStats(enemy);
          resetPlayerStats();
          isInShop = (enemy.nameKo === "고블린 상점");
        }
      }
      turn = "enemy";
      attackTimer = attackDuration;
      bullets.length = 0;
    }
  }
});

let debugAllowed = sessionStorage.getItem("debugMode") === "true";

// O 키: 인증 또는 코인 증가
document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();

  if (key === "o") {
    if (!debugAllowed) {
      const pass = prompt("디버그 모드 비밀번호를 입력하세요:");
      if (pass === "1211") {
        debugAllowed = true;
        sessionStorage.setItem("debugMode", "true");
        alert("디버그 모드가 활성화되었습니다.");
      } else {
        alert("비밀번호가 틀렸습니다.");
      }
    } else {
      coins++;
    }
    e.preventDefault();
    return;
  }

  // 개발자 도구 차단
  if (!debugAllowed) {
    const blocked = (
      e.key === "F12" ||
      (e.ctrlKey && e.shiftKey && ["I", "i", "J", "j", "C", "c"].includes(e.key)) ||
      (e.ctrlKey && e.key === "U")
    );
    if (blocked) {
      e.preventDefault();
      alert("개발자 도구는 사용할 수 없습니다.");
    }
  }
});

// 키 해제 처리
document.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

// 창 크기로 개발자 도구 감지
let lastHeight = window.outerHeight;
setInterval(() => {
  if (!debugAllowed && window.outerHeight < lastHeight - 100) {
    alert("개발자 도구 사용이 감지되었습니다.");
  }
  lastHeight = window.outerHeight;
}, 1000);

const leclercImg = new Image();
leclercImg.src = "image/leclerc.webp"; // 반드시 영문명으로


function drawLeclerc() {
  if (!showLeclerc || !leclercImg.complete || leclercImg.naturalWidth === 0) return;

  const scale = 0.26; // 원하는 크기 비율
  const imgWidth = leclercImg.naturalWidth * scale;
  const imgHeight = leclercImg.naturalHeight * scale;
  const offsetX = canvas.width - imgWidth - 30;
  const offsetY = fightBox.y - imgHeight - 20;

  ctx.drawImage(leclercImg, offsetX, offsetY, imgWidth, imgHeight);
}
