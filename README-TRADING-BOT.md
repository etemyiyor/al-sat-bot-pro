# Telegram + iPhone Al-Sat Botu MVP

Bu servis saatlik piyasa izleme, Telegram komutları ve parolalı mobil web paneli sunar. **Gerçek emir iletimi bu MVP'de uygulanmamıştır; ortam değişkenleriyle açılamaz.**

## iPhone üzerinden Render kurulumu
1. GitHub deposu `etemyiyor/al-sat-bot-pro` içinde bu dosyalar bulunur.
2. Render'da **New + → Web Service** ile bu depoyu bağla, Runtime: Python.
3. Build command: `pip install -r requirements-trading-bot.txt`
4. Start command: `uvicorn trading_bot_mvp:app --host 0.0.0.0 --port $PORT`
5. 7/24 çalışması için sürekli açık servis seç; ücretsiz planlar uykuya geçebilir. Bellekte tutulan veriler yeniden başlatmada sıfırlanır.
6. Render Environment bölümüne şu değerleri ekle:
   - `TELEGRAM_BOT_TOKEN`: @BotFather token'ı
   - `TELEGRAM_ALLOWED_USER_IDS`: kendi sayısal Telegram kullanıcı kimliğin (allowlist)
   - `PANEL_USERNAME`: kullanıcı adı
   - `PANEL_PASSWORD`: uzun ve benzersiz parola
   - `SCAN_SECONDS`: `3600`
7. Deploy sonrası HTTPS URL'yi iPhone Safari'de aç. Basic Auth ile giriş yap. Paylaş → Ana Ekrana Ekle ile simge oluşturabilirsin.
8. Telegram botuna `/start`, `/yenile`, `/piyasa` gönder.

## Komutlar
`/start`, `/help`, `/fiyat BTCUSDT`, `/analiz BTCUSDT`, `/piyasa`, `/sinyaller`, `/durum`, `/yenile`.

## Kaynaklar ve sınırlar
- Kripto: Binance herkese açık ticker + kapanmış 1 saatlik mumlar.
- BIST: Yahoo Finance chart verisi; gecikmeli/eksik olabilir, resmi gerçek zamanlı BIST veri kaynağı değildir.
- EMA12/EMA26 + RSI sinyali yalnızca bilgilendirme amaçlıdır.
- Herkese açık GitHub deposuna token, parola, `.env` veya aracı kurum kimlik bilgisi koyma.
- Telegram allowlist boşsa bot komutları reddedilir.
- Bu MVP'de gerçek emir, aracı kurum bağlantısı, kalıcı veritabanı, doğrulanmış gerçekleşmiş K/Z hesabı ve koruyucu stop emirleri yoktur. Canlı kullanımdan önce testnet/sanal test, emir mutabakatı, idempotency, stop koruması, günlük zarar limiti ve izleme eklenmelidir.
