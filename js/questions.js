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
    }
];

window.getRandomQuestion = function(country, grade) {
    const filtered = window.questionBank.filter(q => q.country === country && q.grade === grade);
    if (filtered.length === 0) return null;
    return filtered[Math.floor(Math.random() * filtered.length)];
};
