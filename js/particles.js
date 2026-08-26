/**
 * Flappy Horizon - Parçacık ve Görsel Efekt Motoru
 * İtki alevleri, tüy dökülmeleri, halka patlamaları, çarpışma kıvılcımları ve hava efektleri.
 */

class ParticleEngine {
    constructor() {
        this.particles = [];
        this.weatherParticles = [];
        this.currentTheme = 'cyber';
        this.initWeather();
    }

    setTheme(theme) {
        this.currentTheme = theme;
        this.weatherParticles = [];
        this.initWeather();
    }

    initWeather() {
        const count = 35;
        for (let i = 0; i < count; i++) {
            this.weatherParticles.push({
                x: Math.random() * 800,
                y: Math.random() * 600,
                vx: this.currentTheme === 'arctic' ? -1 - Math.random() * 2 : (Math.random() - 0.5) * 0.5,
                vy: this.currentTheme === 'arctic' ? 1 + Math.random() * 2 : (this.currentTheme === 'ocean' ? 2 + Math.random() * 3 : Math.sin(i) * 0.3),
                size: Math.random() * 3 + 1,
                alpha: Math.random() * 0.6 + 0.2,
                color: this.getWeatherColor()
            });
        }
    }

    getWeatherColor() {
        switch (this.currentTheme) {
            case 'arctic': return '#e0f7fa'; // Kar taneleri
            case 'cyber': return '#00f7ff'; // Neon siber tozlar
            case 'ocean': return '#81d4fa'; // Deniz serpintisi / yağmur
            case 'mountain': return '#ffffff'; // Sis ve tüy bulutları
            case 'city': return '#ffd54f'; // Şehir ışık ışıltıları
            default: return '#ffffff';
        }
    }

    // Karakter motorundan / kanadından çıkan dinamik iz
    emitTrail(x, y, charType, charConfig) {
        const count = charType === 'roket' ? 3 : 2;
        for (let i = 0; i < count; i++) {
            if (charType === 'kartal') {
                // Süzülen tüy parçacığı
                this.particles.push({
                    type: 'feather',
                    x: x - 10 + (Math.random() * 6 - 3),
                    y: y + (Math.random() * 8 - 4),
                    vx: -1.5 - Math.random() * 1.5,
                    vy: Math.sin(Date.now() * 0.01) * 0.8 + (Math.random() * 0.6 - 0.3),
                    size: Math.random() * 5 + 4,
                    rotation: Math.random() * Math.PI * 2,
                    rotSpeed: (Math.random() - 0.5) * 0.1,
                    alpha: 0.8,
                    decay: 0.02 + Math.random() * 0.015,
                    color: charConfig.featherColor || '#d4af37'
                });
            } else if (charType === 'drone') {
                // Fütüristik rotor rüzgarı ve LED kıvılcımı
                this.particles.push({
                    type: 'drone_glow',
                    x: x - 12,
                    y: y + (Math.random() * 12 - 6),
                    vx: -2 - Math.random() * 2,
                    vy: (Math.random() - 0.5) * 1.2,
                    size: Math.random() * 4 + 2,
                    alpha: 0.9,
                    decay: 0.04,
                    color: charConfig.lightColor || '#00e5ff'
                });
            } else if (charType === 'roket') {
                // Yoğun alev ve duman
                const isSmoke = Math.random() > 0.6;
                this.particles.push({
                    type: isSmoke ? 'smoke' : 'flame',
                    x: x - 20,
                    y: y + (Math.random() * 6 - 3),
                    vx: -3.5 - Math.random() * 3,
                    vy: (Math.random() - 0.5) * 1.5,
                    size: isSmoke ? (Math.random() * 6 + 6) : (Math.random() * 7 + 4),
                    alpha: 0.9,
                    decay: isSmoke ? 0.025 : 0.06,
                    color: isSmoke ? '#555555' : (charConfig.flameColor || '#ff4500')
                });
            } else {
                // Füze itiş dumanı & kıvılcım
                this.particles.push({
                    type: 'missile_trail',
                    x: x - 18,
                    y: y + (Math.random() * 4 - 2),
                    vx: -4 - Math.random() * 2,
                    vy: (Math.random() - 0.5) * 0.8,
                    size: Math.random() * 5 + 3,
                    alpha: 0.85,
                    decay: 0.04,
                    color: charConfig.trailColor || '#ff9100'
                });
            }
        }
    }

    // Halka içinden geçildiğinde kutlama patlaması (Burst)
    emitRingBurst(x, y, ringColor = '#00f7ff') {
        const count = 28;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + (Math.random() * 0.2);
            const speed = 2.5 + Math.random() * 4;
            this.particles.push({
                type: 'ring_spark',
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 4 + 2,
                alpha: 1.0,
                decay: 0.03,
                color: Math.random() > 0.5 ? ringColor : '#ffffff'
            });
        }
    }
    
    // Uçuşan metin (Örn: +5 Puan, DOĞRU!, YANLIŞ!)
    emitFloatingText(x, y, text, color = '#ffffff') {
        this.particles.push({
            type: 'text',
            text: text,
            x: x,
            y: y,
            vx: 0,
            vy: -1.5, // Yukarı doğru süzülme
            size: 24, // Font boyutu
            alpha: 1.0,
            decay: 0.015,
            color: color
        });
    }

    // Çarpışma / Game Over patlaması
    emitExplosion(x, y) {
        const count = 40;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 6;
            this.particles.push({
                type: 'debris',
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 6 + 3,
                alpha: 1.0,
                decay: 0.02 + Math.random() * 0.02,
                color: ['#ff3d00', '#ff9100', '#ffd600', '#ffffff', '#212121'][Math.floor(Math.random() * 5)]
            });
        }
    }

    update(width, height) {
        // Efekt parçacıklarını güncelle
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;

            if (p.type === 'feather') {
                p.rotation += p.rotSpeed;
                p.vy += 0.02; // Hafif yerçekimi
            } else if (p.type === 'smoke') {
                p.size += 0.3; // Duman genişler
            } else if (p.type === 'flame') {
                p.size *= 0.95;
            }

            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Atmosfer/Hava parçacıklarını güncelle
        for (let p of this.weatherParticles) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < -10) p.x = width + 10;
            if (p.x > width + 10) p.x = -10;
            if (p.y > height + 10) p.y = -10;
            if (p.y < -10) p.y = height + 10;
        }
    }

    draw(ctx) {
        // 1. Arka plan hava parçacıkları
        ctx.save();
        for (let p of this.weatherParticles) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // 2. Aksiyon ve itki parçacıkları
        ctx.save();
        for (let p of this.particles) {
            ctx.globalAlpha = Math.max(0, p.alpha);
            if (p.type === 'feather') {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.ellipse(0, 0, p.size, p.size * 0.35, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (p.type === 'text') {
                ctx.fillStyle = p.color;
                ctx.font = `bold ${p.size}px Arial`;
                ctx.textAlign = 'center';
                ctx.shadowBlur = 4;
                ctx.shadowColor = '#000000';
                ctx.fillText(p.text, p.x, p.y);
            } else {
                ctx.fillStyle = p.color;
                ctx.shadowBlur = (p.type === 'flame' || p.type === 'ring_spark' || p.type === 'drone_glow') ? 8 : 0;
                ctx.shadowColor = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    reset() {
        this.particles = [];
    }
}

window.particleEngine = new ParticleEngine();
