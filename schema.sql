-- Paylaşılan içeriklerin kayıtları ve tekilleştirme tablosu
CREATE TABLE IF NOT EXISTS published_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    content_hash TEXT UNIQUE NOT NULL,
    source_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Kitap alıntıları ve düşünür sözleri havuzu (Yedek/Statik havuz)
CREATE TABLE IF NOT EXISTS quotes_pool (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote TEXT NOT NULL,
    author TEXT NOT NULL,
    book_title TEXT,
    category TEXT NOT NULL, -- 'kitap' veya 'filozof'
    is_used INTEGER DEFAULT 0
);

-- Örnek başlangıç sözleri (Dilerseniz sonradan ekleme yapabilirsiniz)
INSERT OR IGNORE INTO quotes_pool (quote, author, book_title, category) VALUES 
('Sorgulanmamış bir hayat yaşanmaya değmez.', 'Sokrates', 'Savunma', 'filozof'),
('Düşünüyorum, öyleyse varım.', 'René Descartes', 'Yöntem Üzerine Konuşma', 'filozof'),
('Bildiğim tek şey, hiçbir şey bilmediğimdir.', 'Sokrates', NULL, 'filozof'),
('Bütün mutlu aileler birbirine benzer; her mutsuz ailenin ise kendine özgü bir mutsuzluğu vardır.', 'Lev Tolstoy', 'Anna Karenina', 'kitap'),
('İnsan ruhunun bir parçasını bir kitapta bulduğunda artık eskisi gibi olamaz.', 'Stefan Zweig', 'Bilinmeyen Bir Kadının Mektubu', 'kitap');
