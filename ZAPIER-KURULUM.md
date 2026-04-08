# Zapier Webhook Entegrasyonu - Kurulum Rehberi

Bu dokuman, Coachify Mentor Payment Panel ile Zapier entegrasyonunu kurmak icin hazirlanmistir.

---

## Gerekli Bilgiler

| Bilgi | Deger |
|-------|-------|
| API Key | `coachify_zapier_secret_key_2026` |
| Panel URL | `https://<panel-domain>` (deploy edildikten sonra guncellenecek) |
| Auth Header | `x-api-key` |

**Local test icin URL**: `http://localhost:3000`

---

## 1. Zap: Yeni Ogrenci Kaydi

### Trigger
- **App**: Tally
- **Event**: New Submission
- **Form**: Coachify kayit formu

### Action
- **App**: Webhooks by Zapier
- **Event**: Custom Request
- **Method**: POST
- **URL**: `https://<panel-domain>/api/webhooks/zapier/register`
- **Headers**:
  ```
  Content-Type: application/json
  x-api-key: coachify_zapier_secret_key_2026
  ```
- **Body** (JSON - Tally field'larini map'le):
  ```json
  {
    "name": "{{tally_ad_soyad}}",
    "email": "{{tally_email}}",
    "phone": "{{tally_telefon}}",
    "school": "{{tally_okul}}",
    "grade": "{{tally_sinif}}",
    "startDate": "{{tally_baslangic_tarihi}}",
    "mentorEmail": "{{tally_mentor_email}}",
    "packageDuration": 4,
    "purchaseDate": "{{tally_odeme_tarihi}}"
  }
  ```

### Zorunlu alanlar
- `name` - Ogrenci adi
- `email` - Ogrenci e-posta (unique)
- `phone` - Telefon numarasi
- `school` - Okul adi
- `grade` - Sinif
- `startDate` - Baslangic tarihi (YYYY-MM-DD formatinda)
- `mentorEmail` - Mentor e-posta (DB'de kayitli olmali)

### Opsiyonel alanlar
- `packageDuration` - Paket suresi (hafta, default: 4)
- `purchaseDate` - Odeme tarihi (default: bugun)
- `membershipStartDate` - Uyelik baslangic tarihi (default: startDate)

### Basarili response (201)
```json
{
  "success": true,
  "message": "Student registered successfully",
  "data": {
    "studentId": "uuid",
    "name": "Ahmet Yilmaz",
    "email": "ahmet@email.com",
    "mentorId": "uuid",
    "mentorName": "Efe"
  }
}
```

### Hata responselari
| Status | Anlami |
|--------|--------|
| 401 | API key gecersiz veya eksik |
| 400 | Zorunlu alan eksik |
| 404 | Mentor bulunamadi (email DB'de yok) |
| 409 | Bu email ile ogrenci zaten var |

---

## 2. Zap: Uyelik Yenileme

### Trigger
- **App**: Tally
- **Event**: New Submission
- **Form**: Coachify yenileme formu

### Action
- **App**: Webhooks by Zapier
- **Event**: Custom Request
- **Method**: POST
- **URL**: `https://<panel-domain>/api/webhooks/zapier/renew`
- **Headers**:
  ```
  Content-Type: application/json
  x-api-key: coachify_zapier_secret_key_2026
  ```
- **Body** (JSON):
  ```json
  {
    "email": "{{tally_email}}",
    "newStartDate": "{{tally_yeni_baslangic}}",
    "mentorEmail": "{{tally_mentor_email}}",
    "newPackageDuration": 4,
    "renewalDate": "{{tally_yenileme_tarihi}}"
  }
  ```

### Zorunlu alanlar
- `email` - Mevcut ogrencinin e-posta adresi (bulmak icin)
- `newStartDate` - Yeni donem baslangic tarihi (YYYY-MM-DD)

### Opsiyonel alanlar
- `mentorEmail` - Yeni mentor email (bos ise mevcut mentor devam)
- `newPackageDuration` - Yeni paket suresi (bos ise eski devam)
- `renewalDate` - Yenileme odeme tarihi (default: bugun)

### Basarili response (200)
```json
{
  "success": true,
  "message": "Membership renewed successfully",
  "data": {
    "studentId": "uuid",
    "name": "Ahmet Yilmaz",
    "email": "ahmet@email.com",
    "newStartDate": "2026-09-01",
    "mentorName": "Efe"
  }
}
```

---

## 3. Zap: CRM Veri Sorgulama (Hatirlatma)

Bu Zap, her gun calisir ve uyeligi yaklasan ogrencileri bulur. Sonuc CRM'e gonderilir.

### Trigger
- **App**: Schedule by Zapier
- **Event**: Every Day
- **Saat**: 17:00

### Action
- **App**: Webhooks by Zapier
- **Event**: Custom Request
- **Method**: POST
- **URL**: `https://<panel-domain>/api/webhooks/zapier/query`
- **Headers**:
  ```
  Content-Type: application/json
  x-api-key: coachify_zapier_secret_key_2026
  ```
- **Body** (JSON):
  ```json
  {
    "query": "expiring_soon",
    "filters": { "daysAhead": 7 }
  }
  ```

### Desteklenen sorgu turleri

#### expiring_soon - Bitimine X gun kalanlar
```json
{ "query": "expiring_soon", "filters": { "daysAhead": 7 } }
```
Response'da `daysUntilExpiry` ve `phone` alanlari vardir. CRM hatirlatma icin kullanilir.

#### by_email - Email ile bulma
```json
{ "query": "by_email", "filters": { "emails": ["a@email.com", "b@email.com"] } }
```

#### all_active - Tum aktif ogrenciler
```json
{ "query": "all_active", "filters": { "limit": 100, "offset": 0 } }
```

### Basarili response (200)
```json
{
  "success": true,
  "query": "expiring_soon",
  "count": 3,
  "data": [
    {
      "name": "Ahmet Yilmaz",
      "email": "ahmet@email.com",
      "phone": "05351234567",
      "school": "Galatasaray Lisesi",
      "grade": "11. Sinif",
      "status": "active",
      "startDate": "2026-03-15",
      "endDate": "2026-04-12",
      "daysUntilExpiry": 3,
      "currentMentor": "Efe",
      "mentorEmail": "efe@coachify.com",
      "packageDuration": 4
    }
  ]
}
```

---

## Onemli Notlar

1. **Mentorlar onceden olusturulmali**: Register endpoint'i `mentorEmail` ile mentor ariyor. DB'de olmayan mentor icin 404 doner. Once admin panelinden tum mentorlari ekleyin.

2. **Tarih formati**: Tum tarihler `YYYY-MM-DD` formatinda olmalidir (ornek: `2026-05-01`).

3. **Duplicate onleme**: Ayni email ile ikinci kayit denemesi 409 doner.

4. **Google Sheets**: Panel opsiyonel olarak Sheets'e de yazar. Su an kapali. Acmak icin `.env`'de:
   ```
   GOOGLE_SHEETS_ENABLED=true
   GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@xxx.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_SHEETS_ID=spreadsheet-id
   ```

5. **API Key degistirme**: `.env` dosyasindaki `ZAPIER_API_KEY` degerini degistirebilirsiniz. Yeni degeri tum Zap'lerde guncellemeyi unutmayin.

---

## Test Etmek Icin

Local'de `npm run dev` calistirip asagidaki curl komutlariyla test edebilirsiniz:

```bash
# Aktif ogrencileri sorgula
curl -X POST http://localhost:3000/api/webhooks/zapier/query \
  -H "x-api-key: coachify_zapier_secret_key_2026" \
  -H "Content-Type: application/json" \
  -d '{"query":"all_active"}'

# Yeni ogrenci kaydet
curl -X POST http://localhost:3000/api/webhooks/zapier/register \
  -H "x-api-key: coachify_zapier_secret_key_2026" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Ogrenci","email":"test@test.com","phone":"05351234567","school":"Test Okul","grade":"11","startDate":"2026-05-01","mentorEmail":"mentor@coachify.com"}'

# Uyelik yenile
curl -X POST http://localhost:3000/api/webhooks/zapier/renew \
  -H "x-api-key: coachify_zapier_secret_key_2026" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","newStartDate":"2026-09-01"}'
```
