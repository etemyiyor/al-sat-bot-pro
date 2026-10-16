# AL-SAT BOT PRO — hesap API kurulumu

Bu klasör Cloudflare Workers + D1 üzerinde çalışan kullanıcı API'sini içerir. Ön yüz varsayılan olarak bu API'ye bağlı değildir; önce aşağıdaki kurulum tamamlanmalıdır.

## 1. Gerekenler
- Cloudflare hesabı
- Node.js ve Wrangler CLI (npm install -g wrangler)
- HTTPS ile yayınlanmış ön yüz adresi

## 2. D1 veritabanı oluştur
```sh
cd backend
npx wrangler login
npx wrangler d1 create al-sat-bot-pro
```
Komutun verdiği database_id değerini wrangler.toml içindeki REPLACE_WITH_YOUR_D1_DATABASE_ID alanına yaz. Ardından:
```sh
npx wrangler d1 execute al-sat-bot-pro --remote --file=./schema.sql
```

## 3. Güvenlik secret'ı ve CORS
En az 32 karakterli rastgele secret oluşturup Worker secret olarak ekle:
```sh
npx wrangler secret put AUTH_SECRET
```
Cloudflare Worker ayarlarında ALLOWED_ORIGINS değişkenini yalnızca gerçek ön yüz origin'i ile ayarla. Örnek: https://example.com. Gereksiz wildcard kullanma.

## 4. Yayınla
```sh
npx wrangler deploy
```
Yayımlanan Worker adresinde /health uç noktasını kontrol et.

## 5. Ön yüze API adresini gir
Uygulamada Hesap bölümünü aç; Hesap API bağlantısı alanına Worker'ın HTTPS adresini gir ve test et. Ardından kayıt ve giriş denenebilir.

## 6. İlk yönetici
Normal kayıtlar daima user rolüyle oluşturulur. Kendi hesabını oluşturduktan sonra, yalnızca veritabanı sahibinin erişebildiği kontrollü ortamda şu sorguyu çalıştır:
```sql
UPDATE users SET role='admin' WHERE email='senin-kontrol-ettigin-adres@example.com';
```
Örnek adresi kendi hesabınla değiştir. Yönetici paneline erişmeden önce yeniden giriş yap.

## Güvenlik notları
- Gerçek exchange emirleri bu API tarafından gönderilmez.
- AUTH_SECRET veya borsa API anahtarlarını istemci tarafına koyma.
- E-posta doğrulama, parola sıfırlama, hız sınırlama, izleme ve yedekleme üretim yayını öncesinde ayrıca tamamlanmalıdır.
- API, veritabanı ve secret kurulmadan kullanıcı kayıtlarını çalıştırmaz.