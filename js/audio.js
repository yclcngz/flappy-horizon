/**
 * Flappy Horizon - Web Audio API Ses Motoru
 * Harici dosya gerektirmeyen, sıfır gecikmeli dinamik ses sentezleyici.
 * Ayrıca kullanıcı ileride kendi ses dosyalarını eklemek isterse kolayca URL tanımlayabilir.
 */

class SoundSystem {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.customSounds = {
            jump: null,
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
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    initOnUserGesture() {
        const unlock = () => {
            this.init();
            window.removeEventListener('click', unlock);
            window.removeEventListener('keydown', unlock);
            window.removeEventListener('touchstart', unlock);
        };
        window.addEventListener('click', unlock);
        window.addEventListener('keydown', unlock);
        window.addEventListener('touchstart', unlock);
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    // Özel ses dosyası yüklemek için (kullanıcı MP3/WAV eklemek isterse)
    loadCustomSound(name, url) {
        if (!this.customSounds.hasOwnProperty(name)) return;
        const audio = new Audio(url);
        this.customSounds[name] = audio;
    }

    // 1. Zıplama / İtiş / Kanat Çırpma Sesi (Karaktere göre dinamik ton)
    playJump(charType = 'drone') {
        if (this.muted) return;
        if (this.customSounds.jump) {
            this.customSounds.jump.currentTime = 0;
            this.customSounds.jump.play().catch(() => {});
            return;
        }
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        if (charType === 'drone') {
            // Fütüristik hafif servo/motor vızıltısı
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(280, now);
            osc.frequency.exponentialRampToValueAtTime(520, now + 0.12);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            osc.start(now);
            osc.stop(now + 0.12);
        } else if (charType === 'kartal') {
            // Kanat rüzgarı & tüy hışırtısı efekti
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(360, now + 0.14);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
            osc.start(now);
            osc.stop(now + 0.14);
        } else if (charType === 'roket') {
            // Tok roket plazma patlaması
            osc.type = 'square';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(320, now + 0.16);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
            osc.start(now);
            osc.stop(now + 0.16);
        } else {
            // Füze itiş sesi
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(440, now + 0.13);
            gain.gain.setValueAtTime(0.14, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
            osc.start(now);
            osc.stop(now + 0.13);
        }
    }

    // 2. Normal Skor Sesi (Kristal Ting)
    playScore() {
        if (this.muted) return;
        if (this.customSounds.score) {
            this.customSounds.score.currentTime = 0;
            this.customSounds.score.play().catch(() => {});
            return;
        }
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(784, now); // G5
        osc.frequency.setValueAtTime(1046.5, now + 0.08); // C6
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.28);
    }

    // 3. Halka İçinden Geçiş / Özel Puan Sesi (Chime / Arp efekti)
    playRing() {
        if (this.muted) return;
        if (this.customSounds.ring) {
            this.customSounds.ring.currentTime = 0;
            this.customSounds.ring.play().catch(() => {});
            return;
        }
        this.init();
        if (!this.ctx) return;

        const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, High C
        notes.forEach((freq, idx) => {
            const now = this.ctx.currentTime + idx * 0.05;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.2);
        });
    }

    // 4. Çarpışma / Engel Darbesi Sesi
    playHit() {
        if (this.muted) return;
        if (this.customSounds.hit) {
            this.customSounds.hit.currentTime = 0;
            this.customSounds.hit.play().catch(() => {});
            return;
        }
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.2);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.2);
    }

    // 5. Game Over Melodisi / Düşüş Sesi
    playGameOver() {
        if (this.muted) return;
        if (this.customSounds.die) {
            this.customSounds.die.currentTime = 0;
            this.customSounds.die.play().catch(() => {});
            return;
        }
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [293.66, 277.18, 261.63, 246.94]; // D4, C#4, C4, B3
        notes.forEach((freq, idx) => {
            const time = now + idx * 0.12;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);
            gain.gain.setValueAtTime(0.2, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(time);
            osc.stop(time + 0.2);
        });
    }

    // 6. UI Buton Tıklama Sesi
    playClick() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.05);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.05);
    }
}

window.soundSystem = new SoundSystem();
