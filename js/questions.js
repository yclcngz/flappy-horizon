window.questionBank = [
    {
        id: "TR_1_001",
        country: "TR",
        grade: "1",
        topic: "Toplama",
        questionText: "Ali'nin 3 elması vardı. Ayşe ona 2 elma daha verdi. Ali'nin toplam kaç elması oldu?",
        options: ["4", "5", "6", "7"],
        correctAnswerIndex: 1
    },
    {
        id: "TR_1_002",
        country: "TR",
        grade: "1",
        topic: "Çıkarma",
        questionText: "Ağaçta 8 kuş vardı. 3 tanesi uçtu. Ağaçta kaç kuş kaldı?",
        options: ["4", "5", "6", "3"],
        correctAnswerIndex: 1
    },
    {
        id: "TR_1_003",
        country: "TR",
        grade: "1",
        topic: "Rakamlar",
        questionText: "Hangi sayı 'Yedi' olarak okunur?",
        options: ["6", "7", "8", "9"],
        correctAnswerIndex: 1
    },
    {
        id: "TR_1_004",
        country: "TR",
        grade: "1",
        topic: "Toplama",
        questionText: "5 + 4 işleminin sonucu kaçtır?",
        options: ["8", "9", "10", "11"],
        correctAnswerIndex: 1
    },
    {
        id: "TR_1_005",
        country: "TR",
        grade: "1",
        topic: "Şekiller",
        questionText: "Hangi şeklin 3 köşesi vardır?",
        options: ["Kare", "Daire", "Üçgen", "Dikdörtgen"],
        correctAnswerIndex: 2
    },
    {
        id: "TR_1_006",
        country: "TR",
        grade: "1",
        topic: "Örüntü",
        questionText: "2, 4, 6, ? sıradaki sayı kaçtır?",
        options: ["7", "8", "9", "10"],
        correctAnswerIndex: 1
    },
    
    // --- 2. SINIF MATEMATİK SORULARI (TR) ---
    {
        id: "TR_2_001",
        country: "TR",
        grade: "2",
        topic: "Toplama",
        questionText: "15 + 12 işleminin sonucu kaçtır?",
        options: ["25", "27", "29", "30"],
        correctAnswerIndex: 1
    },
    {
        id: "TR_2_002",
        country: "TR",
        grade: "2",
        topic: "Çıkarma",
        questionText: "30 sayısından 14 çıkarırsak kaç kalır?",
        options: ["14", "15", "16", "18"],
        correctAnswerIndex: 2
    },
    {
        id: "TR_2_003",
        country: "TR",
        grade: "2",
        topic: "Çarpma (Temel)",
        questionText: "Günde 2 elma yiyen Ayşe, 4 günde kaç elma yer? (2 x 4)",
        options: ["6", "8", "10", "12"],
        correctAnswerIndex: 1
    },
    {
        id: "TR_2_004",
        country: "TR",
        grade: "2",
        topic: "Uzunluk Ölçüleri",
        questionText: "1 metre kaç santimetredir?",
        options: ["10 cm", "50 cm", "100 cm", "1000 cm"],
        correctAnswerIndex: 2
    },
    {
        id: "TR_2_005",
        country: "TR",
        grade: "2",
        topic: "Zaman",
        questionText: "Yarım saat kaç dakikadır?",
        options: ["15", "30", "45", "60"],
        correctAnswerIndex: 1
    },
    {
        id: "TR_2_006",
        country: "TR",
        grade: "2",
        topic: "Problemler",
        questionText: "Otobüste 45 yolcu vardı. Durakta 12 kişi indi, 5 kişi bindi. Otobüste kaç yolcu oldu?",
        options: ["33", "38", "40", "43"],
        correctAnswerIndex: 1
    }
];

window.getNextQuestion = function(country, grade, currentIndex) {
    // Ülke ve sınıfa göre soruları filtrele (Sorular kolaydan zora sıralı varsayılır)
    const filtered = window.questionBank.filter(q => q.country === country && q.grade === grade);
    if (filtered.length === 0) return null;
    
    // Index dizinin boyutunu aşarsa başa sar (modulo)
    const safeIndex = currentIndex % filtered.length;
    return {
        question: filtered[safeIndex],
        nextIndex: safeIndex + 1
    };
};
