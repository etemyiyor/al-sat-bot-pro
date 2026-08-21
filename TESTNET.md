# Binance Testnet + Risk Yönetimi

Bu dal gerçek para emri göndermez.

## Ortam değişkenleri
- `BINANCE_TESTNET_API_KEY`
- `BINANCE_TESTNET_SECRET`

Anahtarları kaynak koda veya GitHub repository dosyalarına yazmayın. Hosting sağlayıcısının Environment Variables / Secrets bölümünü kullanın.

## API
### POST `/api/order-preview`
Emri göndermeden önce nominal tutar, stop-loss, take-profit ve maksimum hesap riski kontrolünü hesaplar.

### POST `/api/testnet-order`
Sadece Binance Spot Test Network (`testnet.binance.vision`) üzerinde MARKET test emri gönderir.

Önerilen akış: piyasa verisi → order-preview → riskCheck=PASS → kullanıcı onayı → testnet-order.
