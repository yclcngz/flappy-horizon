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

        // Engeller ve Halkalar/Altınlar
        this.obstacles = [];
        this.collectibles = [];
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
        this.goldBalance = 0;
        this.upgrades = {}; // Market yükseltmeleri

        // Can Sistemi
        this.startLives = 3;
        this.maxLives = 5;
        this.lives = this.startLives;
        this.invincible = false;
        this.invincibleTimer = 0;
        this.invincibleDuration = 90; // ~1.5 saniye dokunulmazlık (60fps)

        // Can Kazanma Bekleme Süresi (Cooldown)
        this.extraLifeCooldown = 0; // Bir sonraki butonu açmak için uçulması gereken skor (başlangıçta 0)

        // Güç Kapsülleri (Power-Ups)
        this.powerUps = [];
        this.activePowerUp = null; // 'shield', 'tornado', 'time', 'magnet'
        this.powerUpTimer = 0;
        this.powerUpDuration = 0;
        
        // Hareketli Düşmanlar (Homing Missiles / Drones)
        this.enemies = [];

        // Zafer Kontrolü
        this.victoryScore = Infinity;
        this.isVictory = false;

        // Kamera Yönlendirmesi (Kademeli ve Ani Değişimler İçin)
        this.cameraAngle = 0;
        this.targetCameraAngle = 0;
        this.cameraScaleX = 1;
        this.targetCameraScaleX = 1;
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
            const savedScore = localStorage.getItem('flappy_best_score');
            if (savedScore !== null) {
                this.bestScore = parseInt(savedScore, 10);
            }
            
            const savedGold = localStorage.getItem('flappy_gold_balance');
            if (savedGold !== null) {
                this.goldBalance = parseInt(savedGold, 10);
            }
            
            const savedUpgrades = localStorage.getItem('flappy_upgrades');
            if (savedUpgrades !== null) {
                this.upgrades = JSON.parse(savedUpgrades);
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
    
    saveGold() {
        try {
            localStorage.setItem('flappy_gold_balance', this.goldBalance);
        } catch (e) {}
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
        
        // Pause Overlay'e tıklanınca devam et (Mobil için)
        const pauseOverlay = document.getElementById('pauseOverlay');
        if (pauseOverlay) {
            pauseOverlay.addEventListener('click', () => {
                if (this.state === 'PAUSED') {
                    this.togglePause();
                }
            });
        }
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
        this.cameraScaleX = 1;
        this.targetCameraScaleX = 1;
        this.lastRotationScore = 0;
        this.player.y = this.height * 0.38;
        this.player.vy = -2.4;
        this.player.angle = -0.15;
        this.wasClimbing = true;
        this.descentPlayed = false;
        this.normalObstacleCount = 0;
        this.windowSoundCooldown = 0;
        this.obstacles = [];
        this.collectibles = [];
        this.powerUps = [];
        this.activePowerUp = null;
        this.powerUpTimer = 0;
        this.obstacleTimer = 0;
        this.screenShake = 0;

        // Can Sistemi Sıfırla
        this.lives = this.startLives;
        this.invincible = false;
        this.invincibleTimer = 0;
        this.isVictory = false;
        this.extraLifeCooldown = 0; // Bekleme süresi sıfırlanır
        this.updateHeartsUI();

        window.particleEngine.reset();

        document.getElementById('mainMenu').classList.add('hidden');
        document.getElementById('welcomeProfileMenu').classList.add('hidden');
        document.getElementById('gameOverMenu').classList.add('hidden');
        document.getElementById('victoryScreen').classList.add('hidden');
        document.getElementById('inGameHUD').classList.remove('hidden');
        this.updateAutoLevel();
        this.updateHUD();

        window.soundSystem.startBGM();
    }
    
    startMathPause(obs) {
        this.state = 'MATH_PAUSED';
        this.mathPauseTimer = 10;
        this.player.vy = 0; // Karakter havada asılı kalsın
        this.player.gravity = 0;
        
        // Modalı güncelle ve aç
        const modal = document.getElementById('mathGatePauseModal');
        const qUI = document.getElementById('mathModalQuestion');
        const ansTop = document.getElementById('mathModalAnsTop');
        const ansBottom = document.getElementById('mathModalAnsBottom');
        const timerUI = document.getElementById('mathModalTimer');
        
        if (modal && qUI && ansTop && ansBottom && timerUI) {
            qUI.innerText = obs.question;
            ansTop.innerText = obs.topVal;
            ansBottom.innerText = obs.bottomVal;
            timerUI.innerText = this.mathPauseTimer;
            modal.classList.remove('hidden');
        }
        
        // 1 saniyelik aralıklarla sayacı düşür
        this.mathInterval = setInterval(() => {
            this.mathPauseTimer--;
            if (timerUI) timerUI.innerText = this.mathPauseTimer;
            
            if (this.mathPauseTimer <= 0) {
                this.resumeFromMathPause();
            }
        }, 1000);
    }
    
    resumeFromMathPause() {
        if (this.state !== 'MATH_PAUSED') return;
        
        clearInterval(this.mathInterval);
        const modal = document.getElementById('mathGatePauseModal');
        if (modal) modal.classList.add('hidden');
        
        this.state = 'PLAYING';
        this.player.gravity = 0.20; // Yerçekimini geri ver
        this.player.vy = -2.0; // Ufak bir sıçramayla başlasın
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
        this.updateHUD();

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
            heart.style.display = 'inline-block'; // Max cana dahilse göster
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
        document.getElementById('finalBestScore').innerText = Math.max(this.score, this.bestScore);
        
        let title = "Acemi Pilot";
        if (this.score >= 1500) title = "👑 Efsanevi Kral";
        else if (this.score >= 1000) title = "✨ Usta Pilot";
        else if (this.score >= 500) title = "🔥 Yetenekli Sürücü";
        
        let titleEl = document.getElementById('playerTitle');
        if (!titleEl) {
            titleEl = document.createElement('div');
            titleEl.id = 'playerTitle';
            titleEl.style.color = '#fbbf24';
            titleEl.style.fontSize = '1.2rem';
            titleEl.style.marginBottom = '10px';
            document.getElementById('finalScore').parentNode.insertBefore(titleEl, document.getElementById('finalScore'));
        }
        titleEl.innerText = title;

        goMenu.classList.remove('hidden');
        window.soundSystem.playGameOver();

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
            document.getElementById('pauseOverlay').classList.add('hidden');
            this.state = 'COUNTDOWN';
            
            const countdownOverlay = document.getElementById('countdownOverlay');
            const countdownText = document.getElementById('countdownText');
            countdownOverlay.classList.remove('hidden');
            
            let count = 3;
            countdownText.innerText = count;
            
            // Eğer ses varsa ufak bip çalınabilir
            if (window.soundSystem) window.soundSystem.playRing();
            
            const timer = setInterval(() => {
                count--;
                if (count > 0) {
                    countdownText.innerText = count;
                    if (window.soundSystem) window.soundSystem.playRing();
                } else {
                    clearInterval(timer);
                    countdownOverlay.classList.add('hidden');
                    this.state = 'PLAYING';
                    
                    // Geri sayım bittiğinde hemen tıklama algılamasın diye
                    this.player.isFlapping = false; 
                }
            }, 1000);
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

        // Fizik & Hızlanma (Kademeli Zorluk)
        this.speed = this.baseSpeed + Math.min(this.score * 0.02, 1.8);
        
        // Milestone Mekanikleri
        if (this.score >= 500 && this.maxLives === 5) {
            this.maxLives = 6;
            this.lives++;
            this.updateHeartsUI();
            window.soundSystem.playPowerUp();
        }
        if (this.score >= 1000 && this.invincibleDuration === 90) {
            this.invincibleDuration = 180; // 3 saniye dokunulmazlık
            window.soundSystem.playPowerUp();
        }
        
        if (this.activePowerUp === 'time') {
            this.speed *= 0.5;
            this.player.gravity = 0.10;
            this.player.maxVy = 3.0;
        } else {
            this.player.gravity = 0.20;
            this.player.maxVy = 6.0;
        }
        
        const currentGap = Math.max(140, 170 - this.score * 0.3);
        this.gapSize = currentGap;
        
        let currentInterval = Math.max(105, 135 - this.score * 0.3);
        
        // Zaman Bükücü aktifken hız yarıya düştüğü için engellerin üst üste
        // binmemesi (fiziksel mesafenin korunması) adına üretim süresi 2 katına çıkarılır.
        if (this.activePowerUp === 'time') {
            currentInterval *= 2;
        }
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
            // 500 Puan: Altın Sarısı Kıvılcım (Gold Spark) efekti
            if (this.score >= 500) {
                const color = '#fbbf24';
                const count = 1;
                for (let i = 0; i < count; i++) {
                    window.particleEngine.particles.push({
                        x: this.player.x - 20,
                        y: this.player.y + (Math.random() - 0.5) * 20,
                        vx: -this.speed * 0.5 + (Math.random() - 0.5) * 2,
                        vy: (Math.random() - 0.5) * 2,
                        alpha: 1.0,
                        decay: Math.random() * 0.03 + 0.02,
                        color: color,
                        size: Math.random() * 3 + 1,
                        type: 'spark'
                    });
                }
            }
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

        // Yeni Engel ve Eşya Üretimi
        this.obstacleTimer++;
        if (this.obstacleTimer >= this.obstacleInterval) {
            this.obstacleTimer = 0;
            this.spawnObstacle();
            
            // Power-Up Spawn logic (>200 puan ve %10 ihtimal)
            if (this.score >= 200 && Math.random() < 0.1 && !this.activePowerUp) {
                this.spawnPowerUp();
            }
        }
        
        // Düşman Spawn logic (>300 puan ve rastgele ihtimal)
        if (this.score >= 300 && Math.random() < 0.003) { // %0.3 per frame
            if (this.enemies.length < 2) {
                this.spawnEnemy();
            }
        }

        // Pencere sesi cooldown
        if (this.windowSoundCooldown > 0) this.windowSoundCooldown--;
        
        this.updateEnemies();

        // Engelleri Güncelle & Çarpışma Kontrolü
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.x -= this.speed;
            
            // Faz 3: Matematik Molası Tetikleme
            if (obs.isMathGate && !obs.isPaused && obs.x < this.width - 150) {
                obs.isPaused = true;
                this.startMathPause(obs);
                return; // Döngüyü kır ve frame'i burada sonlandır
            }

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
                
                if (obs.isMathGate) {
                    // Hangi kapıdan geçtiğini Y eksenine bakarak anla
                    const topCenter = (obs.gapTop1 + obs.gapBottom1) / 2;
                    const bottomCenter = (obs.gapTop2 + obs.gapBottom2) / 2;
                    const isTop = Math.abs(this.player.y - topCenter) < Math.abs(this.player.y - bottomCenter);
                    
                    if (isTop === obs.isTopCorrect) {
                        // DOĞRU CEVAP!
                        this.score += 5; // Matematik sorusu bonusu
                        if (this.lives < this.maxLives) {
                            this.lives++;
                            this.updateHeartsUI();
                        }
                        window.soundSystem.playPowerUp();
                        window.particleEngine.emitRingBurst(this.player.x, this.player.y, '#10b981'); // Yeşil parlama
                        
                        // İpucu veya Tebrik metni için geçici bir mesaj eklenebilir
                        window.particleEngine.emitFloatingText(this.player.x, this.player.y - 30, "DOĞRU! +5 Puan", '#10b981');
                    } else {
                        // YANLIŞ CEVAP!
                        window.particleEngine.emitFloatingText(this.player.x, this.player.y - 30, "YANLIŞ!", '#ef4444');
                        if (this.loseLife()) {
                            this.gameOver();
                            return;
                        }
                    }
                    this.updateHUD();
                } else {
                    const points = obs.isWalled ? 2 : 1;
                    this.score += points;
                    
                    // Can Kazanma Cooldown'ını düşür
                    if (this.extraLifeCooldown > 0) {
                        this.extraLifeCooldown = Math.max(0, this.extraLifeCooldown - points);
                    }

                    window.soundSystem.playScore();
                    this.updateHUD();
                }
            }

            // Kasırga Etkisi
            if (this.activePowerUp === 'tornado' && obs.x > this.player.x) {
                // Engelleri sağa doğru savur
                obs.x += this.speed * 3; // Daha hızlı savur
                
                // Ekrandan çok uzağa savrulan engelleri tamamen sil ki üst üste binmesinler!
                if (obs.x > this.width + 250) {
                    this.obstacles.splice(i, 1);
                    continue;
                }
            }

            // Çarpışma Testi ve Yıkıcı Kalkan
            if (this.checkObstacleCollision(obs)) {
                if (this.activePowerUp === 'shield') {
                    // Yıkıcı kalkan engeli parçalar
                    window.particleEngine.emitRingBurst(obs.x + obs.width/2, this.player.y, '#f97316'); // Turuncu ateş patlaması
                    window.soundSystem.playPowerUp();
                    this.obstacles.splice(i, 1);
                    continue;
                } else {
                    if (this.loseLife()) {
                        this.gameOver();
                    }
                    return;
                }
            }

            // Ekrandan çıkan engelleri sil
            if (obs.x + obs.width < -50) {
                this.obstacles.splice(i, 1);
            }
        }

        let needsHUDUpdate = false;
        
        // Toplanabilirleri Güncelle (Altın, Elmas, Zümrüt, Yakut)
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const item = this.collectibles[i];
            item.x -= this.speed;

            if (!item.collected) {
                const dist = Math.hypot(this.player.x - item.x, this.player.y - item.y);
                if (dist < this.player.radius + item.radius) {
                    item.collected = true;
                    
                    let burstColor = '#fbbf24'; // Altın varsayılan
                    if (item.type === 'gold') {
                        this.score += 1;
                        this.goldBalance += 1;
                        window.soundSystem.playRing(); 
                    } else if (item.type === 'diamond') {
                        this.score += 3;
                        burstColor = '#38bdf8';
                        window.soundSystem.playPowerUp();
                    } else if (item.type === 'emerald') {
                        this.score += 10;
                        burstColor = '#34d399';
                        window.soundSystem.playPowerUp();
                    } else if (item.type === 'ruby') {
                        this.score += 20;
                        burstColor = '#f43f5e';
                        window.soundSystem.playPowerUp();
                    }
                    
                    window.particleEngine.emitRingBurst(item.x, item.y, burstColor);
                    needsHUDUpdate = true;
                }
            }

            if (item.x < -50 || item.collected) {
                this.collectibles.splice(i, 1);
            }
        }
        
        // Güçlendirmeleri (Power-Ups) Güncelle & Toplama
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const pu = this.powerUps[i];
            pu.x -= this.speed;
            
            if (!pu.collected) {
                const dist = Math.hypot(this.player.x - pu.x, this.player.y - pu.y);
                if (dist < this.player.radius + pu.radius) {
                    pu.collected = true;
                    this.activatePowerUp(pu.type);
                }
            }
            
            if (pu.x < -50 || pu.collected) {
                this.powerUps.splice(i, 1);
            }
        }
        
        // Aktif Power-Up Süresini Yönet
        if (this.activePowerUp) {
            this.powerUpTimer--;
            
            if (this.activePowerUp === 'magnet') {
                this.applyMagnetEffect();
            }
            
            // Saniye göstergesini her karede güncelle (Daha yumuşak bir akış için)
            const puUI = document.getElementById('powerUpIndicator');
            if (puUI) {
                if (this.powerUpTimer > 0) {
                    if (puUI.classList.contains('hidden')) puUI.classList.remove('hidden');
                    let icon = '';
                    let color = '#fff';
                    switch (this.activePowerUp) {
                        case 'shield': icon = '🔥 KALKAN'; color = '#f97316'; break;
                        case 'tornado': icon = '🌪️ KASIRGA'; color = '#94a3b8'; break;
                        case 'time': icon = '⚡ ZAMAN'; color = '#a855f7'; break;
                        case 'magnet': icon = '🧲 MIKNATIS'; color = '#ef4444'; break;
                    }
                    const sec = (this.powerUpTimer / 60).toFixed(1); // 8.5s gibi göster
                    const newText = `${icon} (${sec}s)`;
                    
                    // DOM Thrashing önlemek için sadece değiştiğinde güncelle
                    if (puUI.innerText !== newText) {
                        puUI.innerText = newText;
                        puUI.style.borderColor = color;
                        puUI.style.boxShadow = `0 0 20px ${color}80`;
                        puUI.style.textShadow = `0 0 10px ${color}`;
                    }
                } else {
                    if (!puUI.classList.contains('hidden')) puUI.classList.add('hidden');
                }
            }
            
            if (this.powerUpTimer <= 0) {
                this.activePowerUp = null;
                // Sona erdiğinde genel UI yenilemesi
                this.updateHUD();
            }
        }
        
        if (needsHUDUpdate) {
            this.saveGold();
            this.updateHUD();
        }
    }

    activatePowerUp(type) {
        this.activePowerUp = type;
        window.soundSystem.playPowerUp();
        
        switch (type) {
            case 'shield': this.powerUpDuration = 60 * 8; break; // 8 seconds
            case 'tornado': this.powerUpDuration = 60 * 10; break; // 10 seconds
            case 'time': this.powerUpDuration = 60 * 12; break; // 12 seconds
            case 'magnet': this.powerUpDuration = 60 * 15; break; // 15 seconds
        }
        
        // Market (Shop) Yükseltmeleri Etkisi: Her seviye başına ekstra +2 saniye
        const upgradeLvl = this.upgrades[type] || 0;
        this.powerUpDuration += (upgradeLvl * 60 * 2);
        
        this.powerUpTimer = this.powerUpDuration;
    }

    applyMagnetEffect() {
        for (let item of this.collectibles) {
            // Sadece ekranda olanları çek
            if (item.x > 0 && item.x < this.width) {
                const dx = this.player.x - item.x;
                const dy = this.player.y - item.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 200) { // 200px çekim alanı
                    const speedX = (dx / dist) * 8;
                    const speedY = (dy / dist) * 8;
                    item.x += speedX;
                    item.y += speedY;
                }
            }
        }
    }

    spawnObstacle() {
        const obsWidth = 64;
        this.normalObstacleCount++;

        // Her 3-5 normal engelden sonra bir kapalı sütun (pencereli) VEYA Matematik Kapısı üret
        const shouldSpawnSpecial = this.normalObstacleCount >= 3 + Math.floor(Math.random() * 3);

        if (shouldSpawnSpecial) {
            this.normalObstacleCount = 0;
            if (Math.random() > 0.5) {
                this.spawnMathGate(obsWidth);
            } else {
                this.spawnWalledObstacle(obsWidth);
            }
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

        // Dinamik Altın ve Değerli Taş Üretimi (Smart Spawning)
        this.spawnCollectibles(topHeight, this.gapSize, this.width + 20 + obsWidth);
    }

    spawnCollectibles(topY, gap, startX) {
        // Gem (Değerli taş) spawn mantığı (Belirli skor katlarında çıkar)
        // Check if we passed a multiple recently
        const r = Math.random();
        
        let spawnedGem = false;
        
        if (this.score >= 220 && this.score % 220 < 5 && Math.random() > 0.5) {
            // Ruby
            this.collectibles.push({ x: startX + 50, y: topY + gap / 2, radius: 25, type: 'ruby', collected: false });
            spawnedGem = true;
        } else if (this.score >= 120 && this.score % 120 < 5 && Math.random() > 0.4) {
            // Emerald
            this.collectibles.push({ x: startX + 50, y: topY + gap / 2, radius: 22, type: 'emerald', collected: false });
            spawnedGem = true;
        } else if (this.score >= 50 && this.score % 50 < 5 && Math.random() > 0.3) {
            // Diamond
            this.collectibles.push({ x: startX + 50, y: topY + gap / 2, radius: 20, type: 'diamond', collected: false });
            spawnedGem = true;
        }
        
        // Eğer gem çıkmadıysa altın dizilimi yap
        if (!spawnedGem && r > 0.3) {
            const pattern = Math.random();
            const count = Math.floor(Math.random() * 3) + 1; // 1 ile 3 arası altın
            
            for (let i = 0; i < count; i++) {
                let yOffset = 0;
                
                if (pattern < 0.33) {
                    // Kavis (Arc)
                    yOffset = Math.sin((i / (count - 1 || 1)) * Math.PI) * 40 - 20;
                } else if (pattern < 0.66) {
                    // Zikzak
                    yOffset = (i % 2 === 0 ? 30 : -30);
                } else {
                    // Düz Çizgi (Hafif eğimli olabilir)
                    yOffset = (i - count/2) * 10;
                }
                
                this.collectibles.push({
                    x: startX + 30 + i * 50,
                    y: topY + gap / 2 + yOffset,
                    radius: 18,
                    type: 'gold',
                    collected: false
                });
            }
        }
    }

    spawnPowerUp() {
        // Sadece ekranda alınmamış başka power-up yoksa üret
        if (this.powerUps.length > 0) return;

        const types = ['shield', 'tornado', 'time', 'magnet'];
        const type = types[Math.floor(Math.random() * types.length)];
        const yPos = Math.floor(Math.random() * (this.height - this.groundHeight - 150)) + 75;
        
        // Engel ile aynı hizada çıkmaması (duvara gömülmemesi) için
        // x pozisyonunu engellerin tam ortasına (yaklaşık 150-180 piksel sonrasına) atıyoruz.
        const distanceBetweenObstacles = this.obstacleInterval * this.speed;
        const offset = distanceBetweenObstacles / 2; // Engellerin tam ortası

        this.powerUps.push({
            x: this.width + 50 + offset,
            y: yPos,
            radius: 22,
            type: type,
            collected: false
        });
    }

    spawnEnemy() {
        const types = ['missile', 'drone'];
        const type = types[Math.floor(Math.random() * types.length)];
        // Düşman uyarı vererek başlar
        this.enemies.push({
            x: this.width - 40, // Sağ köşede uyarısı çıkacak
            y: this.player.y,
            width: 40,
            height: 20,
            type: type,
            state: 'warning',
            timer: 90, // 1.5 saniye uyarı süresi
            speedY: (Math.random() > 0.5 ? 1 : -1) * 2
        });
    }
    
    updateEnemies() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let e = this.enemies[i];
            
            if (e.state === 'warning') {
                e.timer--;
                // Füzenin hedefini oyuncunun Y konumuna kilitle
                e.y += (this.player.y - e.y) * 0.05;
                if (e.timer <= 0) {
                    e.state = 'active';
                    e.x = this.width + 50; // Dışarıdan fırlasın
                    if (window.soundSystem) window.soundSystem.playDescent('kartal'); // Füze sesi
                }
            } else if (e.state === 'active') {
                e.x -= this.speed * 2.5; // Karakterden hızlı gelir
                
                if (e.type === 'missile') {
                    // Homing (Güdümlü) hareket
                    e.y += (this.player.y - e.y) * 0.02;
                } else if (e.type === 'drone') {
                    // Zikzak hareket
                    e.y += e.speedY;
                    if (e.y < 100 || e.y > this.height - this.groundHeight - 100) e.speedY *= -1;
                }
                
                // Kalkan (Shield) veya Kasırga (Tornado) ile yok edilebilir
                if (this.activePowerUp === 'tornado' && e.x > this.player.x) {
                    e.x += this.speed * 4;
                    e.y -= 10; // Havaya savrulur
                }
                
                // Karakter Çarpışma Kontrolü
                if (e.x < this.player.x + this.player.radius && e.x + e.width > this.player.x - this.player.radius &&
                    e.y < this.player.y + this.player.radius && e.y + e.height > this.player.y - this.player.radius) {
                    
                    if (this.activePowerUp === 'shield') {
                        // Kalkan düşmanı parçalar
                        window.particleEngine.emitRingBurst(e.x, e.y, '#f97316');
                        window.soundSystem.playPowerUp();
                        this.enemies.splice(i, 1);
                        this.score += 5;
                        continue;
                    } else {
                        // Kalkan yoksa hasar al
                        window.particleEngine.emitRingBurst(e.x, e.y, '#ef4444');
                        this.enemies.splice(i, 1);
                        if (this.loseLife()) {
                            this.gameOver();
                            return;
                        }
                        continue;
                    }
                }
                
                // Ekrandan çıktıysa sil
                if (e.x < -100 || e.x > this.width + 500) {
                    this.enemies.splice(i, 1);
                }
            }
        }
    }
    
    // Matematik Kapısı Üretici
    spawnMathGate(obsWidth) {
        // Soru Üretimi
        const ops = ['+', '-', '*'];
        const op = ops[Math.floor(Math.random() * ops.length)];
        let a, b, correct;
        
        if (op === '+') {
            a = Math.floor(Math.random() * 20) + 1;
            b = Math.floor(Math.random() * 20) + 1;
            correct = a + b;
        } else if (op === '-') {
            a = Math.floor(Math.random() * 20) + 10;
            b = Math.floor(Math.random() * a);
            correct = a - b;
        } else {
            a = Math.floor(Math.random() * 8) + 2;
            b = Math.floor(Math.random() * 8) + 2;
            correct = a * b;
        }
        
        let wrong = correct + Math.floor(Math.random() * 5) + 1;
        if (Math.random() > 0.5) wrong = correct - Math.floor(Math.random() * 5) - 1;
        
        const question = `${a} ${op} ${b} = ?`;
        
        const isTopCorrect = Math.random() > 0.5;
        
        // Yeni Devasa Kapı (Faz 3) - Ortada sadece tek bir ayraç blok olacak
        const playArea = this.height - this.groundHeight;
        const midY = playArea / 2;
        const separatorThickness = 40; // Ortadaki ince ayraç bloğunun kalınlığı
        
        this.obstacles.push({
            x: this.width + 20,
            width: obsWidth,
            isMathGate: true,
            passed: false,
            isPaused: false, // Düşünme molası için eklendi
            question: question,
            // Üst boşluk ekranın en üstünden orta bloğun üstüne kadar
            gapTop1: 0,
            gapBottom1: midY - separatorThickness / 2,
            // Alt boşluk orta bloğun altından zemine kadar
            gapTop2: midY + separatorThickness / 2,
            gapBottom2: playArea,
            topVal: isTopCorrect ? correct : wrong,
            bottomVal: isTopCorrect ? wrong : correct,
            isTopCorrect: isTopCorrect
        });
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

            if (obs.isMathGate) {
                // Üst parça: 0 ile gapTop1 arası
                if (py - r < obs.gapTop1) return true;
                // Orta parça: gapBottom1 ile gapTop2 arası
                if (py + r > obs.gapBottom1 && py - r < obs.gapTop2) return true;
                // Alt parça: gapBottom2 ile aşağısı
                if (py + r > obs.gapBottom2) return true;
                
                return false;

            } else if (obs.isWalled && obs.window) {
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
        document.getElementById('liveGold').innerText = this.goldBalance;
        document.getElementById('liveBestScore').innerText = Math.max(this.score, this.bestScore);
        const currentLevel = window.levelManager.getCurrentLevel();
        const levelKey = 'level' + currentLevel.id.charAt(0).toUpperCase() + currentLevel.id.slice(1);
        const lang = window.currentLang || 'tr';
        const translatedName = window.i18n && window.i18n[lang] && window.i18n[lang][levelKey] 
            ? window.i18n[lang][levelKey] 
            : currentLevel.name;
        
        document.getElementById('liveLevelName').innerText = translatedName;
        
        // Ekstra Can Butonlarını Güncelle
        const btnMath = document.getElementById('btnMathQuestion');
        const btnAd = document.getElementById('btnWatchAd');
        
        if (btnMath && btnAd) {
            const lang = window.currentLang || 'tr';
            // Eğer can full ise butonlar çalışmaz (pasif)
            if (this.lives >= this.maxLives) {
                btnMath.disabled = true;
                btnAd.disabled = true;
                btnMath.innerText = window.i18n ? window.i18n[lang].btnMathFull : "🧠 Can Full";
                btnAd.innerText = window.i18n ? window.i18n[lang].btnAdFull : "📺 Can Full";
                btnMath.style.opacity = "0.5";
                btnAd.style.opacity = "0.5";
            } else if (this.extraLifeCooldown > 0) {
                // Cooldown varsa butonlar pasif
                btnMath.disabled = true;
                btnAd.disabled = true;
                btnMath.innerText = window.i18n ? window.i18n[lang].btnMathCooldown.replace('{val}', this.extraLifeCooldown) : `🧠 Soru İçin ${this.extraLifeCooldown} Puan`;
                btnAd.innerText = window.i18n ? window.i18n[lang].btnAdCooldown.replace('{val}', this.extraLifeCooldown) : `📺 Reklam İçin ${this.extraLifeCooldown} Puan`;
                btnMath.style.opacity = "0.5";
                btnAd.style.opacity = "0.5";
            } else {
                // Kullanıma hazır
                btnMath.disabled = false;
                btnAd.disabled = false;
                btnMath.innerText = window.i18n ? window.i18n[lang].btnMath : "🧠 Soru Çöz (+1 Can)";
                btnAd.innerText = window.i18n ? window.i18n[lang].btnAd : "📺 Reklam İzle (+1 Can)";
                btnMath.style.opacity = "1";
                btnAd.style.opacity = "1";
            }
        }
    }

    drawPowerUp(ctx, pu) {
        ctx.save();
        ctx.translate(pu.x, pu.y);
        
        const pulse = Math.sin(Date.now() * 0.01) * 3;
        
        // Dış Halo (Parlaklık)
        ctx.beginPath();
        ctx.arc(0, 0, pu.radius + pulse, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fill();
        
        // İç Kapsül Rengi
        let color = '#fff';
        let icon = '';
        switch (pu.type) {
            case 'shield': color = '#f97316'; icon = '🔥'; break;
            case 'tornado': color = '#94a3b8'; icon = '🌪️'; break;
            case 'time': color = '#a855f7'; icon = '⚡'; break;
            case 'magnet': color = '#ef4444'; icon = '🧲'; break;
        }
        
        ctx.beginPath();
        ctx.arc(0, 0, pu.radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // İkon
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, 0, 0);
        
        ctx.restore();
    }
    
    drawEnemy(ctx, e) {
        ctx.save();
        if (e.state === 'warning') {
            // Sağ tarafta yanıp sönen uyarı işareti
            if (Math.floor(Date.now() / 100) % 2 === 0) {
                ctx.fillStyle = '#ef4444'; // Kırmızı uyarı
                ctx.font = 'bold 30px Arial';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.fillText('⚠️ DİKKAT', e.x, e.y);
            }
        } else if (e.state === 'active') {
            ctx.translate(e.x, e.y);
            
            if (e.type === 'missile') {
                // Füze Çizimi
                // Gövde
                ctx.fillStyle = '#b91c1c'; // Koyu kırmızı
                ctx.beginPath();
                ctx.ellipse(e.width/2, e.height/2, e.width/2, e.height/2, 0, 0, Math.PI * 2);
                ctx.fill();
                // Alev
                const pulse = Math.random() * 10;
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.moveTo(e.width, e.height/2);
                ctx.lineTo(e.width + 10 + pulse, e.height/2 - 5);
                ctx.lineTo(e.width + 10 + pulse, e.height/2 + 5);
                ctx.closePath();
                ctx.fill();
                // Göz/Işık
                ctx.fillStyle = '#fca5a5';
                ctx.beginPath();
                ctx.arc(10, e.height/2, 4, 0, Math.PI * 2);
                ctx.fill();
            } else if (e.type === 'drone') {
                // Drone Çizimi
                ctx.fillStyle = '#1e293b'; // Koyu gri
                ctx.fillRect(0, 0, e.width, e.height);
                // Pervaneler (Animasyonlu)
                const rot = Date.now() * 0.05;
                ctx.save();
                ctx.translate(5, -5);
                ctx.rotate(rot);
                ctx.fillStyle = '#94a3b8';
                ctx.fillRect(-10, -1, 20, 2);
                ctx.restore();
                ctx.save();
                ctx.translate(e.width - 5, -5);
                ctx.rotate(rot);
                ctx.fillStyle = '#94a3b8';
                ctx.fillRect(-10, -1, 20, 2);
                ctx.restore();
                // Göz
                ctx.fillStyle = '#ef4444'; // Kırmızı lazer göz
                ctx.fillRect(e.width/2 - 4, e.height/2 - 2, 8, 4);
                // Uyarı ışığı
                if (Math.floor(Date.now() / 200) % 2 === 0) {
                    ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
                    ctx.beginPath();
                    ctx.arc(e.width/2, e.height/2, 20, 0, Math.PI*2);
                    ctx.fill();
                }
            }
        }
        ctx.restore();
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
        this.cameraScaleX += (this.targetCameraScaleX - this.cameraScaleX) * 0.05;

        if (this.state !== 'PLAYING') return;

        // Seviyelere göre yön belirleme
        if (this.score < 150) {
            this.targetCameraAngle = 0; // Normal (Soldan Sağa)
            this.targetCameraScaleX = 1;
        } else if (this.score < 300) {
            this.targetCameraAngle = -90; // Aşağıdan Yukarıya (Zemin sağda)
            this.targetCameraScaleX = 1;
        } else if (this.score < 450) {
            this.targetCameraAngle = 0; // Sağdan Sola (Yerçekimi AŞAĞI, sadece yatay aynalama)
            this.targetCameraScaleX = -1;
        } else if (this.score < 600) {
            this.targetCameraAngle = 90; // Yukarıdan Aşağıya (Zemin solda)
            this.targetCameraScaleX = 1;
        } else {
            // En zor seviye: Anlık ve rastgele değişim (her 20 puanda bir)
            if (this.score - this.lastRotationScore >= 20) {
                const modes = [
                    { angle: 0, scale: 1 },    // Soldan sağa
                    { angle: -90, scale: 1 },  // Aşağıdan yukarı
                    { angle: 0, scale: -1 },   // Sağdan sola
                    { angle: 90, scale: 1 }    // Yukarıdan aşağı
                ];
                let currentModeIndex = modes.findIndex(m => m.angle === this.targetCameraAngle && m.scale === this.targetCameraScaleX);
                let possibleModes = modes.filter((m, i) => i !== currentModeIndex);
                let newMode = possibleModes[Math.floor(Math.random() * possibleModes.length)];
                
                this.targetCameraAngle = newMode.angle;
                this.targetCameraScaleX = newMode.scale;
                this.lastRotationScore = this.score;
            }
        }
    }

    render() {
        // Rotasyon ve küçültme (scale) sırasında kenarlarda kalan boşlukların 
        // eski karelerle (framelerle) karışmasını (smearing) önlemek için ekranı temizle
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = '#050b14'; // Oyunun genel arkaplan rengiyle uyumlu siyah/lacivert boşluk dolgusu
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.save();

        // Kamera Rotasyonu Uygulaması
        if (Math.abs(this.cameraAngle) > 0.01 || Math.abs(this.cameraScaleX - 1) > 0.01) {
            this.ctx.translate(this.width / 2, this.height / 2);
            
            if (Math.abs(this.cameraAngle) > 0.01) {
                this.ctx.rotate(this.cameraAngle * Math.PI / 180);
            }
            
            // Eğer açı 90 veya -90 dereceye yakınsa (yatay/dikey değişimi),
            // ekranın taşmamasını sağlamak için aspect oranını koru
            const isVertical = Math.abs(Math.sin(this.cameraAngle * Math.PI / 180));
            const aspectScale = 1.0 - (1.0 - (this.width / this.height)) * isVertical;
            
            // X ekseni ayna (sağdan sola akış) ve boyut ölçeklemesini uygula
            this.ctx.scale(this.cameraScaleX * aspectScale, aspectScale);
            
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

        // 4. Toplanabilirler
        for (let item of this.collectibles) {
            if (!item.collected) {
                window.levelManager.drawCollectible(this.ctx, item.x, item.y, item.radius, item.type);
            }
        }
        
        // Güç Kapsülleri (Power-Ups)
        for (let pu of this.powerUps) {
            if (!pu.collected) {
                this.drawPowerUp(this.ctx, pu);
            }
        }
        
        // Düşmanlar (Enemies)
        for (let e of this.enemies) {
            this.drawEnemy(this.ctx, e);
        }

        // 5. Zemin
        window.levelManager.drawGround(this.ctx, this.width, this.height, this.groundHeight);

        // 6. Ana Karakter (Dokunulmazlıkta yanıp sönme)
        if (this.invincible && Math.floor(Date.now() / 80) % 2 === 0) {
            this.ctx.globalAlpha = 0.35;
        }
        
        // 1000 Puan Barajı: Parlak Neon Aura
        if (this.score >= 1000) {
            this.ctx.save();
            this.ctx.translate(this.player.x, this.player.y);
            this.ctx.beginPath();
            this.ctx.arc(0, 0, this.player.radius + 15 + Math.sin(Date.now()*0.005)*5, 0, Math.PI*2);
            this.ctx.fillStyle = 'rgba(56, 189, 248, 0.25)'; // Açık mavi neon
            this.ctx.fill();
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
            this.ctx.stroke();
            this.ctx.restore();
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
        
        // 1500 Puan Barajı: Kral Tacı
        if (this.score >= 1500) {
            this.ctx.save();
            // Karakterin üstüne ve dönüş açısına göre tacı çiz
            this.ctx.translate(this.player.x, this.player.y);
            this.ctx.rotate(this.player.angle);
            this.ctx.translate(0, -this.player.radius - 12);
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('👑', 0, 0);
            this.ctx.restore();
        }

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
