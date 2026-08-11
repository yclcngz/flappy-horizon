/**
 * Flappy Horizon - Karakter Çizim ve Özelleştirme Motoru
 * Drone, Kartal, Roket ve Füze için zengin Canvas vektörel çizimleri ve canlı önizleme.
 */

class CharacterManager {
    constructor() {
        this.selectedCharacter = 'drone'; // 'drone', 'kartal', 'roket', 'fuze'

        // Varsayılan ve Özelleştirilebilir Karakter Ayarları
        this.configs = {
            drone: {
                model: 'quad', // 'quad', 'stealth', 'sphere'
                bodyColor: '#1e293b',
                accentColor: '#38bdf8',
                lightColor: '#00f7ff',
                propellerGlow: '#00f7ff'
            },
            kartal: {
                species: 'altin', // 'altin', 'sahin', 'akbas', 'siber'
                bodyColor: '#5c3818',
                wingColor: '#3d230d',
                beakColor: '#f59e0b',
                eyeColor: '#fbbf24',
                featherColor: '#d97706'
            },
            roket: {
                model: 'falcon', // 'falcon', 'apollo', 'scifi'
                bodyColor: '#f8fafc',
                finColor: '#ef4444',
                cockpitColor: '#38bdf8',
                flameColor: '#ff5722' // '#ff5722' (Ateş), '#00f7ff' (Plazma), '#a855f7' (Antimadde), '#10b981' (İyon)
            },
            fuze: {
                camo: 'cyber', // 'stealth', 'military', 'cyber', 'crimson'
                bodyColor: '#18181b',
                warheadColor: '#f43f5e',
                finColor: '#71717a',
                trailColor: '#ff9100'
            }
        };

        this.loadSavedConfigs();
        this.wingAngle = 0;
        this.propellerAngle = 0;
        this.flameFlicker = 1;
    }

    loadSavedConfigs() {
        try {
            const savedChar = localStorage.getItem('flappy_selected_char');
            if (savedChar && this.configs[savedChar]) {
                this.selectedCharacter = savedChar;
            }
            const savedConfigs = localStorage.getItem('flappy_char_configs');
            if (savedConfigs) {
                const parsed = JSON.parse(savedConfigs);
                for (let key in parsed) {
                    if (this.configs[key]) {
                        this.configs[key] = { ...this.configs[key], ...parsed[key] };
                    }
                }
            }
        } catch (e) {
            console.warn('LocalStorage yüklenemedi:', e);
        }
    }

    saveConfigs() {
        try {
            localStorage.setItem('flappy_selected_char', this.selectedCharacter);
            localStorage.setItem('flappy_char_configs', JSON.stringify(this.configs));
        } catch (e) {
            console.warn('LocalStorage kaydedilemedi:', e);
        }
    }

    setSelected(charType) {
        if (this.configs[charType]) {
            this.selectedCharacter = charType;
            this.saveConfigs();
        }
    }

    getConfig(charType = null) {
        return this.configs[charType || this.selectedCharacter];
    }

    updateAnimation(isFlapping = false) {
        this.propellerAngle += 0.45;
        this.flameFlicker = 0.8 + Math.random() * 0.4;

        if (isFlapping) {
            this.wingAngle = Math.sin(Date.now() * 0.025) * 0.75;
        } else {
            this.wingAngle = Math.sin(Date.now() * 0.008) * 0.35;
        }
    }

    // Ana Çizim Metodu (Oyun ve Önizleme için ortak)
    draw(ctx, x, y, angle = 0, charType = null, scale = 1) {
        const type = charType || this.selectedCharacter;
        const cfg = this.configs[type];

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.scale(scale, scale);

        switch (type) {
            case 'drone':
                this.drawDrone(ctx, cfg);
                break;
            case 'kartal':
                this.drawKartal(ctx, cfg);
                break;
            case 'roket':
                this.drawRoket(ctx, cfg);
                break;
            case 'fuze':
                this.drawFuze(ctx, cfg);
                break;
        }

        ctx.restore();
    }

    // 1. DRONE ÇİZİMİ
    drawDrone(ctx, cfg) {
        const { bodyColor, accentColor, lightColor, model } = cfg;

        // Rotor kolları
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        if (model === 'stealth') {
            ctx.moveTo(-16, -12); ctx.lineTo(16, 12);
            ctx.moveTo(-16, 12); ctx.lineTo(16, -12);
        } else {
            ctx.moveTo(-18, -10); ctx.lineTo(18, -10);
            ctx.moveTo(-18, 10); ctx.lineTo(18, 10);
        }
        ctx.stroke();

        // Pervaneler (Dönen blur efekti)
        ctx.fillStyle = cfg.propellerGlow || lightColor;
        ctx.globalAlpha = 0.7;
        const propOffsets = [[-18, -10], [18, -10], [-18, 10], [18, 10]];
        propOffsets.forEach(([px, py]) => {
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(this.propellerAngle);
            ctx.beginPath();
            ctx.ellipse(0, 0, 9, 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
        ctx.globalAlpha = 1.0;

        // Ana Gövde
        ctx.fillStyle = bodyColor;
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (model === 'sphere') {
            ctx.arc(0, 0, 14, 0, Math.PI * 2);
        } else if (model === 'stealth') {
            ctx.moveTo(18, 0);
            ctx.lineTo(-6, -13);
            ctx.lineTo(-14, 0);
            ctx.lineTo(-6, 13);
            ctx.closePath();
        } else {
            // Quad yuvarlak aerodinamik kabin
            ctx.ellipse(0, 0, 16, 11, 0, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.stroke();

        // Merkezi Optik / LED Göz
        ctx.fillStyle = lightColor;
        ctx.shadowColor = lightColor;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(6, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Gövde neon şeritleri
        ctx.fillStyle = lightColor;
        ctx.fillRect(-8, -2, 8, 4);
    }

    // 2. KARTAL ÇİZİMİ
    drawKartal(ctx, cfg) {
        const { bodyColor, wingColor, beakColor, eyeColor } = cfg;

        // Kuyruk tüyleri
        ctx.fillStyle = wingColor;
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.lineTo(-24, -6);
        ctx.lineTo(-20, 0);
        ctx.lineTo(-24, 6);
        ctx.closePath();
        ctx.fill();

        // Kanat (Dinamik çırpma açısı)
        ctx.save();
        ctx.translate(-2, -4);
        ctx.rotate(this.wingAngle);
        ctx.fillStyle = wingColor;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-8, -24, 6, -26);
        ctx.quadraticCurveTo(14, -14, 10, 0);
        ctx.closePath();
        ctx.fill();

        // Kanat ucu tüy katmanları
        ctx.fillStyle = cfg.featherColor || '#d97706';
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(6, -26);
        ctx.lineTo(8, -14);
        ctx.fill();
        ctx.restore();

        // Gövde
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, 15, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Akbaş Kartal için beyaz kafa detayı
        if (cfg.species === 'akbas') {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(8, -3, 8, 0, Math.PI * 2);
            ctx.fill();
        } else if (cfg.species === 'siber') {
            // Siber kartal zırh plakası
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(4, -6, 6, 6);
        }

        // Keskin Gaga
        ctx.fillStyle = beakColor;
        ctx.beginPath();
        ctx.moveTo(13, -4);
        ctx.lineTo(23, -1);
        ctx.lineTo(13, 4);
        ctx.quadraticCurveTo(17, 0, 13, -4);
        ctx.fill();

        // Yırtıcı Kartal Gözü
        ctx.fillStyle = eyeColor;
        ctx.shadowColor = eyeColor;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(9, -4, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Gözbebeği
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(10, -4, 1.2, 0, Math.PI * 2);
        ctx.fill();
    }

    // 3. ROKET ÇİZİMİ
    drawRoket(ctx, cfg) {
        const { bodyColor, finColor, cockpitColor, flameColor, model } = cfg;

        // Roket İtiş Alevi (Titreşen plazma)
        ctx.save();
        ctx.translate(-16, 0);
        ctx.fillStyle = flameColor;
        ctx.shadowColor = flameColor;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(-18 * this.flameFlicker, 0);
        ctx.lineTo(0, 6);
        ctx.closePath();
        ctx.fill();

        // İç çekirdek sarı/beyaz alev
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, -3);
        ctx.lineTo(-10 * this.flameFlicker, 0);
        ctx.lineTo(0, 3);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();

        // Arka Kanatçıklar (Fins)
        ctx.fillStyle = finColor;
        ctx.beginPath();
        ctx.moveTo(-10, -8);
        ctx.lineTo(-18, -14);
        ctx.lineTo(-8, -4);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-10, 8);
        ctx.lineTo(-18, 14);
        ctx.lineTo(-8, 4);
        ctx.closePath();
        ctx.fill();

        // Gövde
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        if (model === 'scifi') {
            ctx.moveTo(-16, -9);
            ctx.lineTo(12, -7);
            ctx.lineTo(24, 0);
            ctx.lineTo(12, 7);
            ctx.lineTo(-16, 9);
            ctx.closePath();
        } else {
            // Falcon / Apollo konik aerodinamik burun
            ctx.moveTo(-14, -8);
            ctx.lineTo(8, -8);
            ctx.quadraticCurveTo(22, 0, 8, 8);
            ctx.lineTo(-14, 8);
            ctx.closePath();
        }
        ctx.fill();

        // Burun konisi çizgisi
        ctx.fillStyle = finColor;
        ctx.beginPath();
        ctx.moveTo(8, -8);
        ctx.quadraticCurveTo(22, 0, 8, 8);
        ctx.closePath();
        ctx.fill();

        // Kokpit Penceresi / Lüboz
        ctx.fillStyle = cockpitColor;
        ctx.shadowColor = cockpitColor;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(3, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Pencere parıltısı
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(4, -1.5, 1.3, 0, Math.PI * 2);
        ctx.fill();
    }

    // 4. FÜZE ÇİZİMİ
    drawFuze(ctx, cfg) {
        const { bodyColor, warheadColor, finColor, camo, trailColor } = cfg;

        // Roket motor egzoz kıvılcımı
        ctx.fillStyle = trailColor;
        ctx.shadowColor = trailColor;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(-14, -4);
        ctx.lineTo(-24 * this.flameFlicker, 0);
        ctx.lineTo(-14, 4);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        // Kuyruk Yönlendirme Kanatçıkları (X-Fin)
        ctx.fillStyle = finColor;
        ctx.beginPath();
        ctx.moveTo(-12, -5); ctx.lineTo(-18, -12); ctx.lineTo(-8, -4); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-12, 5); ctx.lineTo(-18, 12); ctx.lineTo(-8, 4); ctx.fill();

        // Gövde Silindiri
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(-14, -6, 24, 12, 2);
        } else {
            ctx.rect(-14, -6, 24, 12);
        }
        ctx.fill();

        // Kamuflaj / Siber Desen Detayı
        if (camo === 'cyber') {
            ctx.fillStyle = '#00f7ff';
            ctx.fillRect(-6, -4, 2, 8);
            ctx.fillRect(0, -4, 2, 8);
        } else if (camo === 'military') {
            ctx.fillStyle = '#4b5320';
            ctx.fillRect(-4, -6, 6, 12);
        }

        // Harp Başlığı (Warhead)
        ctx.fillStyle = warheadColor;
        ctx.beginPath();
        ctx.moveTo(10, -6);
        ctx.lineTo(23, 0);
        ctx.lineTo(10, 6);
        ctx.closePath();
        ctx.fill();

        // Orta Sabitleyici Kanatçıklar
        ctx.fillStyle = finColor;
        ctx.beginPath();
        ctx.moveTo(-2, -6);
        ctx.lineTo(4, -11);
        ctx.lineTo(4, -6);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-2, 6);
        ctx.lineTo(4, 11);
        ctx.lineTo(4, 6);
        ctx.fill();
    }
}

window.characterManager = new CharacterManager();
