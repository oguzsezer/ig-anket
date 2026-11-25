// Survey content. One survey per participant type ("uretici", "ajans", "marka").
// Each question: { t: text, h: optional hint }. A section with "concept" shows that text above its questions.
window.SURVEYS = {
  uretici: {
    you: "sen",
    title: "İçerik üreticileriyle kısa bir sohbet",
    intro: "Bu sorular, içerik üreticilerinin işlerini nasıl yürüttüğünü anlamak için. Satış yapmıyorum, doğru ya da yanlış cevap yok. Yanıtlarını ve ses kayıtlarını yalnızca bu araştırma için kullanacağım ve araştırma bitince sileceğim. Notlarımda adın ve kullanıcı adın geçmeyecek.",
    minutes: "20–25",
    sections: [
      { name: "Sen ve Instagram", qs: [
        { t: "Instagram'da ne tür içerik paylaşıyorsun? Ne zamandır?" },
        { t: "Haftada kaç saatini Instagram'a ayırıyorsun? Bu saatler neye gidiyor?" },
        { t: "Instagram dışında bir işin ya da gelir kaynağın var mı?" },
      ]},
      { name: "Son zamanlarda seni uğraştıranlar", qs: [
        { t: "Son bir ayda Instagram'la ilgili seni en çok uğraştıran şey neydi? Biraz anlatır mısın?" },
        { t: "Bu sorunu çözmek için ne yaptın? Ne işe yaradı, ne yaramadı?" },
        { t: "Bir gönderinin iyi ya da kötü gideceğine paylaşmadan önce nasıl karar veriyorsun?", h: "En son paylaştığın gönderiyi düşünerek anlat." },
        { t: "Hesabının istatistiklerine en son ne zaman baktın? Neye baktın, sonra ne yaptın?" },
      ]},
      { name: "Markalarla iş birlikleri", qs: [
        { t: "Bugüne kadar bir markayla ücretli ya da ürün karşılığı çalıştın mı? Kaç kez?", h: "Hiç çalışmadıysan 9, 10, 13, 14, 16 ve 17. soruları boş bırakabilirsin." },
        { t: "En son iş birliğini anlat: Marka seni nasıl buldu ya da sen markayı nasıl buldun?" },
        { t: "Sonra ne oldu? Kim ne yazdı, kaç mesaj gidip geldi, ne kadar sürdü?" },
        { t: "Bir markaya kendin yazdın mı? Ne yazdın? Ne cevap geldi?" },
        { t: "Bir ajans ya da menajerle çalışıyor musun ya da çalıştın mı? Nasıl gitti?" },
      ]},
      { name: "Ücretler ve para", qs: [
        { t: "En son iş birliğinde ne kadar ücret aldın ya da ne aldın?", h: "Rakam vermek istemezsen bir aralık yazabilir ya da boş bırakabilirsin." },
        { t: "En son ücretli iş birliğin ne zamandı? Ne yaptın (gönderi, reels, hikaye, paket) ve ne kadar ücret aldın?" },
        { t: "Son 12 ayda iş birliklerinden toplam ne kadar kazandın? Kaçı ücretliydi, kaçında yalnızca ürün aldın?" },
        { t: "Bu ücrete nasıl karar verdin? Kime danıştın, neye baktın?" },
        { t: "Son iş birliğinde ilk istediğin ücret ile sonunda aldığın ücret aynı mıydı? Fark olduysa ne oldu?" },
        { t: "Bir teklifi düşük ya da yüksek bulduğun oldu mu? Ne yaptın?" },
        { t: "Instagram işin için şu an para ödediğin bir şey var mı (uygulama, kurs, danışman, reklam, ekipman)? Ayda ne kadar?" },
      ]},
      { name: "Daha önce denediklerin", qs: [
        { t: "Instagram'da büyümek ya da iş birliği bulmak için hangi uygulamaları, kursları ya da kişileri denedin?" },
        { t: "Hangisini bıraktın? Neden?" },
        { t: "Edits Asistanı sende var mı? Varsa en son ne zaman kullandın, ne sordun, ne cevap aldın? Senin için neyi yapmıyor?", h: "Bilmiyorsan \"bilmiyorum\" demen yeterli." },
      ]},
      { name: "Bir fikir", concept: "Bir fikir üzerinde çalışıyoruz: Instagram hesabını bağladığın bir servis. Gönderini paylaşmadan önce yorum yapıyor, hesabını analiz ediyor, bir iş birliği için ücret aralığı öneriyor ve markaya yazacağın mesajın taslağını hazırlıyor.", qs: [
        { t: "Bu anlattığım, son zamanlarda yaşadığın bir duruma uyuyor mu? Hangisine?" },
        { t: "Bunun hangi kısmını kullanırdın, hangisini kullanmazdın? Neden?" },
        { t: "Böyle bir servis için ayda hangi ücret sana çok pahalı gelir, hiç düşünmezsin?", h: "Aylık ücret, TL olarak." },
        { t: "Hangi ücret pahalı ama yine de düşünürsün?", h: "Aylık ücret, TL olarak." },
        { t: "Hangi ücret uygun gelir?", h: "Aylık ücret, TL olarak." },
        { t: "Hangi ücret o kadar ucuz gelir ki kalitesinden şüphe edersin?", h: "Aylık ücret, TL olarak." },
        { t: "Deneme sürümü çıktığında ne istersin?", h: "\"Gerek yok\", \"Çıkınca haber ver\" ya da \"Hemen denemek isterim\"." },
      ]},
      { name: "Son", qs: [
        { t: "Sormadığım ama sormam gereken bir şey var mı?" },
        { t: "Bu konuda konuşmamın faydalı olacağı başka bir içerik üreticisi tanıyor musun?", h: "Evet ya da hayır yeterli. Kişinin adını buraya yazma; bana ayrıca mesajla ilet." },
      ]},
    ],
  },

  ajans: {
    you: "siz",
    title: "Ajans ve menajerlerle kısa bir sohbet",
    intro: "Bu sorular, ajansların ve menajerlerin küçük içerik üreticileriyle nasıl çalıştığını anlamak için. Satış yapmıyorum. Notlarımda adınızı, şirket adınızı, çalıştığınız kişilerin ve markaların adlarını yazmayacağım. Yanıtlarınızı ve ses kayıtlarınızı yalnızca bu araştırma için kullanacağım ve araştırma bitince sileceğim.",
    minutes: "25–30",
    sections: [
      { name: "Ajansınız", qs: [
        { t: "Kaç içerik üreticisiyle çalışıyorsunuz? Takipçi sayıları hangi aralıkta?" },
        { t: "Ekipte kaç kişi var? Kim ne iş yapıyor?" },
        { t: "Gelirinizin çoğu nereden geliyor: komisyon, sabit ücret, markadan hizmet bedeli?" },
      ]},
      { name: "İşin bugünkü hali", qs: [
        { t: "Dün ya da geçen hafta sıradan bir iş gününü anlatır mısınız? Saatler neye gitti?" },
        { t: "Yeni bir içerik üreticisiyle çalışmaya nasıl karar veriyorsunuz? Neye bakıyorsunuz?", h: "En son kabul ettiğiniz ya da reddettiğiniz üreticiyi düşünerek anlatın." },
        { t: "Bir üreticinin hesabının nasıl gittiğini nasıl takip ediyorsunuz? Hangi araçları kullanıyorsunuz?" },
        { t: "Son bir ayda en çok vaktinizi alan ya da en çok canınızı sıkan iş neydi?" },
      ]},
      { name: "Marka iş birlikleri", qs: [
        { t: "En son kapattığınız iş birliğini anlatır mısınız: Marka nereden geldi, ilk mesajdan anlaşmaya kadar ne oldu?" },
        { t: "Markaya bir üreticiyi önerirken ne gönderiyorsunuz (medya kiti, istatistik, örnek içerik)? Bunu nasıl hazırlıyorsunuz?" },
        { t: "Bir ayda kaç teklif gönderiyorsunuz? Kaçı anlaşmaya dönüyor?" },
        { t: "Anlaşma olmayan son teklifte ne oldu?" },
      ]},
      { name: "Ücretler", qs: [
        { t: "Bir üreticinin ücretine nasıl karar veriyorsunuz? Bir tablo, kural ya da kaynak kullanıyor musunuz?" },
        { t: "1.000–10.000 ve 10.000–30.000 takipçili üreticiler için son aylarda gördüğünüz ücretler hangi aralıkta?", h: "Gönderi, hikaye ve reels için ayrı yazın. Rakam vermek istemezseniz boş bırakabilirsiniz." },
        { t: "Markalar ücret konusunda en çok neye itiraz ediyor?" },
      ]},
      { name: "Araçlar ve harcamalar", qs: [
        { t: "Şu an hangi araçlara para ödüyorsunuz? Ayda ne kadar?" },
        { t: "Denediğiniz ve bıraktığınız bir araç var mı? Neden bıraktınız?" },
      ]},
      { name: "Bir fikir", concept: "Bir fikir üzerinde çalışıyoruz: Üreticilerin Instagram hesaplarını bağladığı bir servis. Paylaşımdan önce gönderiye yorum yapıyor, hesabı analiz ediyor, ücret aralığı öneriyor, markaya mesaj taslağı hazırlıyor. Ajanslar birden çok üreticiyi tek yerden görebilir.", qs: [
        { t: "Bu, sizin işinizde hangi duruma uyuyor? Hangisine uymuyor?" },
        { t: "Bunu kim kullanırdı: siz mi, üreticiler mi? Neden?" },
        { t: "Üretici başına ayda hangi ücret çok pahalı gelir?", h: "Üretici başına aylık ücret, TL olarak." },
        { t: "Hangi ücret pahalı ama yine de düşünürsünüz?", h: "Üretici başına aylık ücret, TL olarak." },
        { t: "Hangi ücret uygun gelir?", h: "Üretici başına aylık ücret, TL olarak." },
        { t: "Hangi ücret o kadar ucuz gelir ki kalitesinden şüphe edersiniz?", h: "Üretici başına aylık ücret, TL olarak." },
        { t: "Satın alma kararını kim veriyor? Neye bakıyor?" },
        { t: "Pilot sürümü 1–2 üreticinizle denemek ister misiniz?", h: "Evet ise ne zaman başlayabileceğinizi de söyleyin." },
      ]},
      { name: "Son", qs: [
        { t: "Sormadığım ama sormam gereken bir şey var mı?" },
        { t: "Bu konuda konuşmamın faydalı olacağı başka bir ajans ya da menajer var mı?", h: "Evet ya da hayır yeterli. Adını buraya yazmayın; bana ayrıca mesajla iletin." },
      ]},
    ],
  },

  marka: {
    you: "siz",
    title: "Markalarla kısa bir sohbet",
    intro: "Bu sorular, küçük markaların içerik üreticileriyle nasıl çalıştığını anlamak için. Satış yapmıyorum. Notlarımda ne adınızı ne de marka adınızı yazacağım; sadece bir kod kullanacağım. Yanıtlarınızı ve ses kayıtlarınızı yalnızca bu araştırma için kullanacağım ve araştırma bitince sileceğim.",
    minutes: "15–20",
    sections: [
      { name: "Markanız", qs: [
        { t: "Markanız ne satıyor? Kaç kişilik bir ekipsiniz?" },
        { t: "Instagram'ı satış ya da tanıtım için nasıl kullanıyorsunuz, kim yönetiyor?" },
      ]},
      { name: "Son 12 ayda içerik üreticileriyle çalışmanız", qs: [
        { t: "Son 12 ayda kaç içerik üreticisiyle çalıştınız? Kaçı ücretli, kaçı ürün karşılığıydı?" },
        { t: "En son çalıştığınız üreticiyi nasıl buldunuz (platform, ajans, DM, tanıdık)?" },
        { t: "Neye bakarak seçtiniz: takipçi sayısı, etkileşim, içerik, fiyat?" },
        { t: "Ödemeyi nasıl yaptınız? Ne kadar, ne zaman? Fatura ya da sözleşme oldu mu?" },
        { t: "Son bir yılda 30 bin takipçinin altındaki hesaplarla çalıştınız mı? Nasıl gitti?" },
        { t: "Ters giden bir iş birliğini anlatır mısınız: Ne oldu, ne kaybettiniz (zaman, para, güven)?" },
        { t: "Bir üreticiyi aramak ve seçmek sizin için ortalama kaç saat sürüyor?" },
      ]},
      { name: "Bugün kullandığınız araçlar", qs: [
        { t: "Üretici bulmak için şu an para ödediğiniz bir platform, ajans ya da araç var mı? Ayda ya da kampanya başına ne kadar?" },
        { t: "Denediğiniz ve bıraktığınız bir platform var mı? Neden bıraktınız?" },
      ]},
      { name: "Bir fikir", concept: "Bir fikir üzerinde çalışıyoruz: Instagram hesabı doğrulanmış, ücret aralığı ve geçmiş içerik özeti hazır, markalarla çalışmaya hazır mikro üreticilerin bir listesi.", qs: [
        { t: "Doğrulanmış, markaya hazır mikro üreticiler için ödeme yapar mısınız? Ne kadar?", h: "Tutarı ve birimini yazın: kampanya başına, aylık ya da üretici başına." },
        { t: "Hangi koşulda ödeme yaparsınız, hangi koşulda yapmazsınız?" },
        { t: "Önümüzdeki iki hafta içinde ihtiyacınız olan bir kampanya için size elle hazırlanmış kısa bir üretici listesi göndersem, denemek ister misiniz?", h: "Evet ise kampanyanın tarihini de yazın. Bu liste bir denemedir, hizmet teklifi değildir; üreticilerin yanıt vereceğine ya da satış getireceğine dair söz vermiyorum." },
      ]},
      { name: "Son", qs: [
        { t: "Sormadığım ama sormam gereken bir şey var mı?" },
        { t: "Benzer bir markada çalışan, bu konuda konuşabilecek biri var mı?", h: "Evet ya da hayır yeterli. Kişinin adını buraya yazmayın; bana ayrıca mesajla iletin." },
      ]},
    ],
  },
};
