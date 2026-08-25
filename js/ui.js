/**
 * Flappy Horizon - UI ve Özelleştirme Atölyesi (Studio/Garage) Yöneticisi
 * Karakter seçimi, renk/model modifikasyonları, canlı önizleme ve seviye menüleri.
 */

class UIManager {
    constructor() {
        this.previewCanvas = document.getElementById('previewCanvas');
        this.previewCtx = this.previewCanvas ? this.previewCanvas.getContext('2d') : null;
        this.initUI();
    }

    initUI() {
        this.checkUserProfile();
        this.bindMenuButtons();
        this.bindCustomizationControls();
        this.renderLevelGrid();
        this.startPreviewLoop();
    }

    checkUserProfile() {
        const welcomeMenu = document.getElementById('welcomeProfileMenu');
        const mainMenu = document.getElementById('mainMenu');
        const savedProfile = localStorage.getItem('flappy_player_profile');
        
        if (savedProfile) {
            if (welcomeMenu) welcomeMenu.classList.add('hidden');
            if (mainMenu) mainMenu.classList.remove('hidden');
            this.playerProfile = JSON.parse(savedProfile);
        } else {
            if (welcomeMenu) welcomeMenu.classList.remove('hidden');
            if (mainMenu) mainMenu.classList.add('hidden');
        }
    }

    bindMenuButtons() {
        // Yardımcı güvenli buton bağlama fonksiyonu
        const bindButton = (id, handler) => {
            const btn = document.getElementById(id);
            if (!btn) return;

            const execute = (e) => {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                try {
                    if (window.soundSystem) window.soundSystem.playClick();
                } catch (err) {}
                try {
                    handler();
                } catch (err) {
                    console.error('Buton çalıştırma hatası (' + id + '):', err);
                }
            };

            btn.addEventListener('click', execute);
        };

        // 0. PROFİLİ KAYDET
        bindButton('btnSaveProfile', () => {
            const nameInput = document.getElementById('profileName').value.trim();
            const countryInput = document.getElementById('profileCountry').value;
            const gradeInput = document.getElementById('profileGrade').value;
            
            if (nameInput === '') {
                alert('Lütfen uçuş izni için pilot adını gir!');
                return;
            }
            
            this.playerProfile = {
                name: nameInput,
                country: countryInput,
                grade: gradeInput
            };
            
            localStorage.setItem('flappy_player_profile', JSON.stringify(this.playerProfile));
            
            // Leaderboard'ı yeni kategoriye göre güncelle
            if (window.leaderboardManager) {
                window.leaderboardManager.db = firebase.database().ref(`global_leaderboard_${countryInput}_${gradeInput}`);
                window.leaderboardManager.loadScores();
            }

            document.getElementById('welcomeProfileMenu').classList.add('hidden');
            document.getElementById('mainMenu').classList.remove('hidden');
        });

        // 1. HEMEN BAŞLA
        bindButton('btnStartGame', () => {
            if (window.gameEngine) {
                window.gameEngine.startPlay();
            }
        });

        // 2. TEKRAR UÇ
        bindButton('btnRestartGame', () => {
            if (window.gameEngine) {
                window.gameEngine.startPlay();
            }
        });

        // 3. ANA MENÜYE DÖN
        bindButton('btnBackToMenu', () => {
            if (window.gameEngine) {
                window.gameEngine.state = 'MENU';
            }
            const goMenu = document.getElementById('gameOverMenu');
            const mainMenu = document.getElementById('mainMenu');
            if (goMenu) goMenu.classList.add('hidden');
            if (mainMenu) mainMenu.classList.remove('hidden');
        });

        // 4. GAME OVER - LİDERLİK TABLOSU
        bindButton('btnGameOverLeaderboard', () => {
            if (window.leaderboardManager) {
                window.leaderboardManager.showLeaderboard();
            }
        });
        // 4.5. DİL / ÜLKE DEĞİŞİMİ
        const profileCountry = document.getElementById('profileCountry');
        if (profileCountry) {
            profileCountry.addEventListener('change', (e) => {
                let lang = 'tr';
                if (e.target.value === 'US') lang = 'en';
                if (window.setLanguage) window.setLanguage(lang);
            });
        }

        // 5. KARAKTER ATÖLYESİ AÇ
        bindButton('btnOpenGarage', () => {
            this.updateGarageControls();
            const modal = document.getElementById('garageModal');
            if (modal) modal.classList.remove('hidden');
        });

        // 6. KARAKTER ATÖLYESİ KAPAT
        bindButton('btnCloseGarage', () => {
            if (window.characterManager) {
                window.characterManager.saveConfigs();
            }
            const modal = document.getElementById('garageModal');
            if (modal) modal.classList.add('hidden');
        });

        // 7. SEVİYE VE DÜNYALAR AÇ
        bindButton('btnOpenLevels', () => {
            this.renderLevelGrid();
            const modal = document.getElementById('levelModal');
            if (modal) modal.classList.remove('hidden');
        });

        // 8. SEVİYE VE DÜNYALAR KAPAT
        bindButton('btnCloseLevels', () => {
            const modal = document.getElementById('levelModal');
            if (modal) modal.classList.add('hidden');
        });

        // 9. LİDERLİK TABLOSU AÇ (ANA MENÜ)
        bindButton('btnOpenLeaderboard', () => {
            if (window.leaderboardManager) {
                window.leaderboardManager.showLeaderboard();
            }
        });

        // 10. LİDERLİK TABLOSU KAPAT
        bindButton('btnCloseLeaderboard', () => {
            const modal = document.getElementById('leaderboardModal');
            if (modal) modal.classList.add('hidden');
            if (window.gameEngine && window.gameEngine.state === 'GAMEOVER' && !window.gameEngine.isVictory) {
                window.gameEngine.showGameOverUI();
            }
        });

        // 11. İSİM KAYDET
        bindButton('btnSaveName', () => {
            if (window.leaderboardManager) {
                window.leaderboardManager.submitName();
            }
        });

        // İsim inputunda Enter tuşu
        const nameInput = document.getElementById('playerNameInput');
        if (nameInput) {
            nameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (window.leaderboardManager) {
                        window.leaderboardManager.submitName();
                    }
                }
            });
        }

        // 12. ZAFER EKRANI - ANA MENÜ
        bindButton('btnVictoryMenu', () => {
            const victoryScreen = document.getElementById('victoryScreen');
            const mainMenu = document.getElementById('mainMenu');
            if (victoryScreen) victoryScreen.classList.add('hidden');
            if (mainMenu) mainMenu.classList.remove('hidden');
            if (window.gameEngine) window.gameEngine.state = 'MENU';
        });

        // 12.A. SORU ÇÖZ (+1 CAN)
        bindButton('btnMathQuestion', () => {
            if (window.gameEngine && window.gameEngine.lives < window.gameEngine.maxLives && window.gameEngine.extraLifeCooldown <= 0) {
                // Oyunu duraklat
                if (window.gameEngine.state === 'PLAYING') {
                    window.gameEngine.togglePause();
                }

                const modal = document.getElementById('mathQuestionModal');
                const qText = document.getElementById('mathQuestionText');
                const optContainer = document.getElementById('mathOptionsContainer');
                const resultDiv = document.getElementById('mathResult');

                // Profil bilgilerine göre sıradaki soruyu çek
                const profile = this.playerProfile || { country: 'TR', grade: '1' };
                const currentIndex = profile.currentQuestionIndex || 0;
                
                const questionData = window.getNextQuestion ? window.getNextQuestion(profile.country, profile.grade, currentIndex) : null;
                const question = questionData ? questionData.question : null;

                if (!question) {
                    qText.innerText = "Şimdilik uygun soru bulunamadı! (Beleş +1 Can)";
                    optContainer.innerHTML = '';
                    window.gameEngine.lives++;
                    window.gameEngine.extraLifeCooldown = 5;
                    window.gameEngine.updateHeartsUI();
                    window.gameEngine.updateHUD();
                    setTimeout(() => {
                        modal.classList.add('hidden');
                        if (window.gameEngine.state === 'PAUSED') window.gameEngine.togglePause();
                    }, 1500);
                    modal.classList.remove('hidden');
                    return;
                }

                qText.innerText = question.questionText;
                optContainer.innerHTML = '';
                resultDiv.classList.add('hidden');
                resultDiv.innerText = '';

                question.options.forEach((opt, index) => {
                    const btn = document.createElement('button');
                    btn.className = 'btn btn-secondary';
                    btn.style.width = '100%';
                    btn.innerText = opt;
                    btn.onclick = () => {
                        // Seçeneklere tekrar tıklanmasını engelle
                        Array.from(optContainer.children).forEach(b => b.disabled = true);

                        if (index === question.correctAnswerIndex) {
                            resultDiv.innerText = "✅ DOĞRU! +1 CAN KAZANDIN!";
                            resultDiv.style.color = "#4ade80";
                            resultDiv.classList.remove('hidden');
                            if (window.soundSystem) window.soundSystem.playScore(); 
                            
                            window.gameEngine.lives++;
                            window.gameEngine.extraLifeCooldown = 5;

                            // Profil istatistiğini ve soru sırasını güncelle
                            if (window.uiManager && window.uiManager.playerProfile) {
                                window.uiManager.playerProfile.currentQuestionIndex = questionData.nextIndex;
                                if (!window.uiManager.playerProfile.correctAnswers) window.uiManager.playerProfile.correctAnswers = 0;
                                window.uiManager.playerProfile.correctAnswers++;
                                localStorage.setItem('flappy_player_profile', JSON.stringify(window.uiManager.playerProfile));
                                
                                // Rozet kontrolü
                                if (window.uiManager.playerProfile.correctAnswers === 10) {
                                    setTimeout(() => {
                                        alert("🎉 HARİKA! 10 matematik sorusunu doğru bildiğin için 'BİLGİN 🎓' rozeti kazandın!");
                                    }, 500);
                                }
                            }
                        } else {
                            resultDiv.innerText = "❌ YANLIŞ! 10 SKOR UÇMALISIN.";
                            resultDiv.style.color = "#f87171";
                            resultDiv.classList.remove('hidden');
                            if (window.soundSystem) window.soundSystem.playCharacterCrash(window.gameEngine ? window.gameEngine.selectedCharacter : 'drone');
                            
                            window.gameEngine.extraLifeCooldown = 10;
                        }

                        window.gameEngine.updateHeartsUI();
                        window.gameEngine.updateHUD();

                        setTimeout(() => {
                            modal.classList.add('hidden');
                            if (window.gameEngine.state === 'PAUSED') window.gameEngine.togglePause();
                        }, 1500);
                    };
                    optContainer.appendChild(btn);
                });

                modal.classList.remove('hidden');
            }
        });

        bindButton('btnCloseMath', () => {
            document.getElementById('mathQuestionModal').classList.add('hidden');
            if (window.gameEngine && window.gameEngine.state === 'PAUSED') {
                window.gameEngine.togglePause();
            }
        });

        // 12.B. REKLAM İZLE (+1 CAN)
        bindButton('btnWatchAd', () => {
            if (window.gameEngine && window.gameEngine.lives < window.gameEngine.maxLives && window.gameEngine.extraLifeCooldown <= 0) {
                if (window.gameEngine.state === 'PLAYING') {
                    window.gameEngine.togglePause();
                }

                const modal = document.getElementById('adWatchModal');
                const timerText = document.getElementById('adTimerText');
                const adResult = document.getElementById('adResult');
                
                adResult.classList.add('hidden');
                modal.classList.remove('hidden');

                let timeLeft = 3;
                timerText.innerText = timeLeft;

                const timerInterval = setInterval(() => {
                    timeLeft--;
                    timerText.innerText = timeLeft;
                    
                    if (timeLeft <= 0) {
                        clearInterval(timerInterval);
                        adResult.classList.remove('hidden');
                        
                        if (window.soundSystem) window.soundSystem.playScore(); // Para/Can sesi
                        
                        window.gameEngine.lives++;
                        window.gameEngine.extraLifeCooldown = 5;
                        window.gameEngine.updateHeartsUI();
                        window.gameEngine.updateHUD();

                        setTimeout(() => {
                            modal.classList.add('hidden');
                            if (window.gameEngine.state === 'PAUSED') window.gameEngine.togglePause();
                        }, 1000);
                    }
                }, 1000);
            }
        });

        // 13. SES AÇ/KAPA
        const soundBtns = document.querySelectorAll('.btn-sound-toggle');
        soundBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.soundSystem) {
                    const isMuted = window.soundSystem.toggleMute();
                    soundBtns.forEach(b => {
                        if (b.classList.contains('sound-pill-btn')) {
                            b.innerHTML = isMuted ? '🔇 Ses Kapalı' : '🔊 Ses Açık';
                        } else {
                            b.innerHTML = isMuted ? '🔇' : '🔊';
                        }
                    });
                }
            });
        });

        // 14. DURAKLATMA
        bindButton('btnPause', () => {
            if (window.gameEngine) window.gameEngine.togglePause();
        });

        bindButton('btnResume', () => {
            if (window.gameEngine) window.gameEngine.togglePause();
        });
    }

    // Karakter Özelleştirme Kontrolleri
    bindCustomizationControls() {
        // Karakter Sekmeleri (Drone / Kartal / Roket / Füze)
        const charTabs = document.querySelectorAll('.char-tab-btn');
        charTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                window.soundSystem.playClick();
                const charType = tab.dataset.char;
                window.characterManager.setSelected(charType);

                charTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                this.updateGarageControls();
            });
        });

        // DRONE Kontrolleri
        this.bindColorInput('droneBodyColor', (val) => { window.characterManager.configs.drone.bodyColor = val; });
        this.bindColorInput('droneAccentColor', (val) => { window.characterManager.configs.drone.accentColor = val; });
        this.bindColorInput('droneLightColor', (val) => { 
            window.characterManager.configs.drone.lightColor = val; 
            window.characterManager.configs.drone.propellerGlow = val; 
        });
        this.bindSelectInput('droneModelSelect', (val) => { window.characterManager.configs.drone.model = val; });

        // KARTAL Kontrolleri
        this.bindColorInput('eagleBodyColor', (val) => { window.characterManager.configs.kartal.bodyColor = val; });
        this.bindColorInput('eagleWingColor', (val) => { window.characterManager.configs.kartal.wingColor = val; });
        this.bindColorInput('eagleBeakColor', (val) => { window.characterManager.configs.kartal.beakColor = val; });
        this.bindColorInput('eagleEyeColor', (val) => { window.characterManager.configs.kartal.eyeColor = val; });
        this.bindSelectInput('eagleSpeciesSelect', (val) => {
            window.characterManager.configs.kartal.species = val;
            if (val === 'altin') {
                window.characterManager.configs.kartal.bodyColor = '#5c3818';
                window.characterManager.configs.kartal.wingColor = '#3d230d';
                window.characterManager.configs.kartal.featherColor = '#d97706';
            } else if (val === 'sahin') {
                window.characterManager.configs.kartal.bodyColor = '#852d1b';
                window.characterManager.configs.kartal.wingColor = '#4a150c';
                window.characterManager.configs.kartal.featherColor = '#dc2626';
            } else if (val === 'akbas') {
                window.characterManager.configs.kartal.bodyColor = '#27272a';
                window.characterManager.configs.kartal.wingColor = '#18181b';
                window.characterManager.configs.kartal.featherColor = '#f4f4f5';
            } else if (val === 'siber') {
                window.characterManager.configs.kartal.bodyColor = '#0f172a';
                window.characterManager.configs.kartal.wingColor = '#0284c7';
                window.characterManager.configs.kartal.featherColor = '#38bdf8';
            }
            this.updateGarageControls();
        });

        // ROKET Kontrolleri
        this.bindColorInput('rocketBodyColor', (val) => { window.characterManager.configs.roket.bodyColor = val; });
        this.bindColorInput('rocketFinColor', (val) => { window.characterManager.configs.roket.finColor = val; });
        this.bindColorInput('rocketCockpitColor', (val) => { window.characterManager.configs.roket.cockpitColor = val; });
        this.bindSelectInput('rocketFlameSelect', (val) => { window.characterManager.configs.roket.flameColor = val; });
        this.bindSelectInput('rocketModelSelect', (val) => { window.characterManager.configs.roket.model = val; });

        // FÜZE Kontrolleri
        this.bindColorInput('missileBodyColor', (val) => { window.characterManager.configs.fuze.bodyColor = val; });
        this.bindColorInput('missileWarheadColor', (val) => { window.characterManager.configs.fuze.warheadColor = val; });
        this.bindColorInput('missileFinColor', (val) => { window.characterManager.configs.fuze.finColor = val; });
        this.bindColorInput('missileTrailColor', (val) => { window.characterManager.configs.fuze.trailColor = val; });
        this.bindSelectInput('missileCamoSelect', (val) => { window.characterManager.configs.fuze.camo = val; });
    }

    bindColorInput(elementId, callback) {
        const input = document.getElementById(elementId);
        if (input) {
            input.addEventListener('input', (e) => {
                callback(e.target.value);
                window.characterManager.saveConfigs();
            });
        }
    }

    bindSelectInput(elementId, callback) {
        const select = document.getElementById(elementId);
        if (select) {
            select.addEventListener('change', (e) => {
                callback(e.target.value);
                window.characterManager.saveConfigs();
            });
        }
    }

    updateGarageControls() {
        const selected = window.characterManager.selectedCharacter;
        const cfg = window.characterManager.getConfig(selected);

        // Aktif panel görünümü
        document.querySelectorAll('.char-config-panel').forEach(p => p.classList.add('hidden'));
        const activePanel = document.getElementById(`panel_${selected}`);
        if (activePanel) activePanel.classList.remove('hidden');

        // Sekme vurgusu
        document.querySelectorAll('.char-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.char === selected);
        });

        // Kontrol değerlerini eşitle
        if (selected === 'drone') {
            this.setInputValue('droneBodyColor', cfg.bodyColor);
            this.setInputValue('droneAccentColor', cfg.accentColor);
            this.setInputValue('droneLightColor', cfg.lightColor);
            this.setInputValue('droneModelSelect', cfg.model);
        } else if (selected === 'kartal') {
            this.setInputValue('eagleBodyColor', cfg.bodyColor);
            this.setInputValue('eagleWingColor', cfg.wingColor);
            this.setInputValue('eagleBeakColor', cfg.beakColor);
            this.setInputValue('eagleEyeColor', cfg.eyeColor);
            this.setInputValue('eagleSpeciesSelect', cfg.species);
        } else if (selected === 'roket') {
            this.setInputValue('rocketBodyColor', cfg.bodyColor);
            this.setInputValue('rocketFinColor', cfg.finColor);
            this.setInputValue('rocketCockpitColor', cfg.cockpitColor);
            this.setInputValue('rocketFlameSelect', cfg.flameColor);
            this.setInputValue('rocketModelSelect', cfg.model);
        } else if (selected === 'fuze') {
            this.setInputValue('missileBodyColor', cfg.bodyColor);
            this.setInputValue('missileWarheadColor', cfg.warheadColor);
            this.setInputValue('missileFinColor', cfg.finColor);
            this.setInputValue('missileTrailColor', cfg.trailColor);
            this.setInputValue('missileCamoSelect', cfg.camo);
        }
    }

    setInputValue(id, value) {
        const el = document.getElementById(id);
        if (el && value !== undefined) el.value = value;
    }

    // Seviye Seçim Menüsü Grid'i
    bindLevelSelector() {
        this.renderLevelGrid();
    }

    renderLevelGrid() {
        const container = document.getElementById('levelGridContainer');
        if (!container) return;

        container.innerHTML = '';
        const currentLvlIdx = window.levelManager.currentLevelIndex;

        const levelIcons = ['⚡', '🏔️', '🏙️', '❄️', '🚢'];

        window.levelManager.levels.forEach((lvl, idx) => {
            const card = document.createElement('div');
            card.className = `level-card ${idx === currentLvlIdx ? 'active' : ''}`;
            card.innerHTML = `
                <div class="level-icon">${levelIcons[idx] || '🌍'}</div>
                <div class="level-info">
                    <div class="level-title">Seviye ${idx + 1}: ${lvl.name}</div>
                    <div class="level-subtitle">${lvl.subtitle}</div>
                </div>
                ${idx === currentLvlIdx ? '<span class="badge-active">Seçili</span>' : ''}
            `;

            card.addEventListener('click', () => {
                window.soundSystem.playClick();
                window.levelManager.setLevel(idx);
                this.renderLevelGrid();
                document.getElementById('menuLevelSubtitle').innerText = `Dünya: ${lvl.name}`;
            });

            container.appendChild(card);
        });
    }

    // Atölye Canlı Önizleme Çizim Döngüsü
    startPreviewLoop() {
        const render = () => {
            if (this.previewCtx && this.previewCanvas) {
                const pw = this.previewCanvas.width;
                const ph = this.previewCanvas.height;

                this.previewCtx.clearRect(0, 0, pw, ph);

                // Izgara / Stüdyo Arka Planı
                this.previewCtx.fillStyle = 'rgba(15, 23, 42, 0.6)';
                this.previewCtx.fillRect(0, 0, pw, ph);

                // Hafif Dairesel Stüdyo Işığı
                const radGrad = this.previewCtx.createRadialGradient(pw / 2, ph / 2, 10, pw / 2, ph / 2, 70);
                radGrad.addColorStop(0, 'rgba(56, 189, 248, 0.2)');
                radGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
                this.previewCtx.fillStyle = radGrad;
                this.previewCtx.fillRect(0, 0, pw, ph);

                // Karakteri çiz (1.8x Büyütülmüş ve Hafif Salınımlı)
                const floatY = (ph / 2) + Math.sin(Date.now() * 0.005) * 6;
                window.characterManager.draw(
                    this.previewCtx,
                    pw / 2,
                    floatY,
                    Math.sin(Date.now() * 0.004) * 0.08,
                    window.characterManager.selectedCharacter,
                    1.8
                );
            }
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
    }
}

/**
 * Liderlik Tablosu (Top 10 Leaderboard) Yöneticisi - Firebase Destekli
 */
class LeaderboardManager {
    constructor() {
        this.pendingScore = 0;
        this.pendingIsVictory = false;
        this.scores = [];
        this.isLoading = false;

        // Eski yerel verileri temizle (opsiyonel)
        try {
            localStorage.removeItem('flappy_horizon_user_leaderboard_v2');
            localStorage.removeItem('flappy_horizon_leaderboard');
        } catch (e) {}

        // Firebase Başlatma
        if (!firebase.apps.length) {
            const firebaseConfig = {
              apiKey: "AIzaSyASTQs8uUsVdhSGcirXM1KJDrD3WO2I7HI",
              authDomain: "flappyhorizon-73489.firebaseapp.com",
              databaseURL: "https://flappyhorizon-73489-default-rtdb.europe-west1.firebasedatabase.app",
              projectId: "flappyhorizon-73489",
              storageBucket: "flappyhorizon-73489.firebasestorage.app",
              messagingSenderId: "195684373944",
              appId: "1:195684373944:web:25a964a98af50810c42b4d",
              measurementId: "G-W6D65S6ZFC"
            };
            firebase.initializeApp(firebaseConfig);
        }
        
        // Profil bilgisine göre kategori oluştur (Varsayılan: TR_1)
        let lbCategory = 'TR_1';
        try {
            const savedProfile = localStorage.getItem('flappy_player_profile');
            if (savedProfile) {
                const profile = JSON.parse(savedProfile);
                lbCategory = `${profile.country}_${profile.grade}`;
            }
        } catch (e) {}
        
        // Liderlik tablosu referansı
        this.db = firebase.database().ref(`global_leaderboard_${lbCategory}`);
        
        // Oyun açılışında sessizce bir kere yükle
        this.loadScores();
    }

    loadScores(callback) {
        this.isLoading = true;
        
        // Arayüz açıksa "Yükleniyor" durumunu göster
        const container = document.getElementById('leaderboardContent');
        const modal = document.getElementById('leaderboardModal');
        if (container && modal && !modal.classList.contains('hidden')) {
            container.innerHTML = this.buildTableHTML();
        }

        // Son 100 skoru getir (skora göre küçükten büyüğe sıralar, ters çevireceğiz)
        this.db.orderByChild('score').limitToLast(100).once('value').then((snapshot) => {
            this.isLoading = false;
            const data = [];
            snapshot.forEach((childSnapshot) => {
                data.push(childSnapshot.val());
            });
            // orderByChild küçükten büyüğe sıralar, ters çevirip büyükten küçüğe alıyoruz
            this.scores = data.reverse();
            
            if (callback) {
                callback();
            } else {
                // Sadece güncelleyip bırak (Arayüz açıksa günceller)
                if (container && modal && !modal.classList.contains('hidden')) {
                    container.innerHTML = this.buildTableHTML();
                }
            }
        }).catch((error) => {
            console.error("Firebase'den veriler okunamadı:", error);
            this.isLoading = false;
            if (callback) callback();
        });
    }

    isTop10(score) {
        if (score <= 0) return false;
        if (!this.scores || this.scores.length < 100) return true; // 100 kişiden az varsa direkt listeye girer
        return score > this.scores[this.scores.length - 1].score;
    }

    addScore(name, score, charType, isVictory = false) {
        const cleanName = (name && name.trim().length > 0) ? name.trim().substring(0, 12) : 'Pilot';
        const numScore = parseInt(score, 10) || 0;

        const hasBadge = window.uiManager && window.uiManager.playerProfile && window.uiManager.playerProfile.correctAnswers >= 10;
        
        const newEntry = {
            name: cleanName,
            score: numScore,
            char: charType || 'drone',
            isVictory: !!isVictory,
            hasBadge: !!hasBadge,
            date: new Date().toLocaleDateString('tr-TR'),
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        // Firebase'e yeni kayıt olarak it (push)
        this.db.push(newEntry).then(() => {
            // Eklendikten sonra listeyi tekrar çek ve göster
            this.showLeaderboard();
        }).catch(err => {
            console.error("Firebase skor kaydetme hatası:", err);
            this.showLeaderboard();
        });
    }

    showNameInput(score, isVictory = false) {
        this.pendingScore = score > 0 ? score : (window.gameEngine ? window.gameEngine.score : 0);
        this.pendingIsVictory = isVictory;

        // Eğer profilde isim varsa, isim sorma, direkt kaydet!
        let profileName = null;
        try {
            const savedProfile = localStorage.getItem('flappy_player_profile');
            if (savedProfile) {
                profileName = JSON.parse(savedProfile).name;
            }
        } catch (e) {}

        if (profileName) {
            // Direkt submitName logic'ini çalıştır
            const charType = window.characterManager ? window.characterManager.selectedCharacter : 'drone';
            
            // Loading state'i başlat ve modalı aç
            this.isLoading = true;
            const lbModal = document.getElementById('leaderboardModal');
            if (lbModal) lbModal.classList.remove('hidden');
            
            const container = document.getElementById('leaderboardContent');
            if (container) container.innerHTML = this.buildTableHTML();

            // Firebase'e ekle
            this.addScore(profileName, this.pendingScore, charType, this.pendingIsVictory);
            return;
        }

        const modal = document.getElementById('nameInputModal');
        const scoreDisplay = document.getElementById('nameInputScore');
        const input = document.getElementById('playerNameInput');

        if (scoreDisplay) scoreDisplay.innerText = this.pendingScore + ' PUAN';
        if (input) {
            input.value = '';
            setTimeout(() => input.focus(), 200);
        }
        if (modal) modal.classList.remove('hidden');
    }

    submitName() {
        const modal = document.getElementById('nameInputModal');
        const input = document.getElementById('playerNameInput');
        const name = input ? input.value : '';

        const score = this.pendingScore > 0 ? this.pendingScore : (window.gameEngine ? window.gameEngine.score : 0);
        const charType = window.characterManager ? window.characterManager.selectedCharacter : 'drone';
        
        if (modal) modal.classList.add('hidden');
        
        // Loading state'i başlat ve modalı aç
        this.isLoading = true;
        const lbModal = document.getElementById('leaderboardModal');
        if (lbModal) lbModal.classList.remove('hidden');
        
        const container = document.getElementById('leaderboardContent');
        if (container) container.innerHTML = this.buildTableHTML();

        // Firebase'e ekle (asenkron - bitince listeyi kendi güncelleyecek)
        this.addScore(name, score, charType, this.pendingIsVictory);
    }

    showLeaderboard() {
        const modal = document.getElementById('leaderboardModal');
        if (modal) modal.classList.remove('hidden');
        
        // Açılır açılmaz veriyi Firebase'den güncel olarak çek
        this.loadScores(() => {
            const container = document.getElementById('leaderboardContent');
            if (container) {
                container.innerHTML = this.buildTableHTML();
            }
        });
    }

    buildTableHTML() {
        const lang = window.currentLang || 'tr';
        const t = window.i18n ? window.i18n[lang] : window.i18n['tr'];

        if (this.isLoading) {
            return `
                <div class="leaderboard-empty" style="padding: 30px 15px; text-align: center; color: rgba(255,255,255,0.7); font-family: 'Outfit', sans-serif;">
                    <div style="font-size: 2.2rem; margin-bottom: 8px;">⏳</div>
                    <div style="font-weight: 700; font-size: 1.15rem; color: #ffd54f; margin-bottom: 4px;">${lang === 'tr' ? 'Sunucuya Bağlanılıyor...' : 'Connecting to Server...'}</div>
                    <div style="font-size: 0.88rem; opacity: 0.7;">${lang === 'tr' ? 'Gerçek zamanlı küresel skorlar yükleniyor' : 'Loading real-time global scores'}</div>
                </div>
            `;
        }

        if (!this.scores || this.scores.length === 0) {
            return `
                <div class="leaderboard-empty" style="padding: 30px 15px; text-align: center; color: rgba(255,255,255,0.7); font-family: 'Outfit', sans-serif;">
                    <div style="font-size: 2.2rem; margin-bottom: 8px;">🏆</div>
                    <div style="font-weight: 700; font-size: 1.15rem; color: #ffd54f; margin-bottom: 4px;">${lang === 'tr' ? 'Henüz Kayıtlı Skor Yok' : 'No Scores Yet'}</div>
                    <div style="font-size: 0.88rem; opacity: 0.7;">${lang === 'tr' ? 'İlk uçuşunu yap, rekor kır ve adını 1. sıraya yazdır!' : 'Make your first flight and take the #1 spot!'}</div>
                </div>
            `;
        }

        const charIcons = {
            drone: '🛸',
            kartal: '🦅',
            roket: '🚀',
            fuze: '🎯'
        };

        let html = `
            <table class="leaderboard-table">
                <thead>
                    <tr>
                        <th style="width:44px; text-align:center;">${t ? t.thRank : 'SIRA'}</th>
                        <th>${t ? t.thPilot : 'PİLOT & KARAKTER'}</th>
                        <th style="text-align:right;">${t ? t.thScore : 'SKOR'}</th>
                    </tr>
                </thead>
                <tbody>
        `;

        this.scores.forEach((entry, index) => {
            const rank = index + 1;
            let rankBadge = `${rank}`;
            let rowClass = 'leaderboard-row';

            if (rank === 1) {
                rankBadge = '🥇';
                rowClass += ' rank-1';
            } else if (rank === 2) {
                rankBadge = '🥈';
                rowClass += ' rank-2';
            } else if (rank === 3) {
                rankBadge = '🥉';
                rowClass += ' rank-3';
            } else if (rank <= 5) {
                rowClass += ' rank-honor';
                rankBadge = `🎖️ ${rank}`;
            }

            const charIcon = charIcons[entry.char] || '🛸';
            const crown = entry.isVictory ? ' 👑' : '';
            const bilginBadge = entry.hasBadge ? ' 🎓' : '';

            html += `
                <tr class="${rowClass}">
                    <td>${rankBadge}</td>
                    <td><strong>${entry.name}</strong> ${crown}${bilginBadge} <span style="opacity:0.75; font-size:0.85em; margin-left: 4px;">${charIcon}</span></td>
                    <td><strong>${entry.score}</strong></td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;
        return html;
    }
}

window.uiManager = null;
window.leaderboardManager = null;
window.addEventListener('DOMContentLoaded', () => {
    window.leaderboardManager = new LeaderboardManager();
    window.uiManager = new UIManager();
});
