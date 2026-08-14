/**
 * Flappy Horizon - Senkronize & Kırpılmış Web Audio Motoru
 * Her tuşa basışta ve dokunuşta kanat çırpma / motor itişiyle tam senkronize çalışan,
 * ~0.4s - 0.7s aralığında kırpılmış ve yumuşak sönümlenen (fade-out) özel ses motoru.
 */

class SoundSystem {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.bgmMuted = false;
        this.sfxMuted = false;
        this.bgmVolume = 0.16; // Arka plan müzik seviyesi
        this.sfxVolume = 0.70; // Efekt ses seviyesi

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
            console.log(`✓ Özel ses yüklendi & senkronize edildi: ${key} (${url})`);
        } catch (e) {
            console.info(`Özel ses (${key}) Web Audio ile çözülemedi, dinamik mod devrede:`, e.message);
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
    // ✂️ SENKRONİZE & KIRPILMIŞ SES OYNATICI (Snippet with Envelope)
    // =========================================================================
    playSnippet(key, options = {}, synthFallbackFn = null) {
        if (this.muted || this.sfxMuted) return;
        this.init();

        const duration = options.duration || 0.45; // Varsayılan 0.45 saniye kırpılmış uzunluk
        const offset = options.offset || 0.0;
        const fadeTime = options.fadeTime || 0.12;
        const playbackRate = options.playbackRate || 1.0;
        const volumeScale = options.volumeScale || 1.0;

        // 1. Web Audio API Buffer (Hassas milisaniye kırpma ve yumuşak sönümleme)
        if (this.ctx && this.audioBuffers[key]) {
            try {
                const now = this.ctx.currentTime;
                const source = this.ctx.createBufferSource();
                source.buffer = this.audioBuffers[key];
                source.playbackRate.setValueAtTime(playbackRate, now);

                const gainNode = this.ctx.createGain();
                const targetVol = this.sfxVolume * volumeScale;

                // Anında başla, süre sonunda yumuşakça sönümlen (Fade out)
                gainNode.gain.setValueAtTime(targetVol, now);
                gainNode.gain.setValueAtTime(targetVol, now + Math.max(0, duration - fadeTime));
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

                source.connect(gainNode);
                gainNode.connect(this.ctx.destination);

                source.start(now, offset, duration);
                return;
            } catch (err) {
                console.warn('Buffer oynatma hatası:', err);
            }
        }

        // 2. HTML5 Audio Yedek Kırpıcı
        if (this.audioElements[key]) {
            try {
                const clone = this.audioElements[key].cloneNode();
                clone.volume = this.sfxVolume * volumeScale;
                clone.currentTime = offset;
                const playPromise = clone.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        // Belirlenen süre sonunda durdur
                        setTimeout(() => {
                            try { clone.pause(); clone.remove(); } catch (e) {}
                        }, duration * 1000);
                    }).catch(() => {
                        if (synthFallbackFn) synthFallbackFn.call(this);
                    });
                }
                return;
            } catch (err) {
                console.warn('HTML5 Audio oynatma hatası:', err);
            }
        }

        // 3. Prosedürel Sentezleyici Yedek
        if (synthFallbackFn) {
            synthFallbackFn.call(this);
        }
    }

    // =========================================================================
    // 🛸 1. DRONE: Hızlı Pervane İtişi (~0.35s Kırpılmış)
    // =========================================================================
    playDroneSound() {
        this.playSnippet('drone', {
            duration: 0.35,
            offset: 0.0,
            fadeTime: 0.08,
            playbackRate: 1.15,
            volumeScale: 1.0
        }, () => {
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(540, now + 0.08);
            osc.frequency.exponentialRampToValueAtTime(280, now + 0.18);
            gain.gain.setValueAtTime(0.25 * this.sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.18);
        });
    }

    // =========================================================================
    // 🦅 2. KARTAL: Kanat Çırpma & Çığlık (~0.42s Kırpılmış Zıplama)
    // =========================================================================
    playEagleSound() {
        this.playSnippet('kartal', {
            duration: 0.42,
            offset: 0.0,
            fadeTime: 0.10,
            playbackRate: 1.12,
            volumeScale: 1.0
        }, () => {
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            if (this.noiseBuffer) {
                const noise = this.ctx.createBufferSource();
                noise.buffer = this.noiseBuffer;
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(300, now);
                filter.frequency.exponentialRampToValueAtTime(700, now + 0.06);
                filter.frequency.exponentialRampToValueAtTime(120, now + 0.22);
                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.45 * this.sfxVolume, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);
                noise.start(now);
                noise.stop(now + 0.22);
            }
        });
    }

    // 🦅 Havada Süzülürken Uzun Kartal Çığlığı (~1.1s)
    playEagleScreech() {
        this.playSnippet('kartal', {
            duration: 1.1,
            offset: 0.0,
            fadeTime: 0.25,
            playbackRate: 1.0,
            volumeScale: 1.1
        }, () => {
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
    // 🚀 3. ROKET: Tok İtiş Patlaması (~0.48s Kırpılmış)
    // =========================================================================
    playRocketSound() {
        this.playSnippet('roket', {
            duration: 0.48,
            offset: 0.0,
            fadeTime: 0.12,
            playbackRate: 1.08,
            volumeScale: 0.95
        }, () => {
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            if (this.noiseBuffer) {
                const noise = this.ctx.createBufferSource();
                noise.buffer = this.noiseBuffer;
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(600, now);
                filter.frequency.exponentialRampToValueAtTime(180, now + 0.22);
                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.5 * this.sfxVolume, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);
                noise.start(now);
                noise.stop(now + 0.22);
            }
        });
    }

    // =========================================================================
    // 🎯 4. FÜZE: Keskin Sesüstü Ateşleme (~0.38s Kırpılmış)
    // =========================================================================
    playMissileSound() {
        this.playSnippet('fuze', {
            duration: 0.38,
            offset: 0.0,
            fadeTime: 0.09,
            playbackRate: 1.12,
            volumeScale: 1.0
        }, () => {
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            if (this.noiseBuffer) {
                const noise = this.ctx.createBufferSource();
                noise.buffer = this.noiseBuffer;
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(1200, now);
                filter.frequency.exponentialRampToValueAtTime(350, now + 0.18);
                filter.Q.setValueAtTime(4.0, now);
                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.45 * this.sfxVolume, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);
                noise.start(now);
                noise.stop(now + 0.18);
            }
        });
    }

    // Karakter seçimine göre anlık zıplama
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
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1174.66, now + 0.06);
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

        const notes = [587.33, 739.99, 880.00, 1174.66];
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

        const notes = [329.63, 311.13, 293.66, 277.18];
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
