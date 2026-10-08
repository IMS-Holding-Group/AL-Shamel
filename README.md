# الشامل

منصة ويب لبيع قطع غيار السيارات. المجلد الحالي اسمه `AL-Shamel`. التشغيل من `app.py` مع Flask وقاعدة `alshamel.db`.

## 1 ما هو المشروع

الشامل منصة عربية لعرض قطع الغيار، البحث عنها، إضافتها إلى السلة، وإتمام طلب دفع محاكى، مع لوحة لإدارة المنتجات والطلبات والموردين. وصف الملف `app.py` يحدد الموقع: عرعر، المملكة العربية السعودية.

البيانات التشغيلية تُقرأ وتُكتب عبر SQLite في `database.py` و`app.py`. ملفات `static/data/*.json` موجودة على القرص، و`app.py` لا يستوردها.

## 2 لماذا وُجد

README السابق يربط الفكرة بجمع الموردين في منصة واحدة ودعم التحول الرقمي في منطقة الحدود الشمالية. هذا النص هدف وصفي محفوظ من التوثيق السابق.

الكود الحالي ينفّذ متجراً محلياً: بحث SQL، سلة في المتصفح، طلب يُحفظ في `orders` و`order_items`، وجلسة Flask للأدوار `admin` و`customer` و`supplier` إن وُجد صف بذلك الدور.

## 3 المستخدمون

| الدور في عمود `users.role` | ما يفعله الكود |
| --- | --- |
| زائر | يتصفح `/` و`/search` و`/product/<id>` و`/checkout` دون جلسة |
| `customer` | يُنشأ من `/register`، ويدخل عبر `/admin/login` بالبريد وكلمة المرور، ثم `/customer/dashboard` و`/profile` و`/orders` |
| `admin` | نفس مسار الدخول، ثم `/admin/dashboard` وإدارة المنتجات والموردين والطلبات |
| `supplier` | الحقل موجود في الجدول. البذرة في `insert_initial_data` لا تنشئ حسابات موردين |

تناقض مع README السابق: الحسابات `alwakeel` و`alhajar` و`albaradi` و`alnasser` غير موجودة في `insert_initial_data`. البذرة تنشئ مستخدماً واحداً فقط: البريد `admin@alshamel.com` وكلمة المرور `` والدور `admin`. الدخول يطابق عمود `email` لا `username` (`admin_login`).

## 4 الميزات

موجود في الكود:

- الصفحة الرئيسية تعرض آخر المنتجات والموردين.
- بحث في `/search` بأنواع: الاسم، رقم القطعة، البراند، أو الكل، مع معاملات `vin` و`model`.
- صفحة منتج ومنتجات مشابهة من نفس `category`.
- سلة المتصفح في `static/js/main.js` بالمفتاح `gear_cart`.
- دفع عبر `POST /process_payment` ينشئ طلباً برقم `ORD-` متبوعاً بختم وقت.
- تتبع الطلب في `/track_order` و`/track_order/<order_id>`.
- إلغاء واستبدال وإرجاع عبر مسارات `/api/cancel_order` و`/api/request_replacement` و`/api/request_return` وما يتبعها.
- لوحة إدارة: إضافة وتعديل وحذف منتج ومورد، وتحديث حالة الطلب.
- إشعارات في جدول `notifications`.
- رفع صورة منتج إلى مجلد `uploads` بحد 8 ميجابايت و`secure_filename`.
- مسار `/api/cheapest_product` يرتب النتائج حسب `price`.

غير موجود في الملفات الحالية كمسار أو قالب: رفع Excel، وقالب `table.html`. README السابق يذكرهما. هذا تناقض بين التوثيق القديم والكود.

وسائل الدفع في الواجهة (تابي، تمارا، إلكتروني، عند الاستلام) تُحفظ كنص في `orders.payment_method`. لا يوجد اتصال ببوابة دفع في `requirements.txt` ولا في `app.py`.

## 5 سير العمل

```
زائر -> بحث -> تفاصيل منتج -> سلة localStorage
     -> /checkout -> POST /process_payment
     -> INSERT orders + order_items -> /thank_you/<order_id>
     -> /track_order

عميل -> /register (role=customer, كلمة مرور نص صريح)
     -> /admin/login بالبريد -> session
     -> لوحة العميل / الطلبات / الملف

مدير -> /admin/login ببريد admin@alshamel.com
     -> /admin/dashboard -> منتجات / موردين / طلبات / إشعارات
```

عند أول استيراد لـ `app.py` تُستدعى `init_database()`. إن كان جدول `users` فارغاً تُزرع البيانات من `insert_initial_data`.

## 6 أمثلة واقعية

البذرة الفعلية في `database.py` ثلاث منتجات وثلاثة موردين:

| المعرف | الاسم | المورد | السعر |
| --- | --- | --- | --- |
| prod_001 | فلتر زيت | شركة الأصيل لقطع الغيار | 45 |
| prod_002 | بطارية سيارة | مؤسسة النجاح التجارية | 350 |
| prod_003 | إطار سيارة | شركة الجودة العالمية | 280 |

مثال طلب: عميل يبحث عن «فلتر»، يفتح `prod_001`، يضيفه للسلة، يملأ الاسم والجوال والعنوان ووسيلة الدفع، فيُنشأ صف في `orders` وعناصر في `order_items`.

README السابق يسرد كتالوجاً أوسع (مكابح، زيوت، طلبات ORD-001 إلى ORD-003، وإحصاءات مبيعات 45230). هذه الأرقام غير موجودة في `insert_initial_data`. ملفات JSON تحت `static/data` قد تحتوي نسخة أقدم، والتطبيق الحالي لا يقرأها.

## 7 رحلة المستخدم

1. يفتح `http://localhost:5000/`.
2. يبحث من `/search?q=فلتر&type=name`.
3. يفتح `/product/prod_001`.
4. يضيف للسلة (تبقى في المتصفح حتى يمسحها).
5. ينتقل إلى `/checkout` ويرسل النموذج إلى `/process_payment`.
6. يرى `/thank_you/<order_id>` ثم يتابع من `/track_order`.
7. للشراء المرتبط بحساب: يسجّل من `/register` ثم يدخل من نموذج `/admin` بالبريد.

## 8 الوحدات

| الملف | الوظيفة |
| --- | --- |
| `app.py` | مسارات Flask، الجلسة، الطلبات، الإدارة |
| `database.py` | إنشاء الجداول والبذرة |
| `templates/*.html` | الصفحات |
| `static/css/main.css` و`admin.css` | التنسيق |
| `static/js/main.js` و`admin.js` | السلة ولوحة الإدارة |
| `static/fonts/` | IBM Plex Sans Arabic |
| `uploads/` | يُنشأ عند التشغيل للصور |
| `alshamel.db` | يُنشأ بجانب `database.py` |
| `static/data/*.json` | بيانات قديمة غير مربوطة بالكود الحالي |

## 9 الكيانات

الجداول في `init_database`: `users`, `suppliers`, `products`, `orders`, `order_items`, `notifications`, `replacements`, `returns`.

README السابق يذكر 5 جداول. الكود ينشئ 8. هذا تناقض، والكود هو المرجع للتشغيل.

حقول مهمة:

- `users`: username, password (نص صريح), name, email, phone, role, city.
- `products`: id نصي، part_number، vin_compatible وmodel_compatible كنص JSON، supplier يشير إلى `suppliers.name`، price، stock، image.
- `orders`: بيانات العميل، payment_method، card_number، card_name، total_amount، status الافتراضي `pending_payment`.
- `replacements` و`returns`: الحالة الافتراضية `pending`.

## 10 الصلاحيات

- مسارات التصفح والبحث والدفع العام لا تتحقق من الجلسة في المقاطع المقروءة من `index` و`search` و`process_payment`.
- `/customer/dashboard` يشترط `session['logged_in']`.
- دوال الإدارة (`add_product` وغيرها) تعتمد على وجود جلسة في الواجهة. راجع كل دالة قبل اعتبارها مغلقة: بعضها يتحقق من الجلسة وبعضها يكتب مباشرة بعد الطلب.
- الدور يُحفظ في `session['role']` بعد نجاح الدخول.

## 11 الأتمتة

- `init_database()` عند إقلاع التطبيق.
- رقم الطلب يُولَّد من الوقت.
- اسم ملف الصورة يُسبق بختم وقت.
- `create_notification` يدرج صفاً في `notifications` عند مسارات الإدارة التي تستدعيها.
- لا يوجد مجدول زمني ولا عامل خلفي. غير موجود في الملفات الحالية.

## 12 تأثير الوحدات على بعضها

- حذف منتج أو مورد من لوحة الإدارة يغيّر ما يظهر في البحث والصفحة الرئيسية.
- إنشاء طلب يكتب `orders` و`order_items` في معاملة واحدة في مسار الدفع.
- طلب الاستبدال يربط `order_items` بمنتج بديل في `replacements`، ثم مسار المعالجة يحدّث الحالة.
- السلة في المتصفح مستقلة عن قاعدة البيانات حتى لحظة الدفع.
- تغيير صورة المنتج يضع ملفاً في `uploads` ويحفظ الاسم في `products.image`.

## 13 مسرد

| المصطلح | المعنى هنا |
| --- | --- |
| VIN | نص توافق يُحفظ JSON في `vin_compatible` ويُستخدم في البحث |
| Session | كوكي Flask بعد `/admin/login` |
| محاكاة الدفع | حفظ الطلب محلياً بلا بوابة خارجية |
| gear_cart | مفتاح السلة في localStorage |

## 14 أسئلة شائعة

**ما بيانات دخول المدير؟** البريد `admin@alshamel.com` وكلمة المرور ``، بشرط أن البذرة لم تُستبدل. اسم المستخدم في الجدول `admin`، ونموذج الدخول يرسل البريد.

**لماذا لا أرى موردي README القديم؟** البذرة الحالية ثلاثة موردين مختلفين عن أسماء الوكيل الأصلي والحجر والبرادي والناصر.

**هل الدفع حقيقي؟** لا. يُحفظ الطلب محلياً.

**أين Excel؟** غير موجود في الملفات الحالية كمسار.

## 15 مخطط المعمارية ASCII

```
المتصفح
  |  HTML/CSS/JS
  v
Flask app.py :5000
  |-- render_template (templates/)
  |-- session
  |-- uploads/
  v
SQLite alshamel.db
  users suppliers products orders order_items
  notifications replacements returns

static/data/*.json  -- غير موصول --
```

## 16 التقنيات المستخدمة

- Python وFlask 2.2.5
- Jinja2 3.1.4 وWerkzeug 2.2.3
- SQLite عبر `sqlite3`
- HTML وCSS وJavaScript
- خط IBM Plex Sans Arabic محلياً في `static/fonts`
- `python-dotenv` مذكور في `requirements.txt` وغير مستورد في `app.py` أو `database.py`

## 17 شجرة الملفات

```
AL-Shamel/
├── app.py
├── database.py
├── requirements.txt
├── README.md
├── alshamel.db          (يُنشأ عند التشغيل)
├── uploads/             (يُنشأ عند التشغيل)
├── templates/
│   ├── index.html
│   ├── search.html
│   ├── product_detail.html
│   ├── checkout.html
│   ├── thank_you.html
│   ├── orders.html
│   ├── track_order.html
│   ├── register.html
│   ├── profile.html
│   ├── customer_dashboard.html
│   └── admin.html
└── static/
    ├── css/  main.css  admin.css
    ├── js/   main.js   admin.js
    ├── fonts/
    ├── images/placeholder.txt
    └── data/ products.json users.json orders.json suppliers.json
```

## 18 الواجهة الأمامية

القوالب عربية. السلة في `main.js`: إضافة وتعديل وحذف وعرض، ثم الانتقال إلى `/checkout`. تنسيق رقم البطاقة يتم في المتصفح قبل الإرسال. لوحة الإدارة في `admin.js` تستدعي مسارات `/api/admin/*` ونماذج الإضافة والتعديل.

## 19 الواجهة الخلفية

لا يوجد FastAPI. التطبيق Flask واحد.

دوال المساعدة: `dict_from_row`, `get_all_suppliers`, `get_all_products`, `get_product_by_id`, `create_notification`.

دوال المسارات: `index`, `search`, `product_detail`, `checkout`, `process_payment`, `thank_you`, `register`, `admin`, `admin_login`, `customer_dashboard`, `api_customer_info`, `api_customer_stats`, `api_customer_update`, `check_session`, `admin_logout`, `admin_dashboard`, `admin_orders`, `admin_products`, `add_product`, `update_product`, `delete_product`, `add_supplier`, `api_product`, `api_replacement_products`, `api_cheapest_product`, `cancel_order`, `update_order_status`, `request_replacement`, `request_return`, `process_replacement`, `process_return`, `get_replacements`, `get_returns`, `profile`, `api_user_orders`, `orders`, `track_order`, `api_admin_orders`, `api_admin_products`, `api_admin_suppliers`, `api_admin_stats`, `api_supplier`, `update_supplier`, `delete_supplier`, `api_admin_notifications`, `mark_notification_read`, `mark_all_notifications_read`, `uploaded_file`, `favicon`, `not_found`.

في `database.py`: `get_db_connection`, `init_database`, `insert_initial_data`.

## 20 تدفق الطلب

1. المتصفح يرسل GET أو POST إلى Flask.
2. الدالة تفتح `sqlite3.connect` على `alshamel.db`.
3. الاستعلامات تستخدم معاملات `?`.
4. الصف يتحول إلى dict عند الحاجة، وحقول JSON للتوافق تُفك بـ `json.loads`.
5. الرد إما HTML عبر `render_template` أو JSON عبر `jsonify`.
6. عند الدفع تُغلق المعاملة بـ `commit`.

## 21 قاعدة البيانات

الملف: `alshamel.db` بجانب المشروع.

| الجدول | المفتاح | علاقات |
| --- | --- | --- |
| users | id | مرجع notifications.user_id |
| suppliers | id واسم فريد | products.supplier -> suppliers.name |
| products | id نص | order_items وreplacements وreturns |
| orders | id نص | order_items, replacements, returns |
| order_items | id | order_id, product_id |
| notifications | id | user_id |
| replacements | id | order_id, order_item_id, منتج أصلي وبديل |
| returns | id | order_id, order_item_id, product_id, refund_amount |

`card_number` و`card_name` يُحفظان في `orders` كما تصل من النموذج.

## 22 نقاط النهاية

المصادقة في العمود تعني فحص الجلسة الظاهر في الدالة. «جلسة» تعني وجود `logged_in`. «عام» يعني أن المقطع المقروء لا يرفض الضيف.

| الطريقة | المسار | الغرض | المعاملات | مصادقة | الرد |
| --- | --- | --- | --- | --- | --- |
| GET | `/` | الرئيسية | - | عام | HTML |
| GET | `/search` | بحث | q, type, vin, model | عام | HTML |
| GET | `/product/<product_id>` | تفاصيل | product_id | عام | HTML |
| GET | `/checkout` | الدفع | - | عام | HTML |
| POST | `/process_payment` | حفظ الطلب | حقول النموذج وorder_data | عام | توجيه أو JSON حسب الدالة |
| GET | `/thank_you/<order_id>` | تأكيد | order_id | عام | HTML |
| GET/POST | `/register` | تسجيل عميل | name, second_name, email, phone, password | عام | HTML أو JSON |
| GET | `/admin` | نموذج الدخول | - | عام | HTML |
| POST | `/admin/login` | دخول | email, password | عام | JSON success, role, name |
| GET | `/customer/dashboard` | لوحة عميل | - | جلسة | HTML أو توجيه |
| GET | `/api/customer/info` | بيانات العميل | - | جلسة | JSON |
| GET | `/api/customer/stats` | إحصاءات العميل | - | جلسة | JSON |
| POST | `/api/customer/update` | تحديث ملف | حقول النموذج | جلسة | JSON |
| GET | `/admin/check_session` | حالة الجلسة | - | عام | JSON |
| GET | `/admin/logout` | خروج | - | عام | يمسح الجلسة |
| GET | `/admin/dashboard` | لوحة إدارة | - | جلسة | HTML |
| GET | `/admin/orders` | طلبات الإدارة | - | جلسة | HTML أو JSON حسب الدالة |
| GET | `/admin/products` | منتجات الإدارة | - | جلسة | HTML أو JSON |
| POST | `/admin/add_product` | إضافة منتج | حقول + product_image | جلسة الإدارة | JSON |
| POST | `/admin/update_product` | تعديل منتج | product_id وحقول | جلسة الإدارة | JSON |
| POST | `/admin/delete_product` | حذف منتج | product_id | جلسة الإدارة | JSON |
| POST | `/admin/add_supplier` | إضافة مورد | حقول + شعار | جلسة الإدارة | JSON |
| POST | `/admin/update_supplier` | تعديل مورد | معرف وحقول | جلسة الإدارة | JSON |
| POST | `/admin/delete_supplier` | حذف مورد | معرف | جلسة الإدارة | JSON |
| GET | `/api/product/<product_id>` | منتج JSON | product_id | عام | JSON |
| GET | `/api/replacement_products` | بدائل | استعلام بحث | عام | JSON |
| GET | `/api/cheapest_product` | الأرخص | q | عام | JSON حتى 10 |
| POST | `/api/cancel_order` | إلغاء | order_id | حسب الدالة | JSON |
| POST | `/api/update_order_status` | حالة الطلب | order_id, status | إدارة | JSON |
| POST | `/api/request_replacement` | طلب استبدال | عناصر الطلب | عميل | JSON |
| POST | `/api/request_return` | طلب إرجاع | عناصر الطلب | عميل | JSON |
| POST | `/api/process_replacement` | معالجة استبدال | معرف الحالة | إدارة | JSON |
| POST | `/api/process_return` | معالجة إرجاع | معرف الحالة | إدارة | JSON |
| GET | `/api/get_replacements` | قائمة الاستبدال | - | إدارة | JSON |
| GET | `/api/get_returns` | قائمة الإرجاع | - | إدارة | JSON |
| GET | `/profile` | الملف | - | جلسة | HTML |
| GET | `/api/user_orders` | طلبات المستخدم | - | جلسة | JSON |
| GET | `/orders` | صفحة الطلبات | - | عام أو جلسة حسب القالب | HTML |
| GET | `/track_order` و`/track_order/<order_id>` | تتبع | order_id أو نموذج | عام | HTML |
| GET | `/api/admin/orders` | كل الطلبات | - | إدارة | JSON |
| GET | `/api/admin/products` | كل المنتجات | - | إدارة | JSON |
| GET | `/api/admin/suppliers` | كل الموردين | - | إدارة | JSON |
| GET | `/api/admin/stats` | إحصاءات | - | إدارة | JSON |
| GET | `/api/supplier/<supplier_id>` | مورد | supplier_id | عام | JSON |
| GET | `/api/admin/notifications` | إشعارات | - | إدارة | JSON |
| POST | `/api/admin/mark_notification_read` | تعليم مقروء | id | إدارة | JSON |
| POST | `/api/admin/mark_all_notifications_read` | تعليم الكل | - | إدارة | JSON |
| GET | `/uploads/<filename>` | ملف مرفوع | filename | عام | ملف |
| GET | `/favicon.ico` | أيقونة | - | عام | ملف أو 204 |

معالج 404 يعيد HTML عربي.

## 23 المصادقة

`POST /admin/login` يقارن البريد وكلمة المرور كنص مطابق لعمود `password`. عند النجاح: `logged_in`, `username`, `email`, `role`, `name`.

`/register` يحفظ كلمة المرور كما كُتبت، والدور ثابت `customer`. تعليق الكود: «في الإنتاج يجب تشفير كلمة المرور».

لا JWT. لا انتهاء صلاحية موثّق غير سلوك كوكي Flask الافتراضي.

## 24 الأمان الموجود فعلياً في الكود

- استعلامات SQL بمعاملات `?`.
- `secure_filename` لصور الرفع.
- `MAX_CONTENT_LENGTH` = 8 ميجابايت.
- `secret_key` نص ثابت داخل `app.py` (لا تطبع القيمة هنا).
- كلمات المرور نص صريح في `users.password`.
- `app.run(debug=True, host='0.0.0.0', port=5000)`.
- رقم البطاقة يُخزَّن في `orders.card_number`.
- لا CSRF token ظاهر في المسارات.
- لا تقييد لمحاولات الدخول.
- مسار `/uploads/<filename>` يقدّم الملفات بلا فحص جلسة.

## 25 مفاتيح الإعداد بدون قيم

لا ملف `.env` في المشروع. `python-dotenv` غير مستخدم.

مفاتيح داخل الكود:

| المفتاح | المصدر |
| --- | --- |
| `secret_key` | ثابت في `app.py` |
| `UPLOAD_FOLDER` | مجلد `uploads` |
| `MAX_CONTENT_LENGTH` | 8 ميجابايت |
| `DB_PATH` | `alshamel.db` |

## 26 التكاملات

غير موجود في الملفات الحالية: بوابة دفع، بريد، SMS، تخزين سحابي. Font Awesome مذكور في README السابق؛ تحقق من وسوم القوالب عند التعديل. الخط المحلي IBM Plex Sans Arabic موجود كملفات ttf.

## 27 المهام المجدولة

غير موجود في الملفات الحالية. لا Procfile.

## 28 تخزين الملفات

الصور في `uploads/`. الخدمة عبر `/uploads/<filename>`. أيقونة الموقع تُبحث في `assets/images/Icon.ico`. هذا المسار غير ظاهر في شجرة الملفات الحالية، فيُرجع المسار 204 إن غاب الملف.

## 29 التسجيل

`print` عند إقلاع `app.py` و`init_database`. لا وحدة `logging`. لا جدول تدقيق مستقل. الإشعارات للمستخدم الإداري في جدول `notifications`.

## 30 التثبيت من requirements

```
pip install -r requirements.txt
python app.py
```

`app.py` يستدعي `init_database()` بنفسه. تشغيل `python database.py` يعيد التهيئة نفسها إن لزم.

ثم افتح `http://localhost:5000`.

Python: README السابق يذكر 3.10.6. لا ملف يفرض هذا الإصدار داخل المشروع. غير موثق كقيد تقني في الكود.

## 31 دليل التطوير

- عدّل المسارات في `app.py` والجداول في `database.py` معاً إذا تغيّر عمود.
- القوالب في `templates/` والسلوك في `static/js/`.
- أعد تشغيل العملية بعد تعديل Python لأن `debug=True` يعيد التحميل حسب إعداد Flask.
- لا ترفع `alshamel.db` إن كانت تحتوي طلبات حقيقية.
- تجنّب طباعة `card_number` في السجلات.

## 32 النشر

غير موجود في الملفات الحالية: Procfile وملف Heroku. التشغيل المحلي هو `python app.py` على المنفذ 5000 والعنوان `0.0.0.0` مع `debug=True`. هذا الوضع مناسب للتطوير المحلي.

## 33 النسخ الاحتياطي

انسخ `alshamel.db` ومجلد `uploads/`. ملفات JSON في `static/data` نسخة تاريخية وليست مصدر التشغيل.

استعادة: أوقف التطبيق، استبدل الملفين، شغّل من جديد.

## 34 استكشاف الأخطاء

| العرض | ما تفحصه |
| --- | --- |
| لا تدخل بحساب admin كاسم مستخدم | أدخل البريد `admin@alshamel.com` |
| موردو README القديم غير ظاهرين | البذرة الحالية أسماء مختلفة، أو القاعدة مملوءة مسبقاً فلم تُعد الزراعة |
| المنفذ مشغول | عملية أخرى على 5000 |
| الصورة لا تُرفع | حجم أكبر من 8 ميجابايت أو المجلد `uploads` غير قابل للكتابة |
| Excel | المسار غير موجود في الكود |

## 35 الاعتماديات مع الإصدارات من requirements.txt

| الحزمة | الإصدار |
| --- | --- |
| Flask | 2.2.5 |
| Werkzeug | 2.2.3 |
| Jinja2 | 3.1.4 |
| itsdangerous | 2.1.2 |
| click | 8.1.7 |
| python-dotenv | 1.0.1 |
| MarkupSafe | 2.1.2 |

## 36 القيود

- دفع وشحن محليان بلا مزود خارجي.
- كلمات مرور غير مرمّزة.
- وضع التصحيح مفعّل على كل الواجهات.
- بيانات البطاقة تُحفظ في SQLite.
- كتالوج README السابق لا يطابق بذرة `database.py`.
- ملفات JSON متبقية بلا قارئ في `app.py`.
- لا اختبارات آلية في المجلد.

## 37 الحالة الحالية

تطبيق Flask يعمل محلياً، يهيئ SQLite عند الإقلاع، ويزرع مديراً وثلاثة موردين وثلاثة منتجات إذا كانت الجداول فارغة. الواجهة تغطي المتجر والإدارة والاستبدال والإرجاع. ميزات Excel وحسابات الموردين الأربعة المذكورة قديماً غير مربوطة بهذا الكود.

## 38 قرارات المعمارية

- SQLite ملف واحد بدل JSON للتشغيل، مع إبقاء ملفات JSON على القرص.
- سلة المتصفح حتى لحظة إنشاء الطلب.
- جلسة خادم واحدة للعميل والمدير عبر نفس نموذج `/admin/login`.
- معرف المنتج نصي ومعرف المستخدم رقمي.
- المورد يُربط بالاسم النصي لا برقم id في عمود `products.supplier`.

## 39 سجل التغييرات

غير موثق. لا حقل إصدار في `requirements.txt` ولا في `app.py`. README السابق يذكر انتقالاً من JSON إلى SQLite. الكود الحالي يستخدم SQLite، وملفات JSON ما زالت في `static/data`.

## System Overview

متجر قطع غيار محلي: واجهة عربية، سلة في المتصفح، طلبات في SQLite، لوحة إدارة بالجلسة. الدفع محاكاة. حساب المدير التجريبي بالبريد `admin@alshamel.com`.

## Quick Reference

| البند | القيمة |
| --- | --- |
| التشغيل | `python app.py` |
| العنوان | `http://localhost:5000` |
| القاعدة | `alshamel.db` |
| دخول المدير | البريد `admin@alshamel.com` / `` |
| سلة | `localStorage` مفتاح `gear_cart` |
| حد الرفع | 8 ميجابايت |

## Quick Start

```
pip install -r requirements.txt
python app.py
```

افتح `http://localhost:5000`. للوحة الإدارة افتح `/admin` واستخدم بريد المدير.

## For Non-Technical Users

ابحث عن القطعة من الصفحة الرئيسية، أضفها للسلة، أكمل بيانات التوصيل، ثم تابع رقم الطلب من صفحة التتبع. الدفع هنا تجريبي ويحفظ الطلب على الجهاز الذي يشغّل البرنامج. إذا نسيت كلمة مرور المدير، الحساب التجريبي مذكور في Quick Reference ما دامت قاعدة البيانات هي البذرة الأصلية.

## For Developers

ابدأ من `app.py` للمسارات ومن `database.py` للمخطط. أي توثيق يذكر خمسة جداول أو رفع Excel أو حسابات الموردين الأربعة يخالف الملفات الحالية. عالج كلمات المرور و`debug` وعمود البطاقة قبل أي نشر. لا يوجد Procfile.
