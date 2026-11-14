# وب‌سایت مهسا نژادحسین — نسخهٔ بازطراحی‌شده (Fluorescence Lab)

این پوشه سورس مستقل نسخهٔ ۲ وب‌سایت است: یک آزمایشگاه کوچکِ زنده که هر بخش آن یک دستگاه است و همهٔ اطلاعات از JSON معتبر CV خوانده می‌شود. طراحی قبلی دست‌نخورده در پوشهٔ محلی `_archive/design-v1-2026-11-14/` نگه داشته شده است؛ فقط رسید `docs/source-preservation.json` آن در Git نگه‌داری می‌شود و طراحی قبلی وارد build یا انتشار نمی‌شود.

## اجرا

نیاز: Node.js شاخهٔ 24، حداقل نسخهٔ 24.13.0، و npm. اسکریپت‌های TypeScript مستقیماً با Node اجرا می‌شوند. وابستگی‌ها را از lockfile نصب کنید؛ `node_modules` بین Windows و Linux منتقل نمی‌شود.

```powershell
cd D:\mahsa-website-final
npm ci --include=dev
npm run dev       # http://127.0.0.1:4317  (با هر تغییر دوباره build می‌شود؛ صفحه را refresh کنید)
npm run check     # typecheck + آزمون‌ها + پوشش و مرز محتوا + build
npm run preview   # سرو کردن خروجی dist
```

اگر پورت 4317 مشغول باشد (مثلاً preview قدیمی هنوز باز است)، سرور خودش پورت آزاد بعدی را برمی‌دارد و آدرس درست را چاپ می‌کند. پورت دلخواه: `npm run dev -- --port=4320`. خروجی قابل انتشار فقط پوشهٔ `dist` است.

## انتشار و به‌روزرسانی خودکار

با درخواست صریح کاربر، مقصد جاری انتشار حساب‌های رامین است: مخزن خصوصی [Raminyazdani/mahsa-website](https://github.com/Raminyazdani/mahsa-website) ایجاد شده و پروژهٔ مورد درخواست `mahsa-website` در تیم Vercel با scope `ramin-yazdanis-projects` است. وب‌سایت و محتوای آن همچنان متعلق به مهسا است. تنظیمات build: Node `24.x`، Root Directory ریشهٔ مخزن، نصب با `npm ci --include=dev`، بررسی و ساخت با `npm run check` و انتشار فقط `dist`.

ایجاد پروژهٔ جدید Vercel، اتصال Git و Ready شدن انتشار آن هنوز در این checkpoint تأیید نشده‌اند. هدف این است که push به `main` پس از build موفق خودکار سایت را به‌روز کند؛ این مسیر باید با deployment متناظر یک push اثبات شود. تغییر JSON نیز به rebuild و deployment موفق نیاز دارد. وضعیت و شواهد در [راهنمای انتشار](docs/deployment.fa.md) ثبت می‌شوند.

تاریخچه: نسخهٔ ۲ قبلاً با CLI در حساب مهسا روی [mahsa-portfolio-five.vercel.app](https://mahsa-portfolio-five.vercel.app) منتشر شد. مخزن `Mahsanejad/My_website` و پروژهٔ `mahsa7/mahsa-portfolio` همان وضعیت قبلی را حفظ می‌کنند؛ مقصد جاری تغییرات بعدی حساب‌های رامین است.

## مسیرها

| مسیر | محتوا |
|---|---|
| `/` | انتخاب زبان: زبان ذخیره‌شده، وگرنه مرورگر آلمانی → `/de/`، بقیه → `/en/` (حالت Laboratory ذخیره‌شده هم رعایت می‌شود) |
| `/en/` ، `/de/` | حالت Portfolio (روایت با اسکرول) — بخش‌ها با `#profile`، `#methods`، `#journey`، `#projects`، `#training`، `#languages`، `#contact` |
| `/en/lab/` و `/en/lab/<station>/` | حالت Laboratory: نقشهٔ آزمایشگاه + یک ایستگاه باز؛ Back/Forward و refresh درست کار می‌کنند |
| `/en/projects/<id>/` | صفحهٔ اختصاصی هر پروژه با دستگاه مفهومی بزرگ |
| `/en/cv/` ، `/de/cv/` | CV کامل، قابل چاپ A4، مستقل از فیلترها |
| `?skill=<id>` ، `?bench=instruments` ، `#record-<id>` | لینک مستقیم به یک مهارت، نمای Group instruments یا یک رکورد مسیر |

## ساختار

```text
content/mahsa-cv.{en,de}.json   ← تنها منبع حقیقت
src/content/                    ← validation + adapter → WebsiteContent (فقط این لایه شکل خام JSON را می‌شناسد)
src/render/                     ← HTML ایستا برای هر صفحه (build-time): بخش‌ها، نقشهٔ آزمایشگاه، نشان، بارکد
src/app/                        ← رفتار سمت مرورگر: حالت‌ها، تنظیمات، کنسول، جست‌وجو، ذخیره‌ها و هر ایستگاه
src/scenes/                     ← مدل‌های علمی مفهومی (ژل، سنتز فوتولیتوگرافی) + صحنهٔ سه‌بعدی Three.js (lazy)
src/styles/                     ← سیستم بصری (توکن‌ها، کنترل‌های دستگاهی، ایستگاه‌ها، حالت‌ها، موبایل)
src/cv.ts + src/cv.css          ← CV کامل و چاپ
scripts/                        ← build، سرور، بررسی محتوا، ساخت/تأیید/مهر PDF
tests/                          ← آزمون محتوا، مسیرها، ترجیحات، مدل‌های علمی، رندر و PDF guard
```

## تغییر محتوا

فقط JSON زبان مربوط (و برای هم‌خوانی، زبان دیگر) را ویرایش کنید؛ سپس `npm run check`. افزودن/حذف/جابه‌جایی آیتم‌ها بدون تغییر کد کار می‌کند؛ تعداد مهارت، پروژه و رکورد سقف ندارد و بخش خالی خودبه‌خود حذف می‌شود. گروه یا پروژهٔ جدید ظاهر پیش‌فرض می‌گیرد؛ برای ابزار اختصاصی فقط `src/app/appearance.ts` (متادیتای ظاهر) را تغییر دهید. سایت ایستا است: تغییر JSON بعد از build دوباره در خروجی دیده می‌شود.

## PDF قابل دانلود CV

PDFها از همان HTML کامل CV و با موتور چاپ مرورگر ساخته می‌شوند. اگر محتوا، قالب CV، عکس یا فونت عوض شود، build لینک PDF قدیمی را حذف می‌کند تا دوباره ساخته شود:

```powershell
npm run cv:pdf      # Chrome یا Edge نصب‌شده را پیدا می‌کند → output/pdf/Mahsa-Nejadhossein-CV-{en,de}.pdf
                    # مسیر دستی: npm run cv:pdf -- --chrome="C:\Program Files\Google\Chrome\Application\chrome.exe"
npm run cv:verify -- --python=python   # بررسی متنی/لینک/عکس با pypdf، pdfplumber و Pillow
npm run cv:stamp    # فقط پس از verify موفق
npm run build
```

همهٔ صفحه‌های PDF را قبل از stamp ببینید.

## سیستم طراحی

سیستم بصری (رنگ‌های فلورسنت در دو نور Darkroom/Daylight، سه خانوادهٔ فونت، کنترل‌های دستگاهی، نشان آرایهٔ سنتز «M») در artifact «Mahsa · Fluorescence Lab» ثبت شده است. خلاصه و قراردادهای حرکت/تعامل: [docs/design.fa.md](docs/design.fa.md). وضعیت و محدودیت‌ها: [docs/STATE.md](docs/STATE.md).

## مجوزها

فونت‌ها: Bricolage Grotesque، Inter، Martian Mono — SIL OFL 1.1 (متن مجوز در `public/fonts`). Three.js — MIT (`dist/assets/chunks/*.LEGAL.txt`).
