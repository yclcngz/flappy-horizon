/**
 * Flappy Horizon - Akıllı Pik Analizli & Karaktere Özel Ses Motoru
 * - Karakter bazlı özelleştirilmiş iniş / süzülme (descent) sesleri
 * - Karaktere özel çarpışma / patlama / game over sesleri
 * - Milisaniye hassasiyetinde 1s / 0.85s / 0.90s zıplama motoru
 */

class SoundSystem {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.bgmMuted = false;
        this.sfxMuted = false;
        this.bgmVolume = 0.16; // Arka plan müzik seviyesi
        this.sfxVolume = 0.80; // Efekt ses seviyesi

        // BGM Durumu
        this.isBgmPlaying = false;
        this.bgmTimer = null;
        this.bgmStep = 0;

        // Gürültü (Noise) arabelleği
        this.noiseBuffer = null;

        // Özel Ses Dosyası Yolları (ses/ klasörü)
        this.soundFiles = {
            drone: 'ses/drone.m4a',
            kartal: 'ses/kartal.mp3',
            roket: 'ses/roket.mp3',
            fuze: 'ses/fuze.mp3'
        };

        // Kod çözülmüş (Decoded) Web Audio Arabellekleri
        this.audioBuffers = {
            drone: null,
            kartal: null,
            roket: null,
            fuze: null
        };

        // En yüksek sesli (Peak) başlangıç noktaları
        this.peakOffsets = {
            drone: 0.40,
            kartal: 1.65,
            roket: 0.85,
            fuze: 0.35
        };

        // HTML5 Audio Yedekleri
        this.audioElements = {
            drone: null,
            kartal: null,
            roket: null,
            fuze: null
        };

        this.initAudioElements();
        this.initOnUserGesture();
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
                this.createNoiseBuffer();
                this.preloadAllSoundBuffers();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    initOnUserGesture() {
        const unlock = () => {
            this.init();
            if (!this.isBgmPlaying && !this.bgmMuted && !this.muted) {
                this.startBGM();
            }
            window.removeEventListener('click', unlock);
            window.removeEventListener('keydown', unlock);
            window.removeEventListener('touchstart', unlock);
        };
        window.addEventListener('click', unlock);
        window.addEventListener('keydown', unlock);
        window.addEventListener('touchstart', unlock);
    }

    initAudioElements() {
        for (let key in this.soundFiles) {
            try {
                const audio = new Audio(this.soundFiles[key]);
                audio.preload = 'auto';
                audio.volume = this.sfxVolume;
                this.audioElements[key] = audio;
            } catch (e) {
                console.warn('Audio elementi oluşturulamadı:', key, e);
            }
        }
    }

    async preloadAllSoundBuffers() {
        for (let key in this.soundFiles) {
            this.loadSoundBuffer(key, this.soundFiles[key]);
        }
    }

    async loadSoundBuffer(key, url) {
        if (!this.ctx) return;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            const decodedBuffer = await this.ctx.decodeAudioData(arrayBuffer);
            this.audioBuffers[key] = decodedBuffer;
            console.log(`✓ Ses yüklendi: ${key} (${url})`);
        } catch (e) {
            console.info(`Özel ses (${key}) Web Audio ile çözülemedi:`, e.message);
        }
    }

    createNoiseBuffer() {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 2;
        this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) {
            this.stopBGM();
        } else {
            this.startBGM();
        }
        return this.muted;
    }

    toggleBGM() {
        this.bgmMuted = !this.bgmMuted;
        if (this.bgmMuted) {
            this.stopBGM();
        } else {
            this.startBGM();
        }
        return this.bgmMuted;
    }

    // =========================================================================
    // 🔊 DOĞAL & ZAMAN AYARLI ÖZEL SES OYNATICI
    // =========================================================================
    playSnippet(key, options = {}, synthFallbackFn = null) {
        if (this.muted || this.sfxMuted) return;
        this.init();

        const duration = options.duration || 1.0;
        const defaultOffset = this.peakOffsets[key] || 0.0;
        const offset = options.offset !== undefined ? options.offset : defaultOffset;
        const fadeTime = options.fadeTime || 0.20;
        const playbackRate = options.playbackRate || 1.0;
        const volumeScale = options.volumeScale || 1.0;

        if (this.ctx && this.audioBuffers[key]) {
            try {
                const now = this.ctx.currentTime;
                const source = this.ctx.createBufferSource();
                source.buffer = this.audioBuffers[key];
                source.playbackRate.setValueAtTime(playbackRate, now);

                const gainNode = this.ctx.createGain();
                const targetVol = this.sfxVolume * volumeScale;

                gainNode.gain.setValueAtTime(targetVol, now);
                gainNode.gain.setValueAtTime(targetVol, now + Math.max(0, duration - fadeTime));
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

                source.connect(gainNode);
                gainNode.connect(this.ctx.destination);

                const maxOffset = Math.max(0, this.audioBuffers[key].duration - 0.2);
                const safeOffset = Math.min(offset, maxOffset);

                source.start(now, safeOffset, duration);
                return;
            } catch (err) {
                console.warn('Buffer oynatma hatası:', err);
            }
        }

        if (this.audioElements[key]) {
            try {
                const clone = this.audioElements[key].cloneNode();
                clone.volume = Math.min(1.0, this.sfxVolume * volumeScale);
                clone.currentTime = offset;
                const playPromise = clone.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        setTimeout(() => {
                            try { clone.pause(); clone.remove(); } catch (e) {}
                        }, duration * 1000);
                    }).catch(() => {
                        if (synthFallbackFn) synthFallbackFn.call(this);
                    });
                }
                return;
            } catch (err) {
                console.warn('HTML5 Audio hatası:', err);
            }
        }

        if (synthFallbackFn) {
            synthFallbackFn.call(this);
        }
    }

    // =========================================================================
    // 🛸 1. DRONE SESLERİ (0.90s İtiş & İniş & Çarpışma)
    // =========================================================================
    playDroneSound() {
        this.playSnippet('drone', {
            offset: 0.40,
            duration: 0.90,
            fadeTime: 0.18,
            playbackRate: 1.0,
            volumeScale: 1.8
        }, () => {
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(480, now + 0.15);
            osc.frequency.exponentialRampToValueAtTime(260, now + 0.6);
            gain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.6);
        });
    }

    // Drone Aşağı İniş Süzülme Vızıltısı
    playDroneDescent() {
        if (this.muted || this.sfxMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(340, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.45);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, now);

        gain.gain.setValueAtTime(0.12 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
    }

    // Drone Çarpışma / Parçalanma & Elektrik Kıvılcımı
    playDroneCrash() {
        if (this.muted || this.sfxMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // 1. Metal & Pervane Kırılma Darbesi
        const hitOsc = this.ctx.createOscillator();
        const hitGain = this.ctx.createGain();
        hitOsc.type = 'sawtooth';
        hitOsc.frequency.setValueAtTime(520, now);
        hitOsc.frequency.exponentialRampToValueAtTime(60, now + 0.25);
        hitGain.gain.setValueAtTime(0.55 * this.sfxVolume, now);
        hitGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        hitOsc.connect(hitGain);
        hitGain.connect(this.ctx.destination);
        hitOsc.start(now);
        hitOsc.stop(now + 0.25);

        // 2. Kısa Devre & Elektrik Kıvılcım Cızırtısı (Electric Spark Zap)
        if (this.noiseBuffer) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(2800, now);
            filter.Q.setValueAtTime(6.0, now);
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.4 * this.sfxVolume, now + 0.05);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noise.start(now + 0.05);
            noise.stop(now + 0.4);
        }
    }

    // =========================================================================
    // 🦅 2. KARTAL SESLERİ (1.0s Çırpma & Rüzgar İnişi & Acı Çığlık)
    // =========================================================================
    playEagleSound() {
        this.playSnippet('kartal', {
            offset: 1.65,
            duration: 1.0,
            fadeTime: 0.25,
            playbackRate: 1.0,
            volumeScale: 1.6
        }, () => {
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const duration = 0.8;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(2600, now);
            osc.frequency.exponentialRampToValueAtTime(1600, now + duration);
            gain.gain.setValueAtTime(0.4 * this.sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + duration);
        });
    }

    // Kartal Aşağı İniş / Süzülme Rüzgarı (Feather Wind Glide)
    playEagleDescent() {
        if (this.muted || this.sfxMuted) return;
        this.init();
        if (!this.ctx || !this.noiseBuffer) return;

        const now = this.ctx.currentTime;
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(450, now);
        filter.frequency.exponentialRampToValueAtTime(180, now + 0.4);
        filter.Q.setValueAtTime(2.0, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.20 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(now);
        noise.stop(now + 0.4);
    }

    // Kartal Çarpışma / Acı Çığlık & Darbe
    playEagleCrash() {
        if (this.muted || this.sfxMuted) return;
        this.init();

        // 1. Kartalın en yüksek çığlığının tiz ve acı kısmı
        this.playSnippet('kartal', {
            offset: 1.70,
            duration: 0.75,
            fadeTime: 0.20,
            playbackRate: 1.25, // Daha tiz ve acı bir çığlık
            volumeScale: 1.8
        });

        // 2. Fiziksel Çarpma & Kanat Dağılma Sesi
        if (this.ctx) {
            const now = this.ctx.currentTime;
            const thud = this.ctx.createOscillator();
            const thudGain = this.ctx.createGain();
            thud.type = 'triangle';
            thud.frequency.setValueAtTime(140, now);
            thud.frequency.exponentialRampToValueAtTime(35, now + 0.25);
            thudGain.gain.setValueAtTime(0.45 * this.sfxVolume, now);
            thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            thud.connect(thudGain);
            thudGain.connect(this.ctx.destination);
            thud.start(now);
            thud.stop(now + 0.25);
        }
    }

    // =========================================================================
    // 🚀 3. ROKET SESLERİ (0.85s İtiş & Dalış Uğultusu & Devasa Patlama)
    // =========================================================================
    playRocketSound() {
        this.playSnippet('roket', {
            offset: 0.85,
            duration: 0.85,
            fadeTime: 0.18,
            playbackRate: 1.0,
            volumeScale: 1.3
        });
    }

    // Roket Aşağı İniş Atmosferik Uğultusu
    playRocketDescent() {
        if (this.muted || this.sfxMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.45);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(220, now);

        gain.gain.setValueAtTime(0.18 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
    }

    // Roket Çarpışma / Devasa Yakıt Tankı Patlaması (Heavy Blast)
    playRocketCrash() {
        if (this.muted || this.sfxMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // 1. Devasa Sub-bass Şok Dalgası
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(120, now);
        subOsc.frequency.exponentialRampToValueAtTime(25, now + 0.5);
        subGain.gain.setValueAtTime(0.8 * this.sfxVolume, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        subOsc.connect(subGain);
        subGain.connect(this.ctx.destination);
        subOsc.start(now);
        subOsc.stop(now + 0.5);

        // 2. Alevli Patlama Gürültüsü
        if (this.noiseBuffer) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, now);
            filter.frequency.exponentialRampToValueAtTime(90, now + 0.6);
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.7 * this.sfxVolume, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noise.start(now);
            noise.stop(now + 0.6);
        }
    }

    // =========================================================================
    // 🎯 4. FÜZE SESLERİ (0.85s İtiş & Dalış Islığı & Harp Başlığı Patlaması)
    // =========================================================================
    playMissileSound() {
        this.playSnippet('fuze', {
            offset: 0.35,
            duration: 0.85,
            fadeTime: 0.18,
            playbackRate: 1.0,
            volumeScale: 1.2
        });
    }

    // Füze Aşağı İniş Sesüstü Hava Yarıcı Islık (Whistle Dive)
    playMissileDescent() {
        if (this.muted || this.sfxMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1100, now);
        osc.frequency.exponentialRampToValueAtTime(450, now + 0.38);

        gain.gain.setValueAtTime(0.14 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.38);
    }

    // Füze Çarpışma / Keskin Harp Başlığı Patlaması & Şarapnel
    playMissileCrash() {
        if (this.muted || this.sfxMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // 1. Keskin Patlama Şoku
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);
        gain.gain.setValueAtTime(0.75 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);

        // 2. Şarapnel & Metalik Rezonans
        if (this.noiseBuffer) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1600, now);
            filter.frequency.exponentialRampToValueAtTime(250, now + 0.45);
            filter.Q.setValueAtTime(4.0, now);
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.6 * this.sfxVolume, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noise.start(now);
            noise.stop(now + 0.45);
        }
    }

    // =========================================================================
    // 🎮 GENEL KONTROL KÖPRÜLERİ (Zıplama, İniş ve Çarpışma Yönlendiricileri)
    // =========================================================================
    playJump(charType = 'drone') {
        if (charType === 'drone') {
            this.playDroneSound();
        } else if (charType === 'kartal') {
            this.playEagleSound();
        } else if (charType === 'roket') {
            this.playRocketSound();
        } else if (charType === 'fuze') {
            this.playMissileSound();
        }
    }

    playDescent(charType = 'drone') {
        if (charType === 'drone') {
            this.playDroneDescent();
        } else if (charType === 'kartal') {
            this.playEagleDescent();
        } else if (charType === 'roket') {
            this.playRocketDescent();
        } else if (charType === 'fuze') {
            this.playMissileDescent();
        }
    }

    playCharacterCrash(charType = 'drone') {
        if (charType === 'drone') {
            this.playDroneCrash();
        } else if (charType === 'kartal') {
            this.playEagleCrash();
        } else if (charType === 'roket') {
            this.playRocketCrash();
        } else if (charType === 'fuze') {
            this.playMissileCrash();
        }
    }

    // =========================================================================
    // 🔔 5. SKOR, HALKA, GAME OVER & BUTON SESLERİ
    // =========================================================================
    playScore() {
        if (this.muted || this.sfxMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1174.66, now + 0.06);
        gain.gain.setValueAtTime(0.25 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
    }

    playRing() {
        if (this.muted || this.sfxMuted) return;
        this.init();
        if (!this.ctx) return;

        const notes = [587.33, 739.99, 880.00, 1174.66];
        notes.forEach((freq, idx) => {
            const time = this.ctx.currentTime + idx * 0.045;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);
            gain.gain.setValueAtTime(0.20 * this.sfxVolume, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(time);
            osc.stop(time + 0.22);
        });
    }

    playGameOver() {
        if (this.muted || this.sfxMuted) return;
        this.init();
        if (!this.ctx) return;

        const notes = [329.63, 311.13, 293.66, 277.18];
        notes.forEach((freq, idx) => {
            const time = this.ctx.currentTime + idx * 0.13;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);
            gain.gain.setValueAtTime(0.30 * this.sfxVolume, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(time);
            osc.stop(time + 0.22);
        });
    }

    playClick() {
        if (this.muted || this.sfxMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.exponentialRampToValueAtTime(950, now + 0.04);

        gain.gain.setValueAtTime(0.12 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
    }

    // =========================================================================
    // 🎶 6. PROSEDÜREL RİTMİK ARKA PLAN MÜZİĞİ (SYNTHWAVE ARCADE BGM)
    // =========================================================================
    startBGM() {
        if (this.muted || this.bgmMuted || this.isBgmPlaying) return;
        this.init();
        if (!this.ctx) return;

        this.isBgmPlaying = true;
        this.bgmStep = 0;

        const stepIntervalMs = 115; // 130 BPM Tempo

        const chordProgressions = [
            { bass: 110.0, arps: [220, 261.63, 329.63, 440, 523.25, 659.25, 523.25, 440] },
            { bass: 87.31, arps: [174.61, 220, 261.63, 349.23, 440, 523.25, 440, 349.23] },
            { bass: 130.81, arps: [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 659.25, 523.25] },
            { bass: 98.00, arps: [196.00, 246.94, 293.66, 392.00, 493.88, 587.33, 493.88, 392.00] }
        ];

        this.bgmTimer = setInterval(() => {
            if (!this.isBgmPlaying || this.muted || this.bgmMuted) return;

            const now = this.ctx.currentTime;
            const barIndex = Math.floor((this.bgmStep % 32) / 8);
            const subStep = this.bgmStep % 8;
            const prog = chordProgressions[barIndex];

            // 1. Synth Bassline
            if (subStep % 2 === 0) {
                const bassOsc = this.ctx.createOscillator();
                const bassGain = this.ctx.createGain();
                bassOsc.type = 'sawtooth';
                bassOsc.frequency.setValueAtTime(prog.bass / 2, now);
                bassGain.gain.setValueAtTime(0.12 * this.bgmVolume, now);
                bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(320, now);

                bassOsc.connect(filter);
                filter.connect(bassGain);
                bassGain.connect(this.ctx.destination);
                bassOsc.start(now);
                bassOsc.stop(now + 0.18);
            }

            // 2. Synth Arpeggio
            const arpFreq = prog.arps[subStep];
            const arpOsc = this.ctx.createOscillator();
            const arpGain = this.ctx.createGain();
            arpOsc.type = 'triangle';
            arpOsc.frequency.setValueAtTime(arpFreq, now);
            arpGain.gain.setValueAtTime(0.06 * this.bgmVolume, now);
            arpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.10);

            arpOsc.connect(arpGain);
            arpGain.connect(this.ctx.destination);
            arpOsc.start(now);
            arpOsc.stop(now + 0.10);

            // 3. Elektronik Davul (Kick & Hi-hat)
            if (subStep === 0 || subStep === 4) {
                const kickOsc = this.ctx.createOscillator();
                const kickGain = this.ctx.createGain();
                kickOsc.frequency.setValueAtTime(120, now);
                kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.08);
                kickGain.gain.setValueAtTime(0.15 * this.bgmVolume, now);
                kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

                kickOsc.connect(kickGain);
                kickGain.connect(this.ctx.destination);
                kickOsc.start(now);
                kickOsc.stop(now + 0.08);
            } else if (subStep % 2 === 1 && this.noiseBuffer) {
                const hh = this.ctx.createBufferSource();
                hh.buffer = this.noiseBuffer;
                const hhFilter = this.ctx.createBiquadFilter();
                hhFilter.type = 'highpass';
                hhFilter.frequency.setValueAtTime(6000, now);
                const hhGain = this.ctx.createGain();
                hhGain.gain.setValueAtTime(0.04 * this.bgmVolume, now);
                hhGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

                hh.connect(hhFilter);
                hhFilter.connect(hhGain);
                hhGain.connect(this.ctx.destination);
                hh.start(now);
                hh.stop(now + 0.04);
            }

            this.bgmStep++;
        }, stepIntervalMs);
    }

    stopBGM() {
        this.isBgmPlaying = false;
        if (this.bgmTimer) {
            clearInterval(this.bgmTimer);
            this.bgmTimer = null;
        }
    }
}

window.soundSystem = new SoundSystem();
