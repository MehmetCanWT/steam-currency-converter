<p align="center">
  <h1 align="center">🎮 Steam Currency Converter</h1>
</p>

<p align="center">
  <strong>Steam Store and Market Price Converter for Millennium</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License"/>
  <img src="https://img.shields.io/badge/version-1.0.0-blue?style=flat-square" alt="Version"/>
  <img src="https://img.shields.io/badge/Author-MehmetCanWT-blue?style=flat-square" alt="Author"/>
</p>

---

[English](#english) | [Türkçe](#türkçe)

---

## English

**Steam Currency Converter** is a powerful plugin for the **Millennium** framework that automatically converts Steam game and market prices from USD (or other base currencies) to your preferred local currency (e.g., Turkish Lira - TRY). 

This is especially useful for regions where Steam has transitioned to USD (such as Turkey, CIS, and LATAM regions), allowing you to see the exact cost of games without doing manual math.

### ✨ Features
*   **Dynamic DOM Injection:** Processes Steam Store pages, Search results, Community Market listings, and your Shopping Cart dynamically as you scroll or filter.
*   **Intelligent Container Parsing:** Auto-detects discount blocks and original/final prices, ensuring that original and final prices are converted separately and Steam's native strikes, font colors, and styles remain fully intact.
*   **Bypass Suffix Clutter:** Automatically removes and replaces currency codes (like `$19.99 USD` becoming `₺935,80` completely in replace mode).
*   **Live Settings Configuration:** Change your settings directly inside the Millennium settings tab:
    *   **Target Currency:** Select from TRY, EUR, USD, GBP, BRL, RUB, CAD, etc.
    *   **Display Mode:** Choose between **Append** (`$9.99 (~₺468,10)`) or **Replace** (`₺468,10`).
*   **Local Caching & Offline Support:** Fetches real-time exchange rates from ExchangeRate API on startup, saves them locally (`rates_cache.json`), and automatically refreshes them every hour.
*   **Native Font & Design Integration:** Seamlessly inherits Steam client's native styling and user locale formatting (comma/dot separation).

### 🛠️ Installation
1.  Download the latest release and place the folder inside your Millennium plugins directory:
    *   **Linux:** `~/.local/share/millennium/plugins/`
    *   **Windows:** `C:\Program Files (x86)\Steam\steamapps\common\Steam\millennium\plugins\`
2.  Restart Steam.
3.  Go to Steam Settings -> Millennium -> **Plugins** -> **Currency Converter Settings** to configure your preferred currency.

---

## Türkçe

**Steam Currency Converter**, **Millennium** istemcisi için geliştirilmiş, Steam mağazasındaki ve topluluk pazarındaki dolar (USD) veya diğer para birimlerindeki fiyatları otomatik olarak belirlediğiniz yerel para birimine (örneğin Türk Lirası - TRY) dönüştüren güçlü bir eklentidir.

Özellikle Steam'in dolara geçtiği Türkiye (USD-LATAM) ve CIS gibi bölgelerdeki kullanıcıların fiyat hesaplama zahmetini ortadan kaldırır.

### ✨ Özellikler
*   **Dinamik DOM Enjeksiyonu:** Steam Mağazası sayfalarını, Arama sonuçlarını, Topluluk Pazarı listelemelerini ve Alışveriş Sepetini siz sayfayı kaydırdıkça veya filtreledikçe anında ve otomatik olarak dönüştürür.
*   **Akıllı Kapsayıcı Analizi:** İndirimli paketleri ve orijinal/indirimli fiyatları otomatik olarak ayırt eder. Böylece indirimli fiyatların üzeri çizili gri orijinal fiyatı ile büyük yeşil son fiyatı ayrı ayrı dönüştürülür ve Steam'in orijinal yazı tipleri ile tasarımları bozulmaz.
*   **Temiz Arayüz (Replace Modu):** Fiyatın yanındaki gereksiz `USD` eklerini temizler (örneğin replace modunda `$19.99 USD` ifadesini tamamen silip doğrudan `₺935,80` yazar).
*   **Ayarlar Menüsü:** Tercihlerinizi doğrudan Steam Ayarları -> Millennium menüsünden yönetin:
    *   **Hedef Para Birimi:** TRY, EUR, USD, GBP, BRL, RUB, CAD gibi popüler birimleri seçebilirsiniz.
    *   **Görüntüleme Modu:** **Append (Ekle)** (`$9.99 (~₺468,10)`) veya **Replace (Değiştir)** (`₺468,10`) modunu seçebilirsiniz.
*   **Yerel Önbellekleme:** Güncel kurları ExchangeRate API üzerinden çeker, yerel olarak kaydeder (`rates_cache.json`) ve her 1 saatte bir kurları otomatik olarak günceller.
*   **Yerel Biçimlendirme:** Kullanıcının sistem diline göre ondalık ayırıcıları (virgül/nokta) otomatik olarak ayarlar.

### 🛠️ Kurulum
1.  En son sürümü indirin ve klasörü Millennium eklenti dizinine yerleştirin:
    *   **Linux:** `~/.local/share/millennium/plugins/`
    *   **Windows:** `C:\Program Files (x86)\Steam\steamapps\common\Steam\millennium\plugins\`
2.  Steam'i yeniden başlatın.
3.  Steam Ayarları -> Millennium -> **Plugins** -> **Currency Converter** sekmesinden hedef para biriminizi ve ayarlarınızı yapılandırın.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Developed with ❤️ by **MehmetCanWT**
