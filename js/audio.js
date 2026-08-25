/**
 * Flappy Horizon - Akıllı Pik Analizli & Karaktere Özel Ses Motoru
 * - Her karaktere özel net ve duyulabilir iniş/süzülme (descent) sesleri
 * - Her karaktere özel güçlü çarpışma/patlama/yanma sesleri
 * - Milisaniye hassasiyetinde 1s / 0.85s / 0.90s zıplama motoru
 */

class SoundSystem {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.bgmMuted = false;
        this.sfxMuted = false;
        this.bgmVolume = 0.15; // Arka plan müzik seviyesi
        this.sfxVolume = 0.85; // Efekt ses seviyesi (net ve güçlü)

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

        let played = false;

        // 1. Web Audio API Buffer
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
                played = true;
                return;
            } catch (err) {
                console.warn('Buffer oynatma hatası:', err);
            }
        }

        // 2. HTML5 Audio
        if (!played && this.audioElements[key]) {
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
                played = true;
                return;
            } catch (err) {
                console.warn('HTML5 Audio hatası:', err);
            }
        }

        // 3. Prosedürel Sentezleyici
        if (!played && synthFallbackFn) {
            synthFallbackFn.call(this);
        }
    }

    // =========================================================================
    // 🛸 1. DRONE SESLERİ (0.90s Zıplama & İniş Vızıltısı & Kaza/Kıvılcım)
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
            gain.gain.setValueAtTime(0.35 * this.sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.6);
        });
    }

    // Drone Aşağı İniş Süzülme Vızıltısı (Duyulabilir Netlikte)
    playDroneDescent() {
        if (this.muted || this.sfxMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.45);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(600, now);
        filter.Q.setValueAtTime(2.5, now);

        // Ses seviyesini artırdık
        gain.gain.setValueAtTime(0.80 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
    }

    // Drone Çarpışma: Metal Kırılması + Elektrik Kıvılcımı
    playDroneCrash() {
        if (this.muted || this.sfxMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // 1. Metal Darbe Kırılması
        const hitOsc = this.ctx.createOscillator();
        const hitGain = this.ctx.createGain();
        hitOsc.type = 'sawtooth';
        hitOsc.frequency.setValueAtTime(400, now);
        hitOsc.frequency.exponentialRampToValueAtTime(40, now + 0.4);
        // Çarpışma sesini daha gürültülü yaptık
        hitGain.gain.setValueAtTime(1.2 * this.sfxVolume, now);
        hitGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        hitOsc.connect(hitGain);
        hitGain.connect(this.ctx.destination);
        hitOsc.start(now);
        hitOsc.stop(now + 0.4);

        // 2. Elektrik Kıvılcımı (Noise)
        if (!this.noiseBuffer) this.createNoiseBuffer();
        if (this.noiseBuffer) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;
            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'highpass';
            noiseFilter.frequency.setValueAtTime(1000, now);
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.8 * this.sfxVolume, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noise.start(now);
            noise.stop(now + 0.3);
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
            gain.gain.setValueAtTime(0.45 * this.sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + duration);
        });
    }

    // Kartal Aşağı İniş / Süzülme Rüzgarı (Duyulabilir Aerodinamik Hışırtı)
    playEagleDescent() {
        if (this.muted || this.sfxMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        if (!this.noiseBuffer) this.createNoiseBuffer();

        if (this.noiseBuffer) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(650, now);
            filter.frequency.exponentialRampToValueAtTime(220, now + 0.35);
            filter.Q.setValueAtTime(2.0, now);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.40 * this.sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start(now);
            noise.stop(now + 0.35);
        }
    }

    // Kartal Çarpışma: Tiz ve Acı Çığlık + Kanat Darbesi
    playEagleCrash() {
        if (this.muted || this.sfxMuted) return;
        this.init();

        // 1. Tiz Kartal Acı Çığlığı (Dosyadan veya Sentezden)
        this.playSnippet('kartal', {
            offset: 1.70,
            duration: 0.85,
            fadeTime: 0.20,
            playbackRate: 1.35, // Tiz acı çığlık
            volumeScale: 1.9
        }, () => {
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(3200, now);
            osc.frequency.exponentialRampToValueAtTime(1400, now + 0.5);
            gain.gain.setValueAtTime(0.65 * this.sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.5);
        });

        // 2. Darbe Sesi
        if (this.ctx) {
            const now = this.ctx.currentTime;
            const thud = this.ctx.createOscillator();
            const thudGain = this.ctx.createGain();
            thud.type = 'triangle';
            thud.frequency.setValueAtTime(160, now);
            thud.frequency.exponentialRampToValueAtTime(30, now + 0.3);
            thudGain.gain.setValueAtTime(0.6 * this.sfxVolume, now);
            thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            thud.connect(thudGain);
            thudGain.connect(this.ctx.destination);
            thud.start(now);
            thud.stop(now + 0.3);
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

    // Roket Aşağı İniş Atmosferik Dalış Uğultusu
    playRocketDescent() {
        if (this.muted || this.sfxMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(65, now + 0.4);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, now);

        gain.gain.setValueAtTime(0.35 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
    }

    // Roket Çarpışma: Devasa Yakıt Tankı İnfilakı (Heavy Explosion)
    playRocketCrash() {
        if (this.muted || this.sfxMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // 1. Derin Sub-bass Şok Patlaması
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(140, now);
        subOsc.frequency.exponentialRampToValueAtTime(20, now + 0.6);
        subGain.gain.setValueAtTime(0.9 * this.sfxVolume, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        subOsc.connect(subGain);
        subGain.connect(this.ctx.destination);
        subOsc.start(now);
        subOsc.stop(now + 0.6);

        // 2. Alevli Patlama Yanma Gürültüsü
        if (!this.noiseBuffer) this.createNoiseBuffer();
        if (this.noiseBuffer) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(950, now);
            filter.frequency.exponentialRampToValueAtTime(80, now + 0.7);
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.85 * this.sfxVolume, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noise.start(now);
            noise.stop(now + 0.7);
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
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.35);

        gain.gain.setValueAtTime(0.35 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
    }

    // Füze Çarpışma: Harp Başlığı İnfilakı & Metalik Şarapnel
    playMissileCrash() {
        if (this.muted || this.sfxMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // 1. Keskin Patlama Şoku
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.4);
        gain.gain.setValueAtTime(0.85 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);

        // 2. Şarapnel & Metal Yankısı
        if (!this.noiseBuffer) this.createNoiseBuffer();
        if (this.noiseBuffer) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1800, now);
            filter.frequency.exponentialRampToValueAtTime(200, now + 0.5);
            filter.Q.setValueAtTime(4.0, now);
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.75 * this.sfxVolume, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noise.start(now);
            noise.stop(now + 0.5);
        }
    }

    // =========================================================================
    // 🎮 KONTROL KÖPRÜLERİ
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
    // 🔔 SKOR, HALKA, GAME OVER & BUTON SESLERİ
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

    playPowerUp() {
        if (this.muted || this.sfxMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Çılgın ve havalı bir güçlenme sesi (sweep-up)
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(300, now);
        osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.3);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(150, now);
        osc2.frequency.exponentialRampToValueAtTime(600, now + 0.3);

        gain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.3);
        osc2.stop(now + 0.3);
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
        try {
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
        } catch (e) {
            // Ses hatası oyunu durdurmasın
        }
    }

    // =========================================================================
    // 🎶 RİTMİK ARKA PLAN MÜZİĞİ (SYNTHWAVE ARCADE BGM)
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

    // Zafer Müziği (Victory Fanfare)
    playVictory() {
        if (this.muted || this.sfxMuted) return;
        this.init();
        if (!this.ctx) return;

        this.stopBGM();

        const notes = [
            { freq: 523.25, time: 0.0 },
            { freq: 659.25, time: 0.12 },
            { freq: 783.99, time: 0.24 },
            { freq: 1046.50, time: 0.40 },
            { freq: 783.99, time: 0.56 },
            { freq: 1046.50, time: 0.68 },
            { freq: 1318.51, time: 0.84 },
        ];

        notes.forEach((note, idx) => {
            const startTime = this.ctx.currentTime + note.time;
            const isLast = idx === notes.length - 1;
            const dur = isLast ? 1.2 : 0.18;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = isLast ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(note.freq, startTime);

            const vol = isLast ? 0.4 : 0.25;
            gain.gain.setValueAtTime(vol * this.sfxVolume, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + dur);
        });

        if (this.noiseBuffer) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(8000, this.ctx.currentTime);
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.06 * this.sfxVolume, this.ctx.currentTime);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.0);
            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noise.start(this.ctx.currentTime);
            noise.stop(this.ctx.currentTime + 2.0);
        }
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
