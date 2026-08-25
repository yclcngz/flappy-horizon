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

        // Kapalı Sütun & Pencere Sistemi
        this.normalObstacleCount = 0; // Son kapalı sütundan bu yana normal engel sayısı
        this.windowSoundCooldown = 0; // Pencere sesi cooldown

        // Skor ve İstatistikler
        this.score = 0;
        this.bestScore = 0;
        this.ringsCollected = 0;

        // Can Sistemi (3 Kalp)
        this.lives = 3;
        this.maxLives = 3;
        this.invincible = false;
        this.invincibleTimer = 0;
        this.invincibleDuration = 90; // ~1.5 saniye dokunulmazlık (60fps)

        // Zafer Kontrolü
        this.victoryScore = Infinity;
        this.isVictory = false;

        // Kamera Yönlendirmesi (Kademeli ve Ani Değişimler İçin)
        this.cameraAngle = 0;
        this.targetCameraAngle = 0;
        this.lastRotationScore = 0; // Ani değişimleri kontrol etmek için

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
        this.cameraAngle = 0;
        this.targetCameraAngle = 0;
        this.lastRotationScore = 0;
        this.player.y = this.height * 0.38;
        this.player.vy = -2.4;
        this.player.angle = -0.15;
        this.wasClimbing = true;
        this.descentPlayed = false;
        this.normalObstacleCount = 0;
        this.windowSoundCooldown = 0;
        this.obstacles = [];
        this.rings = [];
        this.obstacleTimer = 0;
        this.screenShake = 0;

        // Can Sistemi Sıfırla
        this.lives = this.maxLives;
        this.invincible = false;
        this.invincibleTimer = 0;
        this.isVictory = false;
        this.updateHeartsUI();

        window.particleEngine.reset();

        document.getElementById('mainMenu').classList.add('hidden');
        document.getElementById('gameOverMenu').classList.add('hidden');
        document.getElementById('victoryScreen').classList.add('hidden');
        document.getElementById('inGameHUD').classList.remove('hidden');
        this.updateAutoLevel();
        this.updateHUD();

        window.soundSystem.startBGM();
    }

    gameOver() {
        if (this.state === 'GAMEOVER') return;
        this.state = 'GAMEOVER';
        this.gameOverCooldown = 25;
        this.screenShake = 16;

        this.saveBestScore();
        window.soundSystem.stopBGM();

        const charType = window.characterManager.selectedCharacter;
        window.soundSystem.playCharacterCrash(charType);

        setTimeout(() => {
            window.soundSystem.playGameOver();
        }, 320);

        window.particleEngine.emitExplosion(this.player.x, this.player.y);

        document.getElementById('inGameHUD').classList.add('hidden');

        // Leaderboard kontrolü
        const isTop10 = window.leaderboardManager && window.leaderboardManager.isTop10(this.score);
        if (isTop10 && this.score > 0) {
            // İsim girişi modali göster
            setTimeout(() => {
                window.leaderboardManager.showNameInput(this.score);
            }, 800);
        } else {
            this.showGameOverUI();
        }
    }

    // Zafer Kontrolü (Skor 100)
    checkVictory() {
        if (this.score >= this.victoryScore && !this.isVictory) {
            this.isVictory = true;
            this.state = 'GAMEOVER';
            this.saveBestScore();
            window.soundSystem.stopBGM();

            // Zafer efektleri
            setTimeout(() => {
                window.soundSystem.playVictory();
            }, 200);

            // Konfeti patlatma
            this.launchConfetti();

            // Zafer ekranı
            document.getElementById('inGameHUD').classList.add('hidden');
            document.getElementById('victoryScore').innerText = this.score;
            document.getElementById('victoryScreen').classList.remove('hidden');

            // Leaderboard'a kaydet
            if (window.leaderboardManager) {
                setTimeout(() => {
                    if (window.leaderboardManager.isTop10(this.score)) {
                        document.getElementById('victoryScreen').classList.add('hidden');
                        window.leaderboardManager.showNameInput(this.score, true);
                    }
                }, 2500);
            }
        }
    }

    // Konfeti Patlatma
    launchConfetti() {
        const container = document.getElementById('confettiContainer');
        container.classList.remove('hidden');
        container.innerHTML = '';
        const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f7dc6f', '#bb86fc', '#ff8a65'];
        for (let i = 0; i < 60; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.left = Math.random() * 100 + '%';
            piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            piece.style.animationDuration = (2 + Math.random() * 2) + 's';
            piece.style.animationDelay = (Math.random() * 1.5) + 's';
            container.appendChild(piece);
        }
        setTimeout(() => {
            container.classList.add('hidden');
            container.innerHTML = '';
        }, 5000);
    }

    // Can Kaybetme (Dokunulmazlık ile)
    loseLife() {
        if (this.invincible) return false; // Dokunulmazlık aktif, can gitmiyor

        this.lives--;
        this.screenShake = 10;
        this.updateHeartsUI();

        const charType = window.characterManager.selectedCharacter;
        window.soundSystem.playCharacterCrash(charType);

        if (this.lives <= 0) {
            return true; // Oyun bitti
        }

        // Dokunulmazlık başlat
        this.invincible = true;
        this.invincibleTimer = this.invincibleDuration;
        this.player.vy = this.player.jumpForce * 0.6; // Hafif yukarı sekme
        return false; // Devam et
    }

    // Kalp Göstergesini Güncelle
    updateHeartsUI() {
        for (let i = 1; i <= this.maxLives; i++) {
            const heart = document.querySelector(`.heart[data-heart="${i}"]`);
            if (!heart) continue;
            if (i > this.lives) {
                heart.classList.add('lost');
                if (i === this.lives + 1) {
                    heart.classList.add('hit');
                    setTimeout(() => heart.classList.remove('hit'), 400);
                }
            } else {
                heart.classList.remove('lost', 'hit');
            }
        }
    }

    showGameOverUI() {
        const goMenu = document.getElementById('gameOverMenu');
        document.getElementById('finalScore').innerText = this.score;
        document.getElementById('finalBestScore').innerText = this.bestScore;

        // Madalya Değerlendirmesi
        const medalContainer = document.getElementById('medalContainer');
        let medalHTML = '';
        if (this.score >= 200) {
            medalHTML = '<span class="medal diamond">💎 Efsanevi Elmas</span>';
        } else if (this.score >= 100) {
            medalHTML = '<span class="medal gold">🥇 Altın Kupa</span>';
        } else if (this.score >= 50) {
            medalHTML = '<span class="medal silver">🥈 Gümüş Madalya</span>';
        } else if (this.score >= 20) {
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

        // Fizik & Hızlanma (Kademeli Zorluk - Yerçekimi SABİT)
        this.speed = this.baseSpeed + Math.min(this.score * 0.02, 1.8);
        const currentGap = Math.max(140, 170 - this.score * 0.3);
        this.gapSize = currentGap;
        const currentInterval = Math.max(105, 135 - this.score * 0.3);
        this.obstacleInterval = currentInterval;

        // Skor bazlı otomatik arka plan değişimi
        this.updateAutoLevel();
        this.updateCameraRotation();

        // Zafer kontrolü
        this.checkVictory();
        if (this.isVictory) return;

        window.levelManager.update(this.speed);

        // Dokunulmazlık zamanlayıcısı
        if (this.invincible) {
            this.invincibleTimer--;
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
            }
        }

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
            if (this.loseLife()) {
                this.gameOver();
            }
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

        // Pencere sesi cooldown
        if (this.windowSoundCooldown > 0) this.windowSoundCooldown--;

        // Engelleri Güncelle & Çarpışma Kontrolü
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.x -= this.speed;

            // Kapalı Sütun Pencere Animasyonu
            if (obs.isWalled && obs.window) {
                const w = obs.window;
                w.timer += 1;

                // Phase-based açılma/kapanma döngüsü
                if (w.timer >= w.cycleDuration) {
                    w.timer = 0;
                    if (w.phase === 'open') {
                        w.phase = 'closing';
                        w.isOpen = false;
                        w.cycleDuration = w.closeDuration;
                    } else {
                        w.phase = 'open';
                        w.isOpen = true;
                        w.cycleDuration = w.openDuration;
                    }
                }

                // Pürüzsüz açılma/kapanma animasyonu
                const animSpeed = 0.08;
                if (w.isOpen) {
                    w.openProgress = Math.min(1.0, w.openProgress + animSpeed);
                } else {
                    w.openProgress = Math.max(0.0, w.openProgress - animSpeed);
                }
            }

            // Skor Sayımı
            if (!obs.passed && obs.x + obs.width < this.player.x) {
                obs.passed = true;
                this.score += obs.isWalled ? 3 : 1; // Kapalı sütun = 3 puan bonus
                window.soundSystem.playScore();
                this.updateHUD();
            }

            // Çarpışma Testi
            if (this.checkObstacleCollision(obs)) {
                if (this.loseLife()) {
                    this.gameOver();
                }
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
        this.normalObstacleCount++;

        // Her 3-5 normal engelden sonra bir kapalı sütun (pencereli duvar) üret
        const shouldSpawnWall = this.normalObstacleCount >= 3 + Math.floor(Math.random() * 3);

        if (shouldSpawnWall) {
            this.normalObstacleCount = 0;
            this.spawnWalledObstacle(obsWidth);
            return;
        }

        // Normal açık boşluklu engel
        const minTop = 60;
        const maxTop = this.height - this.groundHeight - this.gapSize - 60;
        const topHeight = Math.floor(Math.random() * (maxTop - minTop + 1)) + minTop;
        const bottomY = topHeight + this.gapSize;

        this.obstacles.push({
            x: this.width + 20,
            width: obsWidth,
            topY: topHeight,
            bottomY: bottomY,
            passed: false,
            isWalled: false
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

    // Kapalı Sütun + Açılır/Kapanır Pencere Üretici
    // Zamanlama: Oyun hızıyla senkronize - karakter ulaştığında pencere açık olur
    spawnWalledObstacle(obsWidth) {
        const playArea = this.height - this.groundHeight;
        const windowHeight = 150; // Rahat geçiş penceresi
        const minWindowY = 70;
        const maxWindowY = playArea - windowHeight - 40;
        const windowY = Math.floor(Math.random() * (maxWindowY - minWindowY + 1)) + minWindowY;

        // Hıza göre senkronize zamanlama hesaplaması:
        // Sütun ekrandan karakter konumuna kadar ne kadar sürede gelir?
        const distanceToPlayer = (this.width + 20) - this.player.x;
        const framesToReach = Math.ceil(distanceToPlayer / this.speed);

        // Pencere açık süresi: Karakter ulaşıp geçecek kadar uzun
        // Geçiş süresi = sütun genişliği / hız (frame) + güvenlik payı
        const framesToCross = Math.ceil(obsWidth / this.speed) + 20;

        // Açık kalma süresi: Karakter geçişi + %50 güvenlik payı
        const openDuration = framesToCross + Math.floor(framesToCross * 0.5);
        // Kapalı kalma süresi: Kısa ve hıza bağlı (ileri seviyelerde zorluk)
        const closeDuration = Math.max(25, Math.floor(40 - this.score * 0.15));

        // Toplam döngü süresi
        const totalCycle = openDuration + closeDuration;

        // Pencere, karakter ulaştığında açık olacak şekilde başlangıç timer ayarla
        // Pencere açık başlar, karakter geldiğinde açık döngüdedir
        const startTimer = Math.max(0, framesToReach % totalCycle);

        this.obstacles.push({
            x: this.width + 20,
            width: obsWidth,
            topY: 0,
            bottomY: playArea,
            passed: false,
            isWalled: true,
            window: {
                y: windowY,
                height: windowHeight,
                isOpen: true,             // Her zaman açık başla
                openProgress: 1.0,        // Tam açık
                timer: 0,
                phase: 'open',            // 'open' veya 'closing'
                openDuration: openDuration,
                closeDuration: closeDuration,
                cycleDuration: openDuration // İlk döngü açık
            }
        });
    }

    checkObstacleCollision(obs) {
        const px = this.player.x;
        const py = this.player.y;
        const r = this.player.radius * 0.82; // Hassas hitbox

        // Karakter sütunun x aralığında mı?
        if (px + r > obs.x && px - r < obs.x + obs.width) {

            if (obs.isWalled && obs.window) {
                // Kapalı Sütun: Pencere açıksa pencereden geçebilir
                const w = obs.window;
                const currentWindowH = w.height * w.openProgress;
                const windowCenter = w.y + w.height / 2;
                const windowTop = windowCenter - currentWindowH / 2;
                const windowBottom = windowCenter + currentWindowH / 2;

                // Pencere yeterince açık değilse veya karakter pencere dışında
                if (w.openProgress < 0.3) {
                    // Pencere kapalı, tüm sütun duvar
                    return true;
                }

                // Pencere aralığı dışındaysa çarpışma
                if (py - r < windowTop || py + r > windowBottom) {
                    return true;
                }

                // Pencere içinde, güvenli geçiş
                return false;

            } else {
                // Normal engel: Üst veya alt boruya çarptı mı?
                if (py - r < obs.topY) {
                    return true;
                }
                if (py + r > obs.bottomY) {
                    return true;
                }
            }
        }
        return false;
    }

    updateHUD() {
        document.getElementById('liveScore').innerText = this.score;
        document.getElementById('liveBestScore').innerText = Math.max(this.score, this.bestScore);
        document.getElementById('liveLevelName').innerText = window.levelManager.getCurrentLevel().name;
    }

    // Skor bazlı otomatik arka plan değişimi
    updateAutoLevel() {
        // Her 50 puanda bir mekan değişsin ve 5 mekan arasında sonsuz döngü yapsın
        let targetLevel = Math.floor(this.score / 50) % 5;

        if (window.levelManager.currentLevelIndex !== targetLevel) {
            window.levelManager.setLevel(targetLevel);
            this.updateHUD();
        }
    }

    // Kamera yönü (Yerçekimi / Akış yönü) güncellemesi
    updateCameraRotation() {
        let diff = this.targetCameraAngle - this.cameraAngle;
        // Yumuşak dönüş için en kısa yolu bul
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        
        this.cameraAngle += diff * 0.05;

        if (this.state !== 'PLAYING') return;

        // Seviyelere göre yön belirleme
        if (this.score < 40) {
            this.targetCameraAngle = 0; // Normal (Soldan Sağa)
        } else if (this.score < 80) {
            this.targetCameraAngle = -90; // Aşağıdan Yukarıya (Zemin sağda)
        } else if (this.score < 120) {
            this.targetCameraAngle = 180; // Sağdan Sola (Zemin tepede)
        } else if (this.score < 160) {
            this.targetCameraAngle = 90; // Yukarıdan Aşağıya (Zemin solda)
        } else {
            // En zor seviye: Anlık ve rastgele değişim (her 20 puanda bir)
            if (this.score - this.lastRotationScore >= 20) {
                const angles = [0, 90, 180, -90];
                // Mevcut yönden farklı rastgele bir yön seç
                let possibleAngles = angles.filter(a => a !== this.targetCameraAngle);
                let newAngle = possibleAngles[Math.floor(Math.random() * possibleAngles.length)];
                
                this.targetCameraAngle = newAngle;
                this.lastRotationScore = this.score;
            }
        }
    }

    render() {
        this.ctx.save();

        // Kamera Rotasyonu Uygulaması
        if (Math.abs(this.cameraAngle) > 0.01) {
            this.ctx.translate(this.width / 2, this.height / 2);
            this.ctx.rotate(this.cameraAngle * Math.PI / 180);
            
            // Eğer açı 90 veya -90 dereceye yakınsa (yatay/dikey değişimi),
            // ekranın taşmamasını sağlamak için ölçekleme uygula (440 / 680)
            // Yumuşak geçiş için açının kosinüsü ile oranlayalım
            const isVertical = Math.abs(Math.sin(this.cameraAngle * Math.PI / 180));
            const scaleFactor = 1.0 - (1.0 - (this.width / this.height)) * isVertical;
            this.ctx.scale(scaleFactor, scaleFactor);
            
            this.ctx.translate(-this.width / 2, -this.height / 2);
        }

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
                this.groundHeight,
                obs  // Kapalı sütun verisi (isWalled, window)
            );
        }

        // 4. Halkalar
        for (let ring of this.rings) {
            window.levelManager.drawRing(this.ctx, ring.x, ring.y, ring.radius, ring.collected);
        }

        // 5. Zemin
        window.levelManager.drawGround(this.ctx, this.width, this.height, this.groundHeight);

        // 6. Ana Karakter (Dokunulmazlıkta yanıp sönme)
        if (this.invincible && Math.floor(Date.now() / 80) % 2 === 0) {
            this.ctx.globalAlpha = 0.35;
        }
        window.characterManager.draw(
            this.ctx,
            this.player.x,
            this.player.y,
            this.player.angle,
            null,
            1
        );
        this.ctx.globalAlpha = 1.0;

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
