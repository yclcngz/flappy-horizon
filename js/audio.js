/**
 * Flappy Horizon - Profesyonel Web Audio API Ses & Müzik Motoru
 * Her karaktere özel gerçekçi ses efektleri, kartal çığlığı, drone motoru, roket itişi
 * ve arka planda çalan prosedürel ritmik Synthwave arcade müziği.
 */

class SoundSystem {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.bgmMuted = false;
        this.sfxMuted = false;
        this.bgmVolume = 0.18; // Arka plan müzik ses seviyesi (oyunu boğmayacak tonda)
        this.sfxVolume = 0.35;

        // BGM Durumu
        this.isBgmPlaying = false;
        this.bgmTimer = null;
        this.bgmStep = 0;

        // Kartal Çığlığı Zamanlayıcısı
        this.lastEagleScreech = 0;

        // Gürültü (Noise) arabelleği
        this.noiseBuffer = null;

        // Harici özel ses dosyaları için opsiyonel slotlar
        this.customSounds = {
            jump_drone: null,
            jump_kartal: null,
            jump_roket: null,
            jump_fuze: null,
            eagle_screech: null,
            bgm: null,
            score: null,
            ring: null,
            hit: null,
            die: null
        };

        this.initOnUserGesture();
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
                this.createNoiseBuffer();
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

    createNoiseBuffer() {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 2; // 2 saniyelik gürültü
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
    // 🛸 1. DRONE PERVANE & FIRÇASIZ MOTOR SESİ
    // =========================================================================
    playDronePropeller() {
        if (this.muted || this.sfxMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // Yüksek devirli fırçasız motor harmonikleri
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

        gain.gain.setValueAtTime(0.18 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.18);
        osc2.stop(now + 0.18);
    }

    // =========================================================================
    // 🦅 2. KARTAL KANAT ÇIRPMA & KARTAL ÇIĞLIĞI
    // =========================================================================
    playEagleFlap() {
        if (this.muted || this.sfxMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // Kanat rüzgarı (Filtrelenmiş derin hava hışırtısı)
        if (this.noiseBuffer) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(300, now);
            filter.frequency.exponentialRampToValueAtTime(800, now + 0.06);
            filter.frequency.exponentialRampToValueAtTime(150, now + 0.22);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.4 * this.sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start(now);
            noise.stop(now + 0.22);
        }

        // Tüy vuruşu alt tonu
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(240, now + 0.05);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);

        oscGain.gain.setValueAtTime(0.25 * this.sfxVolume, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
    }

    // 🦅 Kartal Çığlığı (Majestic Eagle Screech Cry)
    playEagleScreech() {
        if (this.muted || this.sfxMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const duration = 0.85;

        // Modülatör (Hızlı yırtıcı vibrato)
        const modOsc = this.ctx.createOscillator();
        const modGain = this.ctx.createGain();
        modOsc.type = 'sine';
        modOsc.frequency.setValueAtTime(32, now); // 32 Hz vibrato
        modGain.gain.setValueAtTime(160, now);

        // Ana Kartal Çığlık Sinyali (2800 Hz -> 1700 Hz karakteristik frekans düşüşü)
        const carrierOsc = this.ctx.createOscillator();
        carrierOsc.type = 'sawtooth';
        carrierOsc.frequency.setValueAtTime(2600, now);
        carrierOsc.frequency.linearRampToValueAtTime(3100, now + 0.12);
        carrierOsc.frequency.exponentialRampToValueAtTime(1650, now + duration);

        modOsc.connect(carrierOsc.frequency);

        // Formant Filtreleme (Gırtlak ve gaga rezonansı)
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2400, now);
        filter.frequency.exponentialRampToValueAtTime(1800, now + duration);
        filter.Q.setValueAtTime(4.5, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.32 * this.sfxVolume, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        carrierOsc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        modOsc.start(now);
        carrierOsc.start(now);
        modOsc.stop(now + duration);
        carrierOsc.stop(now + duration);
    }

    // =========================================================================
    // 🚀 3. ROKET PLAZMA & İTİŞ PATLAMASI (ROCKET ROAR)
    // =========================================================================
    playRocketBooster() {
        if (this.muted || this.sfxMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // Derin roket alevi yanma gürültüsü
        if (this.noiseBuffer) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(650, now);
            filter.frequency.exponentialRampToValueAtTime(220, now + 0.25);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.5 * this.sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start(now);
            noise.stop(now + 0.25);
        }

        // Sub-bass itiş gümbürtüsü
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
    }

    // =========================================================================
    // 🎯 4. FÜZE SESÜSTÜ ATEŞLEME & JET İTİŞİ (MISSILE IGNITION)
    // =========================================================================
    playMissileIgnition() {
        if (this.muted || this.sfxMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // Keskin süpersonik hava yırtılma sesi
        if (this.noiseBuffer) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1400, now);
            filter.frequency.exponentialRampToValueAtTime(400, now + 0.20);
            filter.Q.setValueAtTime(5.0, now);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.45 * this.sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start(now);
            noise.stop(now + 0.20);
        }

        // Yükselen füze roket tonu
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(560, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(240, now + 0.20);

        gain.gain.setValueAtTime(0.25 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.20);
    }

    // Karakter tipine göre dinamik zıplama yönlendirmesi
    playJump(charType = 'drone') {
        if (charType === 'drone') {
            this.playDronePropeller();
        } else if (charType === 'kartal') {
            this.playEagleFlap();
        } else if (charType === 'roket') {
            this.playRocketBooster();
        } else if (charType === 'fuze') {
            this.playMissileIgnition();
        }
    }

    // =========================================================================
    // 🔔 5. SKOR & HALKA GEÇİŞ SESLERİ
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

        // Parlak Kristal Arp / Halka Zili
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

        // 130 BPM Tempo -> Her 16'lık nota ~115ms
        const stepIntervalMs = 115;

        // Akor Dizisi (Am - F - C - G Synthwave Progression)
        // [BassFreq, ArpFreqs, ChordPads]
        const chordProgressions = [
            // Am
            { bass: 110.0, arps: [220, 261.63, 329.63, 440, 523.25, 659.25, 523.25, 440] },
            // F
            { bass: 87.31, arps: [174.61, 220, 261.63, 349.23, 440, 523.25, 440, 349.23] },
            // C
            { bass: 130.81, arps: [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 659.25, 523.25] },
            // G
            { bass: 98.00, arps: [196.00, 246.94, 293.66, 392.00, 493.88, 587.33, 493.88, 392.00] }
        ];

        this.bgmTimer = setInterval(() => {
            if (!this.isBgmPlaying || this.muted || this.bgmMuted) return;

            const now = this.ctx.currentTime;
            const barIndex = Math.floor((this.bgmStep % 32) / 8);
            const subStep = this.bgmStep % 8;
            const prog = chordProgressions[barIndex];

            // 1. Synth Bassline (Her 2 adımda bir tok bas)
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

            // 2. Synth Arpeggio (Pulsing 16th Lead)
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

            // 3. Elektronik Ritim Davulu (Soft Kick & Hi-hat)
            if (subStep === 0 || subStep === 4) {
                // Kick drum
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
                // Closed Hi-hat
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
