/**
 * Flappy Horizon - Akıllı Pik Analizli & Uzatılmış Web Audio Motoru
 * - Sesler artık 1.4s - 1.8s boyunca doğal ve tok şekilde sürer.
 * - Kartal ve diğer sesler için otomatik pik tespiti (en yüksek sesli yerden başlatma).
 * - Yumuşak sönümlenme (fade-out) ve zengin ses seviyesi.
 */

class SoundSystem {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.bgmMuted = false;
        this.sfxMuted = false;
        this.bgmVolume = 0.16; // Arka plan müzik seviyesi
        this.sfxVolume = 0.80; // Efekt ses seviyesi (yükseltildi)

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

        // En yüksek sesli (Peak) başlangıç noktaları (Saniye cinsinden)
        this.peakOffsets = {
            drone: 0.0,
            kartal: 0.0,
            roket: 0.0,
            fuze: 0.0
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

            // En yüksek volümlü (Pik) noktayı otomatik analiz et
            const peakTime = this.findPeakOffset(decodedBuffer);
            this.peakOffsets[key] = peakTime;

            console.log(`✓ Ses yüklendi: ${key} | Süre: ${decodedBuffer.duration.toFixed(2)}s | Pik Ofseti: ${peakTime.toFixed(2)}s`);
        } catch (e) {
            console.info(`Özel ses (${key}) Web Audio ile çözülemedi, HTML5/Synth devrede:`, e.message);
        }
    }

    // Ses dalgasındaki en yüksek enerjili / volümlü yeri bulan akıllı algoritma
    findPeakOffset(buffer, windowSec = 0.25) {
        if (!buffer) return 0;
        const data = buffer.getChannelData(0);
        const sampleRate = buffer.sampleRate;
        const windowSamples = Math.floor(sampleRate * windowSec);
        const stepSamples = Math.floor(sampleRate * 0.05); // 50ms kaydırmalı pencere

        let maxRms = 0;
        let peakSample = 0;

        for (let i = 0; i < data.length - windowSamples; i += stepSamples) {
            let sum = 0;
            for (let j = 0; j < windowSamples; j++) {
                const val = data[i + j];
                sum += val * val;
            }
            const rms = Math.sqrt(sum / windowSamples);
            if (rms > maxRms) {
                maxRms = rms;
                peakSample = i;
            }
        }

        // Vuruşun başlangıcını kaçırmamak için pikin 60ms öncesinden başlat
        const attackLeadSec = 0.06;
        const peakTimeSec = Math.max(0, (peakSample / sampleRate) - attackLeadSec);
        return peakTimeSec;
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
    // 🔊 DOĞAL & UZATILMIŞ SES OYNATICI (1.4s - 1.8s Süreli & Fade-Out Zarfı)
    // =========================================================================
    playSnippet(key, options = {}, synthFallbackFn = null) {
        if (this.muted || this.sfxMuted) return;
        this.init();

        const duration = options.duration || 1.5; // ~1.5 saniye doğal süre
        const defaultOffset = this.peakOffsets[key] || 0.0;
        const offset = options.offset !== undefined ? options.offset : defaultOffset;
        const fadeTime = options.fadeTime || 0.35;
        const playbackRate = options.playbackRate || 1.0;
        const volumeScale = options.volumeScale || 1.0;

        // 1. Web Audio API Buffer (En temiz ve gecikmesiz yöntem)
        if (this.ctx && this.audioBuffers[key]) {
            try {
                const now = this.ctx.currentTime;
                const source = this.ctx.createBufferSource();
                source.buffer = this.audioBuffers[key];
                source.playbackRate.setValueAtTime(playbackRate, now);

                const gainNode = this.ctx.createGain();
                const targetVol = this.sfxVolume * volumeScale;

                // Başlangıç sesi ve doğal bitiş sönümlemesi
                gainNode.gain.setValueAtTime(targetVol, now);
                gainNode.gain.setValueAtTime(targetVol, now + Math.max(0, duration - fadeTime));
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

                source.connect(gainNode);
                gainNode.connect(this.ctx.destination);

                // Dosya boyutunu aşmayacak şekilde güvenli başlangıç
                const maxOffset = Math.max(0, this.audioBuffers[key].duration - 0.2);
                const safeOffset = Math.min(offset, maxOffset);

                source.start(now, safeOffset, duration);
                return;
            } catch (err) {
                console.warn('Buffer oynatma hatası:', err);
            }
        }

        // 2. HTML5 Audio Yedek Kırpıcı
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

        // 3. Prosedürel Sentezleyici Yedek
        if (synthFallbackFn) {
            synthFallbackFn.call(this);
        }
    }

    // =========================================================================
    // 🛸 1. DRONE: 0.90 Saniye Süren Motor Vızıltısı
    // =========================================================================
    playDroneSound() {
        this.playSnippet('drone', {
            offset: 0.40,
            duration: 0.90, // 0.90 saniye
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

    // =========================================================================
    // 🦅 2. KARTAL: En Yüksek Çığlıktan Başlayan (1.65s) 1.0 Saniyelik Ses
    // =========================================================================
    playEagleSound() {
        this.playSnippet('kartal', {
            offset: 1.65, // En yüksek çığlığın başladığı nokta
            duration: 1.0, // Tam 1.0 saniye
            fadeTime: 0.25,
            playbackRate: 1.0,
            volumeScale: 1.6
        }, () => {
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const duration = 0.9;
            const modOsc = this.ctx.createOscillator();
            const modGain = this.ctx.createGain();
            modOsc.type = 'sine';
            modOsc.frequency.setValueAtTime(30, now);
            modGain.gain.setValueAtTime(180, now);

            const carrierOsc = this.ctx.createOscillator();
            carrierOsc.type = 'sawtooth';
            carrierOsc.frequency.setValueAtTime(2700, now);
            carrierOsc.frequency.linearRampToValueAtTime(3200, now + 0.12);
            carrierOsc.frequency.exponentialRampToValueAtTime(1600, now + duration);

            modOsc.connect(carrierOsc.frequency);
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(2400, now);
            filter.frequency.exponentialRampToValueAtTime(1800, now + duration);
            filter.Q.setValueAtTime(4.5, now);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.45 * this.sfxVolume, now + 0.08);
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

    playEagleScreech() {
        this.playEagleSound();
    }

    // =========================================================================
    // 🚀 3. ROKET: 0.85 Saniye Süren İtiş Patlaması
    // =========================================================================
    playRocketSound() {
        this.playSnippet('roket', {
            offset: 0.85,
            duration: 0.85, // 0.85 saniye
            fadeTime: 0.18,
            playbackRate: 1.0,
            volumeScale: 1.3
        }, () => {
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            if (this.noiseBuffer) {
                const noise = this.ctx.createBufferSource();
                noise.buffer = this.noiseBuffer;
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(600, now);
                filter.frequency.exponentialRampToValueAtTime(150, now + 0.7);
                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.55 * this.sfxVolume, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);
                noise.start(now);
                noise.stop(now + 0.7);
            }
        });
    }

    // =========================================================================
    // 🎯 4. FÜZE: 0.85 Saniye Süren Sesüstü Jet İtişi
    // =========================================================================
    playMissileSound() {
        this.playSnippet('fuze', {
            offset: 0.35,
            duration: 0.85, // 0.85 saniye
            fadeTime: 0.18,
            playbackRate: 1.0,
            volumeScale: 1.2
        }, () => {
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            if (this.noiseBuffer) {
                const noise = this.ctx.createBufferSource();
                noise.buffer = this.noiseBuffer;
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(1200, now);
                filter.frequency.exponentialRampToValueAtTime(300, now + 0.6);
                filter.Q.setValueAtTime(3.5, now);
                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.5 * this.sfxVolume, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);
                noise.start(now);
                noise.stop(now + 0.6);
            }
        });
    }

    // Karakter seçimine göre zıplama
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

        gain.gain.setValueAtTime(0.45 * this.sfxVolume, now);
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
