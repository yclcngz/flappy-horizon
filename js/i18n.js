const i18n = {
    tr: {
        // Profil
        profileTitle: "PİLOT PROFİLİ",
        profileNameLabel: "Oyuncu Adı (Zorunlu)",
        profileNameHolder: "Örn: Alp",
        profileCountryLabel: "Ülke",
        profileGradeLabel: "Sınıf / Seviye",
        btnSaveProfile: "KAYDET VE BAŞLA",
        // Menü
        btnPlay: "🚀 UÇUŞA BAŞLA",
        btnGarage: "🔧 KARAKTER ATÖLYESİ",
        btnLevels: "🌍 SEVİYE VE DÜNYALAR",
        btnLeaderboard: "🏆 LİDERLİK TABLOSU",
        menuControls: "🖱️ Tıkla • ⌨️ Boşluk • 📱 Ekrana Dokun",
        menuSound: "🔊 Ses Açık",
        // HUD
        hudScoreLabel: "SKOR",
        hudLevelLabel: "SEVİYE",
        btnMath: "🧠 Soru Çöz (+1 Can)",
        btnAd: "📺 Reklam İzle (+1 Can)",
        btnMathCooldown: "🧠 Soru İçin {val} Puan",
        btnAdCooldown: "📺 Reklam İçin {val} Puan",
        btnMathFull: "🧠 Can Full",
        btnAdFull: "📺 Can Full",
        // Modallar
        modalMathTitle: "🧠 BİLGİ TESTİ",
        modalAdTitle: "📺 SPONSORLU REKLAM",
        modalAdWait: "Lütfen bekleyin...",
        modalAdReward: "✅ +1 CAN KAZANDIN!",
        modalGarageTitle: "Karakter Atölyesi",
        modalLeaderboardTitle: "Global Liderlik Tablosu",
        btnClose: "KAPAT",
        // Sınıflar
        grade1: "1. Sınıf",
        grade2: "2. Sınıf",
        grade3: "3. Sınıf",
        grade4: "4. Sınıf",
        grade5: "5. Sınıf",
        grade6: "6. Sınıf",
        grade7: "7. Sınıf",
        grade8: "8. Sınıf (LGS)",
        grade12: "12. Sınıf (YKS)",
        gradeUS5: "Grade 5 (US)", // İleride eklenecek
        // Tablo
        thRank: "SIRA",
        thPilot: "PİLOT & KARAKTER",
        thScore: "SKOR",
        // Game Over
        goTitle: "GÖREV SONLANDI",
        goNewRecord: "✨ YENİ REKOR! ✨",
        goScore: "TOPLANAN SKOR",
        goBestScore: "EN YÜKSEK REKOR",
        goMedal: "KAZANILAN MADALYA",
        btnRestart: "🔄 TEKRAR UÇ",
        btnGoLeaderboard: "🏆 LİDERLİK TABLOSU",
        btnBackMenu: "🏠 ANA MENÜ",
        // Pause
        pauseTitle: "OYUN DURAKLATILDI",
        pauseHint: "Devam etmek için ekrana dokun"
    },
    en: {
        profileTitle: "PILOT PROFILE",
        profileNameLabel: "Player Name (Required)",
        profileNameHolder: "e.g. Alex",
        profileCountryLabel: "Country",
        profileGradeLabel: "Grade / Level",
        btnSaveProfile: "SAVE AND START",
        btnPlay: "🚀 START FLIGHT",
        btnGarage: "🔧 GARAGE",
        btnLevels: "🌍 WORLDS & LEVELS",
        btnLeaderboard: "🏆 LEADERBOARD",
        menuControls: "🖱️ Click • ⌨️ Space • 📱 Tap Screen",
        menuSound: "🔊 Sound On",
        hudScoreLabel: "SCORE",
        hudLevelLabel: "LEVEL",
        btnMath: "🧠 Answer (+1 Life)",
        btnAd: "📺 Watch Ad (+1 Life)",
        btnMathCooldown: "🧠 Need {val} Score",
        btnAdCooldown: "📺 Need {val} Score",
        btnMathFull: "🧠 Max Lives",
        btnAdFull: "📺 Max Lives",
        modalMathTitle: "🧠 KNOWLEDGE TEST",
        modalAdTitle: "📺 SPONSORED AD",
        modalAdWait: "Please wait...",
        modalAdReward: "✅ +1 LIFE EARNED!",
        modalGarageTitle: "Character Garage",
        modalLeaderboardTitle: "Global Leaderboard",
        btnClose: "CLOSE",
        grade1: "Grade 1",
        grade2: "Grade 2",
        grade3: "Grade 3",
        grade4: "Grade 4",
        grade5: "Grade 5",
        grade6: "Grade 6",
        grade7: "Grade 7",
        grade8: "Grade 8",
        grade12: "Grade 12",
        gradeUS5: "Grade 5 (US)",
        thRank: "RANK",
        thPilot: "PILOT & CHARACTER",
        thScore: "SCORE",
        goTitle: "MISSION ENDED",
        goNewRecord: "✨ NEW RECORD! ✨",
        goScore: "TOTAL SCORE",
        goBestScore: "BEST SCORE",
        goMedal: "MEDAL EARNED",
        btnRestart: "🔄 FLY AGAIN",
        btnGoLeaderboard: "🏆 LEADERBOARD",
        btnBackMenu: "🏠 MAIN MENU",
        pauseTitle: "GAME PAUSED",
        pauseHint: "Tap screen to continue"
    }
};

window.i18n = i18n;
window.currentLang = 'tr';

window.setLanguage = function(lang) {
    if (!i18n[lang]) return;
    window.currentLang = lang;
    localStorage.setItem('flappy_lang', lang);

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18n[lang][key]) {
            if (el.tagName === 'INPUT' && el.type === 'text') {
                el.placeholder = i18n[lang][key];
            } else {
                el.innerText = i18n[lang][key];
            }
        }
    });

    // Update Dropdowns
    const gradeSelect = document.getElementById('profileGrade');
    if (gradeSelect) {
        Array.from(gradeSelect.options).forEach(opt => {
            const val = opt.value;
            if (i18n[lang]['grade' + val]) {
                opt.innerText = i18n[lang]['grade' + val];
            }
        });
    }

    // Trigger HUD update if game is running
    if (window.gameEngine && window.gameEngine.updateHUD) {
        window.gameEngine.updateHUD();
    }
};

window.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('flappy_lang') || 'tr';
    window.setLanguage(savedLang);
});
