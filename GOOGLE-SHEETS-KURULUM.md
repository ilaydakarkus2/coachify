# Google Sheets Entegrasyonu - Kurulum Rehberi

Bu dokuman, Coachify Mentor Payment Panel'in Google Sheets ile paralel calismasi icin gerekli kurulum adimlarini icerir.

---

## Ne yapiliyor?

Panel'e yeni ogrenci eklendiginde veya uyelik yenilendiginde, ayni veri otomatik olarak Google Sheets'e de yazilir. Boylece mevcut Sheets kullanimi bozulmadan panel devreye girer.

---

## Adim 1: Google Cloud Proje Olustur

1. [Google Cloud Console](https://console.cloud.google.com)'a giris yap
2. Sol ustte "Select a project" → **New Project**
3. Proje adi: `Coachify Panel` (veya istediginiz isim)
4. **Create** tikla

---

## Adim 2: Google Sheets API'yi Etkinlestir

1. Sol menuden **APIs & Services** → **Library**
2. Arama kutusuna **"Google Sheets API"** yaz
3. Tikla → **Enable** butonuna bas

---

## Adim 3: Service Account Olustur

1. Sol menuden **APIs & Services** → **Credentials**
2. Üstte **+ CREATE CREDENTIALS** → **Service Account**
3. Doldur:
   - Service account name: `coachify-panel-sheets`
   - Description: `Coachify Panel Google Sheets erisimi`
4. **CREATE AND CONTINUE** tikla
5. Role secimi: `Editor` (veya bos birakilabilir, sadece Sheets izni yeterli)
6. **CONTINUE** → **DONE**

---

## Adim 4: JSON Key Indir

1. Credentials sayfasinda olusturdugun service account'a tikla
2. **Keys** sekmesine git
3. **ADD KEY** → **Create new key**
4. **JSON** sec → **CREATE**
5. JSON dosyasi bilgisayarina indirilir

Bu dosyanin icinde iki kritik bilgi var:
```json
{
  "client_email": "coachify-panel-sheets@proje-adi.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
}
```

**Bu dosyayi guvenli tut!** Kimseyle paylasmayin.

---

## Adim 5: Google Sheets'te Paylasim

1. Coachify Google Sheets dosyasini ac
2. Sag ustte **Paylas** (Share) butonuna tikla
3. Service account email'ini ekle: `coachify-panel-sheets@proje-adi.iam.gserviceaccount.com`
4. Yetki: **Editor**
5. **Send** tikla

---

## Adim 6: Sheets ID'yi Bul

Google Sheets dosyasinin URL'si su formatta:
```
https://docs.google.com/spreadsheets/d/1rXlV9ETP-5KwHjKXYz_BfEgwCsYqlRA10W3xvoaagns/edit
```

`/d/` ile `/edit` arasindaki kisim Sheets ID'dir:
```
1rXlV9ETP-5KwHjKXYz_BfEgwCsYqlRA10W3xvoaagns
```

---

## Adim 7: Bilgileri .env Dosyasina Ekle

Projenin `.env` dosyasinda su alanlari guncelle:

```env
# Google Sheets Sync
GOOGLE_SHEETS_ENABLED=true
GOOGLE_SERVICE_ACCOUNT_EMAIL=coachify-panel-sheets@proje-adi.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_ID=1rXlV9ETP-5KwHjKXYz_BfEgwCsYqlRA10W3xvoaagns
```

**Not**: `GOOGLE_PRIVATE_KEY` degerini tirnak icinde, `\n` karakterleriyle birlikte oldugu gibi yapistirin.

---

## Sheets Kolon Yapisi

Panel Google Sheets'e su kolon sirasina gore yazar:

| Kolon | Baslik | Veri |
|-------|--------|------|
| A | Name | Ogrenci adi |
| B | Email | Ogrenci e-posta |
| C | Phone | Telefon |
| D | School | Okul |
| E | Grade | Sinif |
| F | Start Date | Baslangic tarihi |
| G | Package Duration | Paket suresi (hafta) |
| H | Mentor | Mentor adi |
| I | Status | Durum (active/dropped/refunded) |
| J | Membership Start | Uyelik baslangic |
| K | Last Updated | Son guncelleme tarihi |

---

## Kontrol Listesi

- [ ] Google Cloud proje olusturuldu
- [ ] Google Sheets API etkinlestirildi
- [ ] Service Account olusturuldu
- [ ] JSON key indirildi
- [ ] Service account email Sheets'te Editor olarak paylasildi
- [ ] Sheets ID bulundu
- [ ] `.env` dosyasina 4 deger girildi
- [ ] `GOOGLE_SHEETS_ENABLED=true` yapildi
- [ ] Uygulama yeniden baslatildi

---

## Test

Uygulama calisirken, admin panelinden yeni bir ogrenci ekleyin. Ardindan Google Sheets'i kontrol edin - yeni satir eklenmis olmali.

Sheets sync hata verirse uygulama loglarinda `[SHEETS]` ile baslayan hata mesajlari gorunur. HTTP response basarili doner, Sheets hatasi ana is akisini etkilemez.
