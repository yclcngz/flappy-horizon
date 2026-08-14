/**
 * Flappy Horizon - Ana Oyun Motoru & Döngüsü
 * Fizik, Çarpışma, Skorlama, Kontroller, Ekran Sarsıntısı ve Durum Yönetimi.
 */

class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Oyun Çözünürlüğü (Dinamik ve Net)
        this.width = 440;
        this.height = 680;
        this.groundHeight = 85;

        // Oyun Durumları: 'MENU', 'PLAYING', 'GAMEOVER', 'PAUSED'
        this.state = 'MENU';

        // Karakter Fizik Değerleri (Akıcı, Dengeli ve Rahat Kontrol)
        this.player = {
            x: 90,
            y: 280,
            vy: 0,
            radius: 14,
            angle: 0,
            gravity: 0.20,       // Zayıflatılmış, yumuşak yerçekimi
            jumpForce: -4.8,      // Rahat ve dengeli zıplama kuvveti
            maxVy: 6.0,          // Maksimum düşüş hızı sınırı
            isFlapping: false
        };

        // Engeller ve Halkalar
        this.obstacles = [];
        this.rings = [];
        this.obstacleTimer = 0;
        this.obstacleInterval = 135; // Engeller arası rahat mesafe
        this.gapSize = 170;          // Genişletilmiş rahat geçiş aralığı
        this.baseSpeed = 2.2;        // Başlangıç hızı dengelendi
        this.speed = this.baseSpeed;

        // Skor ve İstatistikler
        this.score = 0;
        this.bestScore = 0;
        this.ringsCollected = 0;

        // Efektler
        this.screenShake = 0;

        this.initCanvasSize();
        this.loadBestScore();
        this.bindEvents();

        // Oyun Döngüsünü Başlat
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    initCanvasSize() {
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    loadBestScore() {
        try {
            const saved = localStorage.getItem('flappy_best_score');
            if (saved !== null) {
                this.bestScore = parseInt(saved, 10);
            }
        } catch (e) {}
    }

    saveBestScore() {
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            try {
                localStorage.setItem('flappy_best_score', this.bestScore);
            } catch (e) {}
        }
    }

    bindEvents() {
        // Klavye Kontrolleri (Space & ArrowUp)
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                e.preventDefault();
                this.handleAction();
            } else if (e.code === 'KeyP') {
                this.togglePause();
            }
        });

        // Fare & Dokunmatik Kontrolleri
        this.canvas.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            this.handleAction();
        });
    }

    handleAction() {
        if (this.state === 'MENU') {
            this.startPlay();
        } else if (this.state === 'PLAYING') {
            this.flap();
        } else if (this.state === 'GAMEOVER') {
            // Kısa bir bekleme sonrası yeniden başlatabilme
            if (this.gameOverCooldown <= 0) {
                this.startPlay();
            }
        }
    }

    flap() {
        if (this.state !== 'PLAYING') return;
        this.player.vy = this.player.jumpForce;
        this.player.isFlapping = true;
        this.wasClimbing = true;
        this.descentPlayed = false;
        setTimeout(() => { this.player.isFlapping = false; }, 120);

        const charType = window.characterManager.selectedCharacter;
        const charCfg = window.characterManager.getConfig();

        window.soundSystem.playJump(charType);
        window.particleEngine.emitTrail(this.player.x, this.player.y, charType, charCfg);
    }

    startPlay() {
        this.state = 'PLAYING';
        this.score = 0;
        this.ringsCollected = 0;
        this.speed = this.baseSpeed;
        this.player.y = this.height * 0.38;
        this.player.vy = -2.4; // Başlangıçta hafif yukarı süzülme ivmesi
        this.player.angle = -0.15;
        this.wasClimbing = true;
        this.descentPlayed = false;
        this.obstacles = [];
        this.rings = [];
        this.obstacleTimer = 0; // İlk engelin gelmesi için bolca zaman
        this.screenShake = 0;
        window.particleEngine.reset();

        document.getElementById('mainMenu').classList.add('hidden');
        document.getElementById('gameOverMenu').classList.add('hidden');
        document.getElementById('inGameHUD').classList.remove('hidden');
        this.updateHUD();

        window.soundSystem.startBGM();
    }

    gameOver() {
        if (this.state === 'GAMEOVER') return;
        this.state = 'GAMEOVER';
        this.gameOverCooldown = 25; // 25 frame bekleme
        this.screenShake = 16;

        this.saveBestScore();

        const charType = window.characterManager.selectedCharacter;
        // Karaktere özel çarpışma / patlama sesi
        window.soundSystem.playCharacterCrash(charType);

        setTimeout(() => {
            window.soundSystem.playGameOver();
        }, 320);

        window.particleEngine.emitExplosion(this.player.x, this.player.y);

        // Game Over Ekranını Doldur & Göster
        document.getElementById('inGameHUD').classList.add('hidden');
        this.showGameOverUI();
    }

    showGameOverUI() {
        const goMenu = document.getElementById('gameOverMenu');
        document.getElementById('finalScore').innerText = this.score;
        document.getElementById('finalBestScore').innerText = this.bestScore;

        // Madalya Değerlendirmesi
        const medalContainer = document.getElementById('medalContainer');
        let medalHTML = '';
        if (this.score >= 50) {
            medalHTML = '<span class="medal diamond">💎 Efsanevi Elmas</span>';
        } else if (this.score >= 30) {
            medalHTML = '<span class="medal gold">🥇 Altın Kupa</span>';
        } else if (this.score >= 15) {
            medalHTML = '<span class="medal silver">🥈 Gümüş Madalya</span>';
        } else if (this.score >= 5) {
            medalHTML = '<span class="medal bronze">🥉 Bronz Rozet</span>';
        } else {
            medalHTML = '<span class="medal none">🎖️ Çaylak Uçucu</span>';
        }
        medalContainer.innerHTML = medalHTML;

        // Yeni Rekor Bildirimi
        const newRecordBadge = document.getElementById('newRecordBadge');
        if (this.score === this.bestScore && this.score > 0) {
            newRecordBadge.classList.remove('hidden');
        } else {
            newRecordBadge.classList.add('hidden');
        }

        goMenu.classList.remove('hidden');
    }

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            document.getElementById('pauseOverlay').classList.remove('hidden');
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            document.getElementById('pauseOverlay').classList.add('hidden');
        }
    }

    update() {
        if (this.gameOverCooldown > 0) {
            this.gameOverCooldown--;
        }

        // Ekran Titremesi Sönümleme
        if (this.screenShake > 0) {
            this.screenShake *= 0.88;
            if (this.screenShake < 0.3) this.screenShake = 0;
        }

        // Parçacıklar ve Animasyon Güncellemesi
        window.characterManager.updateAnimation(this.player.isFlapping);
        window.particleEngine.update(this.width, this.height);

        if (this.state === 'MENU') {
            // Menüde süzülme animasyonu
            this.player.y = (this.height * 0.45) + Math.sin(Date.now() * 0.005) * 12;
            this.player.angle = Math.sin(Date.now() * 0.004) * 0.1;
            window.levelManager.update(1.2);
            return;
        }

        if (this.state !== 'PLAYING') return;

        // Fizik & Hızlanma
        this.speed = this.baseSpeed + Math.min(this.score * 0.04, 2.2);
        window.levelManager.update(this.speed);

        this.player.vy = Math.min(this.player.vy + this.player.gravity, this.player.maxVy);
        this.player.y += this.player.vy;

        // Karakter Açısal Eğimi (Kafasını kaldırma / yumuşak süzülme açısı)
        if (this.player.vy < 0) {
            this.player.angle = Math.max(-0.4, this.player.vy * 0.08);
        } else {
            this.player.angle = Math.min(0.7, this.player.angle + 0.025);
        }

        // Uçarken arkada hafif itki izi bırakma & Karakter özel sesleri
        const charType = window.characterManager.selectedCharacter;
        const charCfg = window.characterManager.getConfig();

        if (Math.random() > 0.4) {
            window.particleEngine.emitTrail(this.player.x, this.player.y, charType, charCfg);
        }

        // İnişe geçiş anı süzülme sesi (Karakter zıplama zirvesinden inişe geçtiği an)
        if (this.wasClimbing && this.player.vy >= 0.0 && !this.descentPlayed) {
            this.descentPlayed = true;
            this.wasClimbing = false;
            window.soundSystem.playDescent(charType);
        }

        // Zemin ve Tavan Çarpışma Kontrolü
        const groundLimit = this.height - this.groundHeight - this.player.radius;
        if (this.player.y >= groundLimit) {
            this.player.y = groundLimit;
            this.gameOver();
            return;
        }
        if (this.player.y <= this.player.radius) {
            this.player.y = this.player.radius;
            this.player.vy = 0;
        }

        // Yeni Engel ve Halka Üretimi
        this.obstacleTimer++;
        if (this.obstacleTimer >= this.obstacleInterval) {
            this.obstacleTimer = 0;
            this.spawnObstacle();
        }

        // Engelleri Güncelle & Çarpışma Kontrolü
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.x -= this.speed;

            // Skor Sayımı
            if (!obs.passed && obs.x + obs.width < this.player.x) {
                obs.passed = true;
                this.score++;
                window.soundSystem.playScore();
                this.updateHUD();
            }

            // Çarpışma Testi
            if (this.checkObstacleCollision(obs)) {
                this.gameOver();
                return;
            }

            // Ekrandan çıkan engelleri sil
            if (obs.x + obs.width < -50) {
                this.obstacles.splice(i, 1);
            }
        }

        // Halkaları Güncelle & Toplama Kontrolü
        for (let i = this.rings.length - 1; i >= 0; i--) {
            const ring = this.rings[i];
            ring.x -= this.speed;

            if (!ring.collected) {
                const dist = Math.hypot(this.player.x - ring.x, this.player.y - ring.y);
                if (dist < this.player.radius + ring.radius) {
                    ring.collected = true;
                    this.score += 2; // Bonus +2 puan
                    this.ringsCollected++;
                    window.soundSystem.playRing();
                    window.particleEngine.emitRingBurst(ring.x, ring.y, window.levelManager.getCurrentLevel().ringColor);
                    this.updateHUD();
                }
            }

            if (ring.x < -50) {
                this.rings.splice(i, 1);
            }
        }
    }

    spawnObstacle() {
        const obsWidth = 64;
        const minTop = 60;
        const maxTop = this.height - this.groundHeight - this.gapSize - 60;
        const topHeight = Math.floor(Math.random() * (maxTop - minTop + 1)) + minTop;
        const bottomY = topHeight + this.gapSize;

        this.obstacles.push({
            x: this.width + 20,
            width: obsWidth,
            topY: topHeight,
            bottomY: bottomY,
            passed: false
        });

        // Seviye izin veriyorsa veya rastgele %60 ihtimalle araya neon halka yerleştir
        const lvl = window.levelManager.getCurrentLevel();
        if (lvl.hasRings || Math.random() > 0.4) {
            this.rings.push({
                x: this.width + 20 + obsWidth / 2,
                y: topHeight + this.gapSize / 2,
                radius: 22,
                collected: false
            });
        }
    }

    checkObstacleCollision(obs) {
        const px = this.player.x;
        const py = this.player.y;
        const r = this.player.radius * 0.82; // Hassas hitbox

        // Üst Engel Kontrolü
        if (px + r > obs.x && px - r < obs.x + obs.width) {
            if (py - r < obs.topY) {
                return true;
            }
            if (py + r > obs.bottomY) {
                return true;
            }
        }
        return false;
    }

    updateHUD() {
        document.getElementById('liveScore').innerText = this.score;
        document.getElementById('liveBestScore').innerText = Math.max(this.score, this.bestScore);
        document.getElementById('liveLevelName').innerText = window.levelManager.getCurrentLevel().name;
    }

    render() {
        this.ctx.save();

        // Ekran Sarsıntısı (Screen Shake)
        if (this.screenShake > 0) {
            const shakeX = (Math.random() - 0.5) * this.screenShake;
            const shakeY = (Math.random() - 0.5) * this.screenShake;
            this.ctx.translate(shakeX, shakeY);
        }

        // 1. Arka Plan & Atmosfer Katmanları
        window.levelManager.drawBackground(this.ctx, this.width, this.height);

        // 2. Parçacıklar (Arka plan hava & itki)
        window.particleEngine.draw(this.ctx);

        // 3. Engeller
        for (let obs of this.obstacles) {
            window.levelManager.drawObstacle(
                this.ctx,
                obs.x,
                obs.topY,
                obs.bottomY,
                this.width,
                this.height,
                this.groundHeight
            );
        }

        // 4. Halkalar
        for (let ring of this.rings) {
            window.levelManager.drawRing(this.ctx, ring.x, ring.y, ring.radius, ring.collected);
        }

        // 5. Zemin
        window.levelManager.drawGround(this.ctx, this.width, this.height, this.groundHeight);

        // 6. Ana Karakter
        window.characterManager.draw(
            this.ctx,
            this.player.x,
            this.player.y,
            this.player.angle,
            null,
            1
        );

        this.ctx.restore();
    }

    gameLoop(timestamp) {
        this.update();
        this.render();
        requestAnimationFrame((t) => this.gameLoop(t));
    }
}

window.gameEngine = null;
window.addEventListener('DOMContentLoaded', () => {
    window.gameEngine = new GameEngine();
});
