# انتشار نسخهٔ ۲ مهسا

سورس این انتشار، ریشهٔ پروژهٔ مستقل `mahsa-website-final` و طراحی فعلی «Fluorescence Lab» است. هدف Git، `Mahsanejad/My_website` و هدف Vercel، پروژهٔ موجود `mahsa7/mahsa-portfolio` است. نسخهٔ قدیمی در `_archive/` سابقهٔ محلی است و در build یا upload وارد نمی‌شود. رسید نگه‌داری بایت‌های منبع نسخهٔ اولیه در `_archive/design-v1-2026-11-14/docs/source-preservation.json` در Git باقی می‌ماند.

## وضعیت انتشار تأییدشده

نسخهٔ ۲ در [دامنهٔ اصلی مهسا](https://mahsa-portfolio-five.vercel.app) عمومی و بدون نیاز به ورود در دسترس است. سورس commit `09d954d9b1c1a149f864646e9831925889a35d0c` روی `main` در [Mahsanejad/My_website](https://github.com/Mahsanejad/My_website) قرار دارد. Production deployment به شناسهٔ `dpl_3mtKYVGT2JbVu1xDA5jioyiVTpi4` در همان پروژهٔ `mahsa7/mahsa-portfolio` با وضعیت Ready و منبع `cli` منتشر شده و `githubCommitSha` آن با همین commit برابر است. [آدرس مستقل deployment](https://mahsa-portfolio-gyyyyqde4-mahsa7.vercel.app) نیز تأیید شده است.

نصب و `npm run check` شامل ۴۲ آزمون روی Vercel موفق بودند. ۳۳ بررسی HTTP عمومی شامل ریشه و ۲۴ صفحهٔ HTML، JavaScript و دو chunk، دو PDF با بایت‌های برابر سورس و سه 404 مورد انتظار موفق شدند. مرورگر نیز EN/DE، دو نور، Portfolio/Laboratory و CV را بدون نیاز به ورود یا خطای console بررسی کرد. شناسهٔ پروژهٔ حفظ‌شده `prj_UUGMxPFO3avQON81H1kniDYbwbbQ` است.

انتشار خودکار Git هنوز تأیید نشده است. GitHub Login حساب `Mahsanejad` در Vercel مهسا متصل شده، اما اتصال مخزن هنوز به نصب GitHub App مربوط به Vercel نیاز دارد. پس از نصب و اتصال مخزن، deployment ناشی از push باید مشاهده شود. انتشار فعلی CLI است.

## تنظیمات build

| تنظیم | مقدار |
|---|---|
| Framework Preset | Other (`framework: null`) |
| Root Directory | ریشهٔ مخزن؛ خالی یا `.` |
| Node.js | `24.x`؛ حداقل محلی 24.13.0 و کمتر از 25 |
| Install Command | `npm ci --include=dev` |
| Build Command | `npm run check` |
| Output Directory | `dist` |
| Production Branch | `main` |

دستورهای نصب و build و خروجی در `vercel.json` ثبت شده‌اند. نسخهٔ Node در `package.json` محدود شده و باید با تنظیم پروژه هم‌خوان باشد؛ Vercel نسخه‌های minor/patch همان شاخه را مدیریت می‌کند. این build به متغیر محیطی محرمانه، سرور دائمی، Python، مرورگر یا فونت سیستمی نیاز ندارد. وابستگی‌های توسعه نیز نصب می‌شوند، چون `tsc` و `esbuild` جزو زنجیرهٔ بررسی و ساخت‌اند.

`npm run check` به‌ترتیب مدل مشتق‌شده را تولید می‌کند، typecheck و آزمون‌ها و بررسی پوشش/مرز محتوا را اجرا می‌کند، سپس صفحات استاتیک را در `dist` می‌سازد. هر خطای این زنجیره build را متوقف می‌کند. `npm run preview` فقط سرور بررسی محلی است و روی Vercel اجرا نمی‌شود.

## انتشار خودکار با Git

برای تکمیل این مسیر، [GitHub App مربوط به Vercel](https://github.com/apps/vercel) باید روی حساب `Mahsanejad` با دسترسی به `My_website` نصب شود؛ ورود GitHub به Vercel قبلاً متصل شده است. سپس پروژه باید به مخزن `Mahsanejad/My_website` متصل و Branch Tracking محیط Production برابر `main` باشد. پس از برقرار بودن این اتصال، push به `main` خودکار build و Production deployment ایجاد می‌کند؛ سایر شاخه‌ها Preview می‌گیرند. این رفتار باید با یک push و مشاهدهٔ deployment متناظر اثبات شود. انتشار نسخهٔ تازه پس از موفقیت build انجام می‌شود. GitHub Actions، توکن داخل مخزن یا مرحلهٔ تأیید دستی برای pushهای بعدی این مسیر لازم نیست.

برای به‌روزرسانی، فایل‌های سورس یا دو JSON اصلی `content/mahsa-cv.{en,de}.json` را ویرایش، بررسی محلی را اجرا و commit را به شاخهٔ مربوط push کنید. سایت از JSON در زمان build ساخته می‌شود؛ ذخیرهٔ محلی فایل به‌تنهایی سایت را تغییر نمی‌دهد.

## مسیرها و cache

build برای `/en/`، `/de/`، CV، ایستگاه‌های Laboratory و تک‌تک پروژه‌ها فایل `index.html` مستقل تولید می‌کند. لینک مستقیم، refresh و Back/Forward به rewrite فراگیر نیاز ندارند. `trailingSlash: true` با همین مسیرها هماهنگ است؛ فایل‌هایی مثل PDF و CSS پسوند خود را حفظ می‌کنند. مسیر ناموجود باید پاسخ 404 با `dist/404.html` بگیرد.

HTML و فایل‌هایی با نام ثابت، از جمله `app.js`، CSS، فونت، عکس و PDF، با `max-age=0, must-revalidate` بازاعتبارسنجی می‌شوند تا انتشار تازه پشت cache مرورگر نماند. فقط chunkهای زیر `/assets/chunks/` که نامشان hash محتوا دارد cache طولانی و `immutable` دارند.

## PDF و حفظ بایت‌های منبع

دو PDF معتبر در `public/cv/` و مهر آن‌ها در `content/cv-pdf-artifacts.json` جزو سورس انتشارند. build فایل PDF را فقط وقتی منتشر می‌کند که hash فایل و fingerprint محتوا، قالب CV، عکس و فونت با مهر برابر باشند. build خود PDF نمی‌سازد؛ در صورت قدیمی شدن PDF، فقط دانلود آن زبان حذف می‌شود و HTML/چاپ CV به‌روز باقی می‌ماند.

بعد از تغییر محتوای CV، قالب، عکس یا فونت، PDF را محلی با `npm run cv:pdf` بسازید، `npm run cv:verify` را اجرا کنید، همهٔ صفحه‌ها را ببینید و سپس با `npm run cv:stamp` مهر بزنید. PDFهای `public/cv/` و مهر محتوایی تازه را با تغییرات سورس commit کنید. گزارش تأیید `docs/evidence/pdf/verification.json` حفظ می‌شود؛ `output/` خروجی محلی است.

دو JSON اصلی از ابتدا CRLF و قالب‌های `src/cv.ts` و `src/cv.css` LF دارند. `.gitattributes` این چهار فایل را بدون تبدیل پایان خط نگه می‌دارد و دارایی‌های باینری نیز تبدیل نمی‌شوند؛ بنابراین checkout روی Linux مهر معتبر Windows را صرفاً به دلیل پایان خط باطل نمی‌کند. JSONها، عکس، فونت‌ها، مجوزها و PDFها در این آماده‌سازی بازنویسی نمی‌شوند.

## فایل‌های محلی و حساب‌ها

`.gitignore` و `.vercelignore` وابستگی‌های نصب‌شده، `dist/`، `output/`، آرشیو طراحی، bundleهای تحویل، screenshotها و فایل‌های authentication را کنار می‌گذارند. `content/`، `scripts/`، `tests/`، `public/`، مجوز فونت‌ها و رسیدهای PDF باقی می‌مانند؛ `src/content/generated.ts` در build از دو JSON معتبر دوباره ساخته می‌شود. هیچ ignore کلی برای `docs/`، `*.json` یا `*.pdf` وجود ندارد.

احراز هویت GitHub و Vercel بیرون مخزن و مختص حساب مهسا نگه‌داری می‌شود. پیش از هر push یا تغییر تنظیمات انتشار، هویت واقعی و نام دقیق مخزن، owner/project و محیط هدف بررسی می‌شود. وجود session حساب دیگر یا فایل `.vercel/project.json` به‌تنهایی اثبات هدف نیست؛ تنظیمات Git سراسری و sessionهای موجود حساب‌های دیگر تغییر نمی‌کنند.

## بررسی انتشار

پس از deployment موفق، commit متناظر و وضعیت Ready را در همان پروژه بررسی کنید. روی دامنهٔ اصلی، `/en/` و `/de/`، یک مسیر عمیق Laboratory، یک پروژه، هر دو CV، هر دو دانلود PDF، یک asset و یک مسیر ساختگی 404 را بررسی کنید. نسخهٔ Node و نتیجهٔ `npm run check` باید در build log همان deployment دیده شوند.

مبنای رفتار Vercel: [پیکربندی استاتیک](https://vercel.com/docs/project-configuration/vercel-json)، [نسخه‌های Node](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)، [انتشار از Git](https://vercel.com/docs/git)، [فایل‌های مستثنا از upload](https://vercel.com/docs/deployments/vercel-ignore).
