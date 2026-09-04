/**
 * Flappy Horizon - Seviye ve Çevre Dünyaları Motoru
 * 5 Farklı Tematik Dünya: Cyber Rings, Alp Dağları, Gökdelenler, Kutup Buzulları ve Mega Gemiler.
 */

class LevelManager {
    constructor() {
        this.currentLevelIndex = 0;

        this.levels = [
            {
                id: 'cyber',
                name: 'Neon Siber Şehir',
                subtitle: 'Halkalar ve Enerji Kapıları',
                skyColorTop: '#0d0221',
                skyColorBottom: '#240046',
                groundColor: '#0f0c29',
                groundStripeColor: '#00f7ff',
                obstacleColor: '#7b2cbf',
                obstacleBorder: '#00f7ff',
                hasRings: true,
                ringColor: '#00f7ff',
                bgLayers: ['cyber_grid', 'cyber_buildings', 'cyber_holograms']
            },
            {
                id: 'mountain',
                name: 'Alp Dağ Zirveleri',
                subtitle: 'Sarp Kayalıklar ve Sisli Zirveler',
                skyColorTop: '#1e3c72',
                skyColorBottom: '#ff7e5f',
                groundColor: '#2b2d42',
                groundStripeColor: '#8d99ae',
                obstacleColor: '#3a506b',
                obstacleBorder: '#b0c4de',
                hasRings: false,
                ringColor: '#ffd700',
                bgLayers: ['mountain_far', 'mountain_near', 'fog_clouds']
            },
            {
                id: 'city',
                name: 'Metropol Gökdelenler',
                subtitle: 'Işıltılı Kuleler ve Vinçler',
                skyColorTop: '#0f2027',
                skyColorBottom: '#203a43',
                groundColor: '#111827',
                groundStripeColor: '#fbbf24',
                obstacleColor: '#1e293b',
                obstacleBorder: '#38bdf8',
                hasRings: false,
                ringColor: '#38bdf8',
                bgLayers: ['city_skyline', 'city_towers', 'city_cranes']
            },
            {
                id: 'arctic',
                name: 'Kutup Buzulları',
                subtitle: 'Kuzey Işıkları ve Kristal Sarkıtlar',
                skyColorTop: '#051923',
                skyColorBottom: '#003554',
                groundColor: '#006494',
                groundStripeColor: '#e0f7fa',
                obstacleColor: '#00a6fb',
                obstacleBorder: '#e0f7fa',
                hasRings: true,
                ringColor: '#00ffff',
                bgLayers: ['aurora', 'icebergs_far', 'icebergs_near']
            },
            {
                id: 'ocean',
                name: 'Mega Gemiler & Okyanus',
                subtitle: 'Devasa Konteyner Gemileri ve Fenerler',
                skyColorTop: '#0a192f',
                skyColorBottom: '#172a45',
                groundColor: '#0c2340',
                groundStripeColor: '#64ffda',
                obstacleColor: '#8b0000',
                obstacleBorder: '#ff6b6b',
                hasRings: false,
                ringColor: '#ffd166',
                bgLayers: ['ocean_sky', 'ocean_ships_bg', 'ocean_waves']
            }
        ];

        this.scrollOffset = 0;
        this.auroraWave = 0;
        this.loadSavedLevel();
    }

    loadSavedLevel() {
        try {
            const saved = localStorage.getItem('flappy_level_index');
            if (saved !== null) {
                this.currentLevelIndex = parseInt(saved, 10) % this.levels.length;
            }
        } catch (e) {
            console.warn('Seviye yüklenemedi:', e);
        }
    }

    setLevel(index) {
        this.currentLevelIndex = index % this.levels.length;
        try {
            localStorage.setItem('flappy_level_index', this.currentLevelIndex);
        } catch (e) {}
        window.particleEngine.setTheme(this.getCurrentLevel().id);
    }

    getCurrentLevel() {
        return this.levels[this.currentLevelIndex];
    }

    update(speed) {
        this.scrollOffset += speed;
        this.auroraWave += 0.02;
    }

    // ARKA PLAN ÇİZİMİ
    drawBackground(ctx, width, height) {
        const lvl = this.getCurrentLevel();

        // 1. Gökyüzü Degrade (Gradient)
        const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
        skyGrad.addColorStop(0, lvl.skyColorTop);
        skyGrad.addColorStop(1, lvl.skyColorBottom);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, height);

        // 2. Seviyeye Özel Katmanlar (Parallax)
        switch (lvl.id) {
            case 'cyber':
                this.drawCyberBg(ctx, width, height);
                break;
            case 'mountain':
                this.drawMountainBg(ctx, width, height);
                break;
            case 'city':
                this.drawCityBg(ctx, width, height);
                break;
            case 'arctic':
                this.drawArcticBg(ctx, width, height);
                break;
            case 'ocean':
                this.drawOceanBg(ctx, width, height);
                break;
        }
    }

    // 1. Cyber Şehir Arka Planı
    drawCyberBg(ctx, width, height) {
        // Dijital Ufuk Çizgisi
        const scroll1 = (this.scrollOffset * 0.2) % 120;
        ctx.strokeStyle = 'rgba(0, 247, 255, 0.15)';
        ctx.lineWidth = 1;
        for (let x = -scroll1; x < width; x += 30) {
            ctx.beginPath();
            ctx.moveTo(x, height * 0.5);
            ctx.lineTo(x * 1.3 - 50, height * 0.85);
            ctx.stroke();
        }

        // Binalar silueti
        const scroll2 = (this.scrollOffset * 0.4) % 240;
        ctx.fillStyle = 'rgba(36, 0, 70, 0.7)';
        for (let x = -scroll2 - 60; x < width + 100; x += 60) {
            const bh = 140 + Math.sin(x * 0.05) * 60;
            ctx.fillRect(x, height * 0.85 - bh, 45, bh);
            // Neon bina tepesi
            ctx.fillStyle = '#ff007f';
            ctx.fillRect(x + 18, height * 0.85 - bh - 6, 8, 6);
            ctx.fillStyle = 'rgba(36, 0, 70, 0.7)';
        }
    }

    // 2. Alp Dağları Arka Planı
    drawMountainBg(ctx, width, height) {
        // Uzak Dağlar
        const scroll1 = (this.scrollOffset * 0.15) % 300;
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.moveTo(0, height * 0.85);
        for (let x = -scroll1 - 100; x < width + 200; x += 150) {
            ctx.lineTo(x + 75, height * 0.45);
            ctx.lineTo(x + 150, height * 0.85);
        }
        ctx.fill();

        // Karlı Zirveler
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        for (let x = -scroll1 - 100; x < width + 200; x += 150) {
            ctx.beginPath();
            ctx.moveTo(x + 75, height * 0.45);
            ctx.lineTo(x + 55, height * 0.53);
            ctx.lineTo(x + 75, height * 0.50);
            ctx.lineTo(x + 95, height * 0.53);
            ctx.closePath();
            ctx.fill();
        }

        // Yakın Tepe ve Çamlar
        const scroll2 = (this.scrollOffset * 0.35) % 200;
        ctx.fillStyle = '#1b2a4a';
        ctx.beginPath();
        ctx.moveTo(0, height * 0.85);
        for (let x = -scroll2 - 80; x < width + 100; x += 100) {
            ctx.lineTo(x + 50, height * 0.65);
            ctx.lineTo(x + 100, height * 0.85);
        }
        ctx.fill();
    }

    // 3. Metropol Gökdelenler Arka Planı
    drawCityBg(ctx, width, height) {
        const scroll = (this.scrollOffset * 0.3) % 220;
        for (let x = -scroll - 60; x < width + 80; x += 55) {
            const h = 180 + Math.abs(Math.sin(x * 0.08)) * 120;
            ctx.fillStyle = '#162436';
            ctx.fillRect(x, height * 0.85 - h, 48, h);

            // Pencere Işıkları
            ctx.fillStyle = '#fef08a';
            for (let wy = height * 0.85 - h + 15; wy < height * 0.85 - 15; wy += 22) {
                if ((x + wy) % 3 === 0) {
                    ctx.fillRect(x + 8, wy, 8, 10);
                    ctx.fillRect(x + 24, wy, 8, 10);
                }
            }
        }
    }

    // 4. Kutup Buzulları (Aurora Borealis) Arka Planı
    drawArcticBg(ctx, width, height) {
        // Kuzey Işıkları (Aurora) Dalgaları
        ctx.save();
        ctx.globalAlpha = 0.35;
        const auroraGrad = ctx.createLinearGradient(0, 0, width, height * 0.6);
        auroraGrad.addColorStop(0, '#00f5d4');
        auroraGrad.addColorStop(0.5, '#7b2cbf');
        auroraGrad.addColorStop(1, '#00bbf9');
        ctx.fillStyle = auroraGrad;
        ctx.beginPath();
        ctx.moveTo(0, height * 0.1);
        for (let x = 0; x <= width; x += 30) {
            const y = height * 0.2 + Math.sin(x * 0.01 + this.auroraWave) * 45 + Math.cos(x * 0.02) * 20;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(width, 0);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Buz Dağları (Icebergs)
        const scroll = (this.scrollOffset * 0.25) % 250;
        ctx.fillStyle = 'rgba(224, 247, 250, 0.4)';
        for (let x = -scroll - 100; x < width + 100; x += 120) {
            ctx.beginPath();
            ctx.moveTo(x, height * 0.85);
            ctx.lineTo(x + 60, height * 0.60);
            ctx.lineTo(x + 120, height * 0.85);
            ctx.closePath();
            ctx.fill();
        }
    }

    // 5. Okyanus & Mega Gemiler Arka Planı
    drawOceanBg(ctx, width, height) {
        // Uzak Gemi Silueti
        const scrollShip = (this.scrollOffset * 0.15) % 400;
        ctx.fillStyle = 'rgba(10, 37, 64, 0.8)';
        ctx.fillRect(width - scrollShip, height * 0.72, 140, 25);
        ctx.fillRect(width - scrollShip + 90, height * 0.66, 30, 20); // Kaptan köşkü
        // Gemi kargo konteynerleri
        ctx.fillStyle = '#e63946';
        ctx.fillRect(width - scrollShip + 10, height * 0.68, 25, 12);
        ctx.fillStyle = '#457b9d';
        ctx.fillRect(width - scrollShip + 40, height * 0.68, 25, 12);

        // Okyanus Dalgaları
        ctx.fillStyle = '#113f67';
        ctx.beginPath();
        ctx.moveTo(0, height * 0.85);
        const waveScroll = this.scrollOffset * 0.5;
        for (let x = 0; x <= width; x += 20) {
            const wy = height * 0.80 + Math.sin(x * 0.04 + waveScroll * 0.05) * 8;
            ctx.lineTo(x, wy);
        }
        ctx.lineTo(width, height * 0.85);
        ctx.closePath();
        ctx.fill();
    }

    // ZEMİN ÇİZİMİ
    drawGround(ctx, width, height, groundHeight) {
        const lvl = this.getCurrentLevel();
        const gy = height - groundHeight;

        // Ana Zemin Gövdesi
        ctx.fillStyle = lvl.groundColor;
        ctx.fillRect(0, gy, width, groundHeight);

        // Üst Zemin Şeridi
        ctx.fillStyle = lvl.groundStripeColor;
        ctx.fillRect(0, gy, width, 5);

        // Zemin Kayan Çizgileri / Izgarası
        const step = 28;
        const scroll = (this.scrollOffset * 1.0) % step;
        ctx.strokeStyle = lvl.groundStripeColor;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 2.5;

        for (let x = -scroll; x < width + step; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, gy + 5);
            ctx.lineTo(x - 14, height);
            ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
    }

    // ENGEL (BORU / KULE / SÜTUN / GEMİ / KAPALI DUVAR) ÇİZİMİ
    drawObstacle(ctx, x, topY, bottomY, width, height, groundHeight, obsData) {
        const lvl = this.getCurrentLevel();
        const obsWidth = 64;

        ctx.save();
        ctx.shadowColor = lvl.obstacleBorder;
        ctx.shadowBlur = 8;

        if (obsData && obsData.isMathGate) {
            // ====== YENİ DEVASA MATEMATİK KAPISI (Faz 3) ======
            const playArea = height - groundHeight;
            
            // 1. Üst Alan (Mavi)
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(56, 189, 248, 0.15)'; // Hafif mavi
            ctx.fillRect(x, 0, obsWidth, obsData.gapBottom1);
            
            ctx.fillStyle = 'rgba(56, 189, 248, 0.8)';
            ctx.font = 'bold 24px "Outfit", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`[ ${obsData.topVal} ]`, x + obsWidth/2, obsData.gapBottom1 / 2);
            
            // 2. Alt Alan (Turuncu)
            ctx.fillStyle = 'rgba(249, 115, 22, 0.15)'; // Hafif turuncu
            ctx.fillRect(x, obsData.gapTop2, obsWidth, playArea - obsData.gapTop2);
            
            ctx.fillStyle = 'rgba(249, 115, 22, 0.8)';
            ctx.fillText(`[ ${obsData.bottomVal} ]`, x + obsWidth/2, obsData.gapTop2 + (playArea - obsData.gapTop2)/2);
            
            // 3. Ortadaki Ayraç Blok (Neon Çizgi)
            const separatorY = obsData.gapBottom1;
            const separatorH = obsData.gapTop2 - obsData.gapBottom1;
            
            ctx.shadowColor = '#0ea5e9';
            ctx.shadowBlur = 15;
            
            // Ayraç gövdesi
            const grad = ctx.createLinearGradient(x, separatorY, x + obsWidth, separatorY);
            grad.addColorStop(0, '#0ea5e9');
            grad.addColorStop(0.5, '#fbbf24');
            grad.addColorStop(1, '#f97316');
            
            ctx.fillStyle = grad;
            ctx.fillRect(x, separatorY, obsWidth, separatorH);
            
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, separatorY, obsWidth, separatorH);
            
            ctx.restore();
            return;
        } else if (obsData && obsData.isWalled && obsData.window) {
            // ====== KAPALI SÜTUN + SÜRGÜ PENCERELİ DUVAR ======
            const w = obsData.window;
            const playArea = height - groundHeight;
            const currentWindowH = w.height * w.openProgress;
            const windowCenter = w.y + w.height / 2;
            const windowTop = windowCenter - currentWindowH / 2;
            const windowBottom = windowCenter + currentWindowH / 2;

            // 1. Pencere ÜSTÜ duvar (tavandan pencere üstüne kadar)
            if (windowTop > 0) {
                this.renderObstacleBody(ctx, lvl, x, 0, obsWidth, windowTop, true);
            }

            // 2. Pencere ALTI duvar (pencere altından zemine kadar)
            if (windowBottom < playArea) {
                this.renderObstacleBody(ctx, lvl, x, windowBottom, obsWidth, playArea - windowBottom, false);
            }

            // 3. Pencere açıkken: Hafif arka plan ve ince kenar çizgisi
            if (w.openProgress > 0.05) {
                // Hafif şeffaf geçiş alanı
                ctx.fillStyle = `rgba(255, 255, 255, ${0.06 + w.openProgress * 0.06})`;
                ctx.fillRect(x, windowTop, obsWidth, currentWindowH);

                // Üst ve alt sürgü kenar çizgileri
                ctx.strokeStyle = lvl.obstacleBorder;
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.7;

                ctx.beginPath();
                ctx.moveTo(x - 3, windowTop);
                ctx.lineTo(x + obsWidth + 3, windowTop);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(x - 3, windowBottom);
                ctx.lineTo(x + obsWidth + 3, windowBottom);
                ctx.stroke();

                ctx.globalAlpha = 1.0;
            }

            // 4. Sürgü rayları (sol ve sağ kenarlarda ince çizgi)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.fillRect(x - 1, w.y, 2, w.height);
            ctx.fillRect(x + obsWidth - 1, w.y, 2, w.height);

        } else {
            // ====== NORMAL ENGEL (Mevcut Sistem) ======
            if (topY > 0) {
                this.renderObstacleBody(ctx, lvl, x, 0, obsWidth, topY, true);
            }

            const botH = height - groundHeight - bottomY;
            if (botH > 0) {
                this.renderObstacleBody(ctx, lvl, x, bottomY, obsWidth, botH, false);
            }
        }

        ctx.restore();
    }

    renderObstacleBody(ctx, lvl, x, y, w, h, isTop) {
        const capHeight = 22;
        const capOverhang = 6;

        // Ana Sütun / Yapı
        ctx.fillStyle = lvl.obstacleColor;
        ctx.strokeStyle = lvl.obstacleBorder;
        ctx.lineWidth = 3;

        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);

        // Seviye Temalı Ayrıntılar
        if (lvl.id === 'cyber') {
            // Neon enerji çizgileri
            ctx.fillStyle = lvl.obstacleBorder;
            ctx.fillRect(x + w / 2 - 2, y, 4, h);
            // Yatay parıldayan şeritler
            for (let sy = y + 15; sy < y + h; sy += 30) {
                ctx.fillRect(x + 6, sy, w - 12, 3);
            }
        } else if (lvl.id === 'city') {
            // Gökdelen pencereleri
            ctx.fillStyle = '#fef08a';
            for (let wy = y + 12; wy < y + h - 12; wy += 20) {
                ctx.fillRect(x + 10, wy, 8, 8);
                ctx.fillRect(x + w - 18, wy, 8, 8);
            }
        } else if (lvl.id === 'ocean') {
            // Gemi vinci & çelik kirişler
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y); ctx.lineTo(x + w, y + h);
            ctx.moveTo(x + w, y); ctx.lineTo(x, y + h);
            ctx.stroke();
        } else if (lvl.id === 'arctic') {
            // Kristal yansıma çizgisi
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fillRect(x + 6, y, 5, h);
        }

        // Başlık / Kapak (Cap)
        const capY = isTop ? (y + h - capHeight) : y;
        ctx.fillStyle = lvl.obstacleBorder;
        ctx.fillRect(x - capOverhang, capY, w + (capOverhang * 2), capHeight);
        ctx.strokeRect(x - capOverhang, capY, w + (capOverhang * 2), capHeight);
    }

    // ÖZEL TOPLANABİLİR EŞYA (COLLECTIBLE) ÇİZİMİ
    drawCollectible(ctx, x, y, radius, type) {
        ctx.save();
        ctx.translate(x, y);

        const pulse = Math.sin(Date.now() * 0.005) * 2;
        
        if (type === 'gold') {
            // Altın sikke (Dönen para görünümü)
            const width = radius * 0.7 * Math.abs(Math.cos(Date.now() * 0.003));
            ctx.fillStyle = '#fef08a'; // Açık altın
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.ellipse(0, 0, width + 2, radius, 0, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#eab308'; // Koyu altın iç
            ctx.beginPath();
            ctx.ellipse(0, 0, width * 0.7 + 1, radius * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Değerli Taş (Mücevher) Çizimi (Diamond, Emerald, Ruby)
            let mainColor, lightColor, shadowColor;
            
            if (type === 'diamond') {
                mainColor = '#0ea5e9'; lightColor = '#7dd3fc'; shadowColor = '#0284c7';
            } else if (type === 'emerald') {
                mainColor = '#10b981'; lightColor = '#6ee7b7'; shadowColor = '#047857';
            } else if (type === 'ruby') {
                mainColor = '#e11d48'; lightColor = '#fda4af'; shadowColor = '#9f1239';
            }
            
            ctx.shadowColor = lightColor;
            ctx.shadowBlur = 15 + pulse * 2;
            
            ctx.translate(0, pulse); // Hafif yukarı aşağı süzülme
            
            // Altıgen / Elmas Şekli (Poligon)
            ctx.beginPath();
            ctx.moveTo(0, -radius);
            ctx.lineTo(radius * 0.8, -radius * 0.2);
            ctx.lineTo(0, radius);
            ctx.lineTo(-radius * 0.8, -radius * 0.2);
            ctx.closePath();
            
            // İç Gradient
            const grad = ctx.createLinearGradient(0, -radius, 0, radius);
            grad.addColorStop(0, lightColor);
            grad.addColorStop(0.5, mainColor);
            grad.addColorStop(1, shadowColor);
            ctx.fillStyle = grad;
            ctx.fill();
            
            // Parlama Çizgileri
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -radius);
            ctx.lineTo(0, radius);
            ctx.stroke();
        }

        ctx.restore();
    }
}

window.levelManager = new LevelManager();
