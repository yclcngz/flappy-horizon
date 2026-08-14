/**
 * Flappy Horizon - Profesyonel Web Audio & Özel Dosya Ses Motoru
 * Özel ses dosyaları (ses/drone.m4a, ses/kartal.mp3, ses/roket.mp3, ses/fuze.mp3)
 * ile sıfır gecikmeli Web Audio API arabelleği ve yedek sentezleyici sistemi.
 */

class SoundSystem {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.bgmMuted = false;
        this.sfxMuted = false;
        this.bgmVolume = 0.18; // Arka plan müzik seviyesi
        this.sfxVolume = 0.65; // Efekt ses seviyesi

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

        // HTML5 Audio Yedekleri (Local file:// veya fetch hatası durumunda)
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

    // HTML5 Audio ön yükleme (Yedek olarak hazırda tutulur)
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

    // Sıfır gecikmeli Web Audio API ArrayBuffer yüklemesi
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
            console.log(`✓ Özel ses yüklendi: ${key} (${url})`);
        } catch (e) {
            // fetch/decode başarısız olursa HTML5 Audio veya sentezleyici çalışacaktır
            console.info(`Özel ses dosyası (${key}) Web Audio ile çözülemedi, HTML5 Audio / Synth modu aktif:`, e.message);
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
    // 🎵 ÖZEL SES DOSYASINI OYNATICI (Web Audio Buffer -> HTML5 Audio -> Synth)
    // =========================================================================
    playCustomSound(key, synthFallbackFn = null) {
        if (this.muted || this.sfxMuted) return;
        this.init();

        // 1. Öncelik: Web Audio API Buffer (En hızlı, 0 gecikmeli, sınırsız polifoni)
        if (this.ctx && this.audioBuffers[key]) {
            try {
                const source = this.ctx.createBufferSource();
                source.buffer = this.audioBuffers[key];

                const gainNode = this.ctx.createGain();
                gainNode.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);

                source.connect(gainNode);
                gainNode.connect(this.ctx.destination);
                source.start(0);
                return;
            } catch (err) {
                console.warn('Buffer oynatma hatası:', err);
            }
        }

        // 2. Öncelik: HTML5 Audio Klonu
        if (this.audioElements[key]) {
            try {
                const clone = this.audioElements[key].cloneNode();
                clone.volume = this.sfxVolume;
                const playPromise = clone.play();
                if (playPromise !== undefined) {
                    playPromise.catch(() => {
                        if (synthFallbackFn) synthFallbackFn.call(this);
                    });
                }
                return;
            } catch (err) {
                console.warn('HTML5 Audio oynatma hatası:', err);
            }
        }

        // 3. Öncelik: Prosedürel Sentezleyici
        if (synthFallbackFn) {
            synthFallbackFn.call(this);
        }
    }

    // =========================================================================
    // 🛸 1. DRONE SESİ (ses/drone.m4a + Synth)
    // =========================================================================
    playDroneSound() {
        this.playCustomSound('drone', () => {
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(320, now);
            osc1.frequency.exponentialRampToValueAtTime(680, now + 0.08);
            osc1.frequency.exponentialRampToValueAtTime(420, now + 0.18);

            osc2.type = 'square';
            osc2.frequency.setValueAtTime(160, now);
            osc2.frequency.exponentialRampToValueAtTime(340, now + 0.08);
            osc2.frequency.exponentialRampToValueAtTime(210, now + 0.18);

            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(800, now);
            filter.Q.setValueAtTime(3.0, now);

            gain.gain.setValueAtTime(0.25 * this.sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

            osc1.connect(filter);
            osc2.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.18);
            osc2.stop(now + 0.18);
        });
    }

    // =========================================================================
    // 🦅 2. KARTAL SESİ (ses/kartal.mp3 + Synth)
    // =========================================================================
    playEagleSound() {
        this.playCustomSound('kartal', () => {
            if (!this.ctx) return;
            const now = this.ctx.currentTime;

            // Kanat rüzgarı
            if (this.noiseBuffer) {
                const noise = this.ctx.createBufferSource();
                noise.buffer = this.noiseBuffer;

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(300, now);
                filter.frequency.exponentialRampToValueAtTime(800, now + 0.06);
                filter.frequency.exponentialRampToValueAtTime(150, now + 0.22);

                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.45 * this.sfxVolume, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);

                noise.start(now);
                noise.stop(now + 0.22);
            }

            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(130, now);
            osc.frequency.exponentialRampToValueAtTime(260, now + 0.05);
            osc.frequency.exponentialRampToValueAtTime(90, now + 0.18);

            oscGain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

            osc.connect(oscGain);
            oscGain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.18);
        });
    }

    // 🦅 Periyodik Kartal Çığlığı
    playEagleScreech() {
        this.playCustomSound('kartal', () => {
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const duration = 0.85;

            const modOsc = this.ctx.createOscillator();
            const modGain = this.ctx.createGain();
            modOsc.type = 'sine';
            modOsc.frequency.setValueAtTime(32, now);
            modGain.gain.setValueAtTime(160, now);

            const carrierOsc = this.ctx.createOscillator();
            carrierOsc.type = 'sawtooth';
            carrierOsc.frequency.setValueAtTime(2600, now);
            carrierOsc.frequency.linearRampToValueAtTime(3100, now + 0.12);
            carrierOsc.frequency.exponentialRampToValueAtTime(1650, now + duration);

            modOsc.connect(carrierOsc.frequency);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(2400, now);
            filter.frequency.exponentialRampToValueAtTime(1800, now + duration);
            filter.Q.setValueAtTime(4.5, now);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.35 * this.sfxVolume, now + 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            carrierOsc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            modOsc.start(now);
            carrierOsc.start(now);
            modOsc.stop(now + duration);
            carrierOsc.stop(now + duration);
        });
    }

    // =========================================================================
    // 🚀 3. ROKET SESİ (ses/roket.mp3 + Synth)
    // =========================================================================
    playRocketSound() {
        this.playCustomSound('roket', () => {
            if (!this.ctx) return;
            const now = this.ctx.currentTime;

            if (this.noiseBuffer) {
                const noise = this.ctx.createBufferSource();
                noise.buffer = this.noiseBuffer;

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(650, now);
                filter.frequency.exponentialRampToValueAtTime(220, now + 0.25);

                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.55 * this.sfxVolume, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);

                noise.start(now);
                noise.stop(now + 0.25);
            }

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(90, now);
            osc.frequency.exponentialRampToValueAtTime(45, now + 0.24);

            gain.gain.setValueAtTime(0.35 * this.sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.24);
        });
    }

    // =========================================================================
    // 🎯 4. FÜZE SESİ (ses/fuze.mp3 + Synth)
    // =========================================================================
    playMissileSound() {
        this.playCustomSound('fuze', () => {
            if (!this.ctx) return;
            const now = this.ctx.currentTime;

            if (this.noiseBuffer) {
                const noise = this.ctx.createBufferSource();
                noise.buffer = this.noiseBuffer;

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(1400, now);
                filter.frequency.exponentialRampToValueAtTime(400, now + 0.20);
                filter.Q.setValueAtTime(5.0, now);

                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.5 * this.sfxVolume, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);

                noise.start(now);
                noise.stop(now + 0.20);
            }

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(560, now + 0.08);
            osc.frequency.exponentialRampToValueAtTime(240, now + 0.20);

            gain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.20);
        });
    }

    // Karakter seçimine göre zıplama sesi
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

    // =========================================================================
    // 🔔 5. SKOR, HALKA, ÇARPIŞMA, GAME OVER & BUTON SESLERİ
    // =========================================================================
    playScore() {
        if (this.muted || this.sfxMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.setValueAtTime(1174.66, now + 0.06); // D6
        gain.gain.setValueAtTime(0.22 * this.sfxVolume, now);
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

        const notes = [587.33, 739.99, 880.00, 1174.66]; // D5, F#5, A5, D6
        notes.forEach((freq, idx) => {
            const time = this.ctx.currentTime + idx * 0.045;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);
            gain.gain.setValueAtTime(0.18 * this.sfxVolume, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(time);
            osc.stop(time + 0.22);
        });
    }

    playHit() {
        if (this.muted || this.sfxMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);

        gain.gain.setValueAtTime(0.4 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
    }

    playGameOver() {
        if (this.muted || this.sfxMuted) return;
        this.init();
        if (!this.ctx) return;

        const notes = [329.63, 311.13, 293.66, 277.18]; // E4, Eb4, D4, C#4
        notes.forEach((freq, idx) => {
            const time = this.ctx.currentTime + idx * 0.13;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);
            gain.gain.setValueAtTime(0.25 * this.sfxVolume, time);
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

        gain.gain.setValueAtTime(0.1 * this.sfxVolume, now);
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
            { bass: 110.0, arps: [220, 261.63, 329.63, 440, 523.25, 659.25, 523.25, 440] }, // Am
            { bass: 87.31, arps: [174.61, 220, 261.63, 349.23, 440, 523.25, 440, 349.23] }, // F
            { bass: 130.81, arps: [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 659.25, 523.25] }, // C
            { bass: 98.00, arps: [196.00, 246.94, 293.66, 392.00, 493.88, 587.33, 493.88, 392.00] } // G
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
