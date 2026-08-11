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
        this.bindMenuButtons();
        this.bindCustomizationControls();
        this.bindLevelSelector();
        this.startPreviewLoop();
    }

    bindMenuButtons() {
        // Oyna / Başla Butonları
        const startBtn = document.getElementById('btnStartGame');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                window.soundSystem.playClick();
                window.gameEngine.startPlay();
            });
        }

        const restartBtn = document.getElementById('btnRestartGame');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                window.soundSystem.playClick();
                window.gameEngine.startPlay();
            });
        }

        const menuBtn = document.getElementById('btnBackToMenu');
        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                window.soundSystem.playClick();
                window.gameEngine.state = 'MENU';
                document.getElementById('gameOverMenu').classList.add('hidden');
                document.getElementById('mainMenu').classList.remove('hidden');
            });
        }

        // Atölye / Garaj Butonları
        const garageBtn = document.getElementById('btnOpenGarage');
        const garageModal = document.getElementById('garageModal');
        const closeGarageBtn = document.getElementById('btnCloseGarage');

        if (garageBtn) {
            garageBtn.addEventListener('click', () => {
                window.soundSystem.playClick();
                this.updateGarageControls();
                garageModal.classList.remove('hidden');
            });
        }

        if (closeGarageBtn) {
            closeGarageBtn.addEventListener('click', () => {
                window.soundSystem.playClick();
                window.characterManager.saveConfigs();
                garageModal.classList.add('hidden');
            });
        }

        // Seviye Seçim Butonu & Modalı
        const levelBtn = document.getElementById('btnOpenLevels');
        const levelModal = document.getElementById('levelModal');
        const closeLevelBtn = document.getElementById('btnCloseLevels');

        if (levelBtn) {
            levelBtn.addEventListener('click', () => {
                window.soundSystem.playClick();
                this.renderLevelGrid();
                levelModal.classList.remove('hidden');
            });
        }

        if (closeLevelBtn) {
            closeLevelBtn.addEventListener('click', () => {
                window.soundSystem.playClick();
                levelModal.classList.add('hidden');
            });
        }

        // Ses Aç/Kapa Butonları
        const soundBtns = document.querySelectorAll('.btn-sound-toggle');
        soundBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const isMuted = window.soundSystem.toggleMute();
                soundBtns.forEach(b => {
                    b.innerHTML = isMuted ? '🔇' : '🔊';
                });
            });
        });

        // Duraklatma Butonu
        const pauseBtn = document.getElementById('btnPause');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                window.soundSystem.playClick();
                window.gameEngine.togglePause();
            });
        }

        const resumeBtn = document.getElementById('btnResume');
        if (resumeBtn) {
            resumeBtn.addEventListener('click', () => {
                window.soundSystem.playClick();
                window.gameEngine.togglePause();
            });
        }
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

window.uiManager = null;
window.addEventListener('DOMContentLoaded', () => {
    window.uiManager = new UIManager();
});
