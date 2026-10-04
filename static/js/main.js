// الشامل - منصة قطع غيار السيارات
// ملف JavaScript الرئيسي للتفاعل والوظائف الديناميكية

// متغيرات عامة
let currentUser = null;
let cart = JSON.parse(localStorage.getItem('alshamel_cart')) || [];

// تهيئة الصفحة عند التحميل
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
    setupEventListeners();
    loadCartCount();
});

// تهيئة التطبيق
function initializeApp() {
    // إضافة تأثيرات الحركة للعناصر
    addScrollAnimations();

    // تهيئة النماذج
    initializeForms();

    // تهيئة الجداول
    initializeTables();

    // تحميل البيانات إذا لزم الأمر
    if (window.location.pathname.includes('admin')) {
        initializeAdmin();
    }
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
    // مستمعي النماذج
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', handleFormSubmit);
    });

    // مستمعي الأزرار
    const buttons = document.querySelectorAll('button[onclick]');
    buttons.forEach(button => {
        const onclick = button.getAttribute('onclick');
        if (onclick) {
            button.addEventListener('click', function (e) {
                e.preventDefault();
                eval(onclick);
            });
        }
    });

    // مستمعي الروابط
    const links = document.querySelectorAll('a[onclick]');
    links.forEach(link => {
        const onclick = link.getAttribute('onclick');
        if (onclick) {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                eval(onclick);
            });
        }
    });
}

// إضافة تأثيرات الحركة عند التمرير
function addScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, observerOptions);

    // مراقبة العناصر التي تحتاج تأثيرات
    const animatedElements = document.querySelectorAll('.product-card, .supplier-card, .order-card, .stat-card');
    animatedElements.forEach(el => observer.observe(el));
}

// تهيئة النماذج
function initializeForms() {
    // إضافة التحقق من صحة النماذج
    const inputs = document.querySelectorAll('input[required], select[required], textarea[required]');
    inputs.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearFieldError);
    });
}

// تهيئة الجداول
function initializeTables() {
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
        // إضافة ترقيم للصفوف
        addRowNumbers(table);

        // إضافة إمكانية الترتيب
        addSorting(table);
    });
}

// تهيئة لوحة الإدارة
function initializeAdmin() {
    // تحميل الإحصائيات
    loadAdminStats();

    // تحميل البيانات
    loadAdminData();
}

// معالجة إرسال النماذج
function handleFormSubmit(e) {
    const form = e.target;
    const formId = form.id;

    // التحقق من صحة النموذج
    if (!validateForm(form)) {
        e.preventDefault();
        return false;
    }

    // معالجة نماذج محددة
    switch (formId) {
        case 'adminLoginForm':
            handleAdminLogin(e);
            break;
        case 'addProductForm':
            handleAddProduct(e);
            break;
        case 'uploadForm':
            handleFileUpload(e);
            break;
        default:
            // السماح بإرسال النموذج العادي
            break;
    }
}

// التحقق من صحة النموذج
function validateForm(form) {
    let isValid = true;
    const requiredFields = form.querySelectorAll('[required]');

    requiredFields.forEach(field => {
        if (!validateField({ target: field })) {
            isValid = false;
        }
    });

    return isValid;
}

// التحقق من صحة حقل واحد
function validateField(e) {
    const field = e.target;
    const value = field.value.trim();
    const fieldName = field.name || field.id;

    // إزالة رسائل الخطأ السابقة
    clearFieldError(e);

    let isValid = true;
    let errorMessage = '';

    // التحقق من الحقول المطلوبة
    if (field.hasAttribute('required') && !value) {
        isValid = false;
        errorMessage = 'هذا الحقل مطلوب';
    }

    // التحقق من البريد الإلكتروني
    if (fieldName.includes('email') && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            isValid = false;
            errorMessage = 'البريد الإلكتروني غير صحيح';
        }
    }

    // التحقق من رقم الهاتف
    if (fieldName.includes('phone') && value) {
        const phoneRegex = /^[0-9+\-\s()]+$/;
        if (!phoneRegex.test(value)) {
            isValid = false;
            errorMessage = 'رقم الهاتف غير صحيح';
        }
    }

    // التحقق من الأرقام
    if (field.type === 'number' && value) {
        const num = parseFloat(value);
        if (isNaN(num) || num < 0) {
            isValid = false;
            errorMessage = 'يرجى إدخال رقم صحيح';
        }
    }

    // عرض رسالة الخطأ
    if (!isValid) {
        showFieldError(field, errorMessage);
    }

    return isValid;
}

// عرض خطأ في الحقل
function showFieldError(field, message) {
    field.classList.add('error');

    // إنشاء عنصر رسالة الخطأ
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    errorDiv.style.color = 'var(--error-color)';
    errorDiv.style.fontSize = 'var(--font-size-sm)';
    errorDiv.style.marginTop = '0.25rem';

    // إدراج رسالة الخطأ بعد الحقل
    field.parentNode.insertBefore(errorDiv, field.nextSibling);
}

// مسح خطأ الحقل
function clearFieldError(e) {
    const field = e.target;
    field.classList.remove('error');

    const errorDiv = field.parentNode.querySelector('.field-error');
    if (errorDiv) {
        errorDiv.remove();
    }
}

// معالجة تسجيل دخول الإدارة
function handleAdminLogin(e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);

    // إظهار مؤشر التحميل
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري تسجيل الدخول...';
    submitBtn.disabled = true;

    // إرسال طلب تسجيل الدخول
    fetch('/admin/login', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentUser = data;
                showAdminDashboard();
                showNotification('تم تسجيل الدخول بنجاح', 'success');
            } else {
                showNotification(data.message || 'خطأ في تسجيل الدخول', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('حدث خطأ في الاتصال', 'error');
        })
        .finally(() => {
            // إعادة تعيين الزر
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        });
}

// إظهار لوحة الإدارة
function showAdminDashboard() {
    document.querySelector('.admin-login-container').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'block';

    // تحميل البيانات
    loadAdminStats();
    loadAdminData();
}

// تسجيل الخروج
function logout() {
    currentUser = null;
    document.querySelector('.admin-login-container').style.display = 'block';
    document.getElementById('adminDashboard').style.display = 'none';
    showNotification('تم تسجيل الخروج بنجاح', 'success');
}

// تحميل إحصائيات الإدارة
function loadAdminStats() {
    fetch('/admin/dashboard')
        .then(response => response.text())
        .then(html => {
            // استخراج الإحصائيات من HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const stats = {
                totalOrders: doc.querySelector('#totalOrders')?.textContent || '0',
                totalProducts: doc.querySelector('#totalProducts')?.textContent || '0',
                totalSuppliers: doc.querySelector('#totalSuppliers')?.textContent || '0',
                pendingOrders: doc.querySelector('#pendingOrders')?.textContent || '0'
            };

            // تحديث الإحصائيات في الصفحة
            Object.keys(stats).forEach(key => {
                const element = document.getElementById(key);
                if (element) {
                    element.textContent = stats[key];
                }
            });
        })
        .catch(error => {
            console.error('Error loading admin stats:', error);
        });
}

// تحميل بيانات الإدارة
function loadAdminData() {
    // تحميل الطلبات
    loadOrders();

    // تحميل المنتجات
    loadProducts();

    // تحميل الموردين
    loadSuppliers();
}

// تحميل الطلبات
function loadOrders() {
    fetch('/admin/orders')
        .then(response => response.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const ordersList = doc.querySelector('.orders-list');

            if (ordersList) {
                document.getElementById('ordersList').innerHTML = ordersList.innerHTML;
            }
        })
        .catch(error => {
            console.error('Error loading orders:', error);
        });
}

// تحميل المنتجات
function loadProducts() {
    fetch('/admin/products')
        .then(response => response.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const productsList = doc.querySelector('.products-list');

            if (productsList) {
                document.getElementById('productsList').innerHTML = productsList.innerHTML;
            }
        })
        .catch(error => {
            console.error('Error loading products:', error);
        });
}

// تحميل الموردين
function loadSuppliers() {
    // يمكن إضافة منطق تحميل الموردين هنا
}

// معالجة إضافة منتج
function handleAddProduct(e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);

    // إظهار مؤشر التحميل
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الإضافة...';
    submitBtn.disabled = true;

    // إرسال طلب إضافة المنتج
    fetch('/admin/add_product', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('تم إضافة المنتج بنجاح', 'success');
                closeAddProductModal();
                form.reset();
                loadProducts(); // إعادة تحميل قائمة المنتجات
            } else {
                showNotification(data.message || 'خطأ في إضافة المنتج', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('حدث خطأ في الاتصال', 'error');
        })
        .finally(() => {
            // إعادة تعيين الزر
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        });
}

// معالجة رفع الملفات
function handleFileUpload(e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);
    const fileInput = form.querySelector('input[type="file"]');

    if (!fileInput.files[0]) {
        showNotification('يرجى اختيار ملف', 'error');
        return;
    }

    // إظهار مؤشر التحميل
    showLoadingSection();

    // إرسال الملف
    fetch('/upload_excel', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            hideLoadingSection();

            if (data.success) {
                showResultsSection(data);
                showNotification('تم رفع الملف بنجاح', 'success');
            } else {
                showErrorSection(data.message);
            }
        })
        .catch(error => {
            hideLoadingSection();
            console.error('Error:', error);
            showErrorSection('حدث خطأ في رفع الملف');
        });
}

// إظهار قسم التحميل
function showLoadingSection() {
    document.getElementById('loadingSection').style.display = 'block';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('errorSection').style.display = 'none';
}

// إخفاء قسم التحميل
function hideLoadingSection() {
    document.getElementById('loadingSection').style.display = 'none';
}

// إظهار قسم النتائج
function showResultsSection(data) {
    const resultsSection = document.getElementById('resultsSection');
    const fileInfo = document.getElementById('fileInfo');
    const tableContainer = document.getElementById('excelTableContainer');

    fileInfo.textContent = `تم تحميل ${data.rows} صف و ${data.columns} عمود`;
    tableContainer.innerHTML = data.html;

    resultsSection.style.display = 'block';
    document.getElementById('errorSection').style.display = 'none';
}

// إظهار قسم الخطأ
function showErrorSection(message) {
    const errorSection = document.getElementById('errorSection');
    const errorMessage = document.getElementById('errorMessage');

    errorMessage.textContent = message;
    errorSection.style.display = 'block';
    document.getElementById('resultsSection').style.display = 'none';
}

// إعادة تعيين رفع الملف
function resetUpload() {
    document.getElementById('uploadForm').reset();
    document.getElementById('loadingSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('errorSection').style.display = 'none';
}

// تحميل الجدول
function downloadTable() {
    const table = document.querySelector('#excelTableContainer table');
    if (!table) {
        showNotification('لا يوجد جدول للتحميل', 'error');
        return;
    }

    // تحويل الجدول إلى CSV
    const csv = tableToCSV(table);

    // تحميل الملف
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'alshamel_table.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// تحويل الجدول إلى CSV
function tableToCSV(table) {
    const rows = table.querySelectorAll('tr');
    const csv = [];

    rows.forEach(row => {
        const cols = row.querySelectorAll('th, td');
        const rowData = [];

        cols.forEach(col => {
            rowData.push('"' + col.textContent.replace(/"/g, '""') + '"');
        });

        csv.push(rowData.join(','));
    });

    return csv.join('\n');
}

// البحث عن أرخص منتج
function searchCheapest(e) {
    e.preventDefault();

    const input = document.getElementById('cheapest-search-input');
    const query = input.value.trim();

    if (!query) {
        showNotification('يرجى إدخال كلمة البحث', 'error');
        return;
    }

    const resultsDiv = document.getElementById('cheapest-results');
    resultsDiv.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> جاري البحث...</div>';

    fetch(`/api/cheapest_product?q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayCheapestResults(data);
            } else {
                resultsDiv.innerHTML = `<div class="no-results"><p>${data.message}</p></div>`;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            resultsDiv.innerHTML = '<div class="no-results"><p>حدث خطأ في البحث</p></div>';
        });
}

// عرض نتائج البحث عن أرخص منتج
function displayCheapestResults(data) {
    const resultsDiv = document.getElementById('cheapest-results');

    if (data.products.length === 0) {
        resultsDiv.innerHTML = '<div class="no-results"><p>لم يتم العثور على منتجات</p></div>';
        return;
    }

    let html = `<div class="cheapest-summary">
        <h4>تم العثور على ${data.total_found} منتج</h4>
    </div>`;

    data.products.forEach(item => {
        const product = item.product;
        const supplier = item.supplier;

        html += `
        <div class="cheapest-product">
            <div class="product-header">
                <h4>${product.name}</h4>
                <span class="best-price">أرخص سعر: ${product.price} ريال</span>
            </div>
            <div class="product-details">
                <p><strong>رقم القطعة:</strong> ${product.part_number}</p>
                <p><strong>المورد:</strong> ${product.supplier}</p>
                <p><strong>النوع:</strong> ${product.type}</p>
                <p><strong>المخزون:</strong> ${product.stock} قطعة</p>
            </div>
            <div class="price-range">
                <span>نطاق الأسعار: ${item.price_range.min} - ${item.price_range.max} ريال</span>
                ${item.alternatives > 0 ? `<span class="alternatives">(${item.alternatives} بدائل أخرى)</span>` : ''}
            </div>
            <div class="product-actions">
                <button class="btn btn-primary" onclick="viewProduct('${product.id}')">
                    <i class="fa-solid fa-eye"></i>
                    عرض التفاصيل
                </button>
                <button class="btn btn-secondary" onclick="addToCart('${product.id}')">
                    <i class="fa-solid fa-cart-plus"></i>
                    إضافة للسلة
                </button>
            </div>
        </div>`;
    });

    resultsDiv.innerHTML = html;
}

// عرض منتج
function viewProduct(productId) {
    window.location.href = `/product/${productId}`;
}

// شراء مباشر
function buyNow(productId) {
    // البحث عن المنتج
    fetch(`/api/product/${productId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const product = data.product;
                
                // إنشاء سلة مؤقتة للشراء المباشر
                const directCart = [{
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    supplier: product.supplier,
                    quantity: 1
                }];
                
                // حفظ السلة المؤقتة
                localStorage.setItem('alshamel_cart', JSON.stringify(directCart));
                
                // الانتقال مباشرة لصفحة الدفع
                window.location.href = '/checkout';
            } else {
                showNotification('خطأ في تحميل المنتج', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('حدث خطأ في تحميل المنتج', 'error');
        });
}

// مسح السلة
function clearCart() {
    cart = [];
    localStorage.removeItem('alshamel_cart');
    loadCartCount();
    showNotification('تم مسح السلة', 'success');
}

// إزالة منتج من السلة
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('alshamel_cart', JSON.stringify(cart));
    loadCartCount();
    showNotification('تم إزالة المنتج من السلة', 'success');
}

// إضافة منتج إلى السلة
function addToCart(productId, quantity = 1) {
    // البحث عن المنتج
    fetch(`/api/product/${productId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const product = data.product;

                // التحقق من وجود المنتج في السلة
                const existingItem = cart.find(item => item.id === productId);

                if (existingItem) {
                    // استبدال الكمية بدلاً من إضافتها
                    existingItem.quantity = quantity;
                } else {
                    cart.push({
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        supplier: product.supplier,
                        quantity: quantity
                    });
                }

                // حفظ السلة
                localStorage.setItem('alshamel_cart', JSON.stringify(cart));

                // تحديث عداد السلة فوراً
                loadCartCount();
                
                // تحديث نافذة السلة إذا كانت مفتوحة
                if (document.getElementById('cartModal') && document.getElementById('cartModal').style.display === 'block') {
                    displayCartItems();
                }

                showNotification('تم إضافة المنتج إلى السلة', 'success');
            } else {
                showNotification('خطأ في إضافة المنتج', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('حدث خطأ في إضافة المنتج', 'error');
        });
}

// تحميل عداد السلة
function loadCartCount() {
    // تحديث السلة من localStorage
    cart = JSON.parse(localStorage.getItem('alshamel_cart')) || [];
    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

    // البحث عن عنصر عداد السلة في الصفحة
    const cartCountElement = document.getElementById('cartCount');
    if (cartCountElement) {
        cartCountElement.textContent = cartCount;
        cartCountElement.style.display = cartCount > 0 ? 'flex' : 'none';
    }
}

// فتح نافذة السلة
function openCart() {
    const modal = document.getElementById('cartModal');
    if (modal) {
        modal.style.display = 'block';
        displayCartItems();
    }
}

// إغلاق نافذة السلة
function closeCart() {
    const modal = document.getElementById('cartModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// عرض عناصر السلة
function displayCartItems() {
    const cartItemsDiv = document.getElementById('cartItems');
    const cartTotalSpan = document.getElementById('cartTotal');
    
    if (!cartItemsDiv || !cartTotalSpan) return;
    
    if (cart.length === 0) {
        cartItemsDiv.innerHTML = `
            <div class="empty-cart">
                <i class="fa-solid fa-shopping-cart" style="font-size: 3rem; color: var(--text-muted);"></i>
                <p>السلة فارغة</p>
            </div>
        `;
        cartTotalSpan.textContent = '0.00 ريال';
        return;
    }
    
    let total = 0;
    let html = '';
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p class="cart-item-supplier">${item.supplier}</p>
                    <p class="cart-item-price">${item.price} ريال</p>
                </div>
                <div class="cart-item-controls">
                    <div class="quantity-controls">
                        <button onclick="updateCartQuantity('${item.id}', ${item.quantity - 1})" class="btn-sm">
                            <i class="fa-solid fa-minus"></i>
                        </button>
                        <span class="quantity">${item.quantity}</span>
                        <button onclick="updateCartQuantity('${item.id}', ${item.quantity + 1})" class="btn-sm">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>
                    <button onclick="removeFromCart('${item.id}')" class="btn-remove">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
                <div class="cart-item-total">
                    ${itemTotal.toFixed(2)} ريال
                </div>
            </div>
        `;
    });
    
    cartItemsDiv.innerHTML = html;
    cartTotalSpan.textContent = total.toFixed(2) + ' ريال';
}

// تحديث كمية منتج في السلة
function updateCartQuantity(productId, newQuantity) {
    if (newQuantity < 1) {
        removeFromCart(productId);
        return;
    }
    
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity = newQuantity;
        localStorage.setItem('alshamel_cart', JSON.stringify(cart));
        loadCartCount();
        displayCartItems();
    }
}

// الانتقال لصفحة الدفع
function goToCheckout() {
    if (cart.length === 0) {
        showNotification('السلة فارغة', 'error');
        return;
    }
    window.location.href = '/checkout';
}

// تتبع طلب
function trackOrder(orderId) {
    window.location.href = `/track_order/${orderId}`;
}

// عرض تفاصيل طلب
function viewOrderDetails(orderId) {
    // يمكن إضافة منطق عرض تفاصيل الطلب هنا
    showNotification('سيتم عرض تفاصيل الطلب قريباً', 'info');
}

// إلغاء طلب
function cancelOrder(orderId) {
    if (confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) {
        // إرسال طلب إلغاء الطلب
        fetch('/api/cancel_order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ order_id: orderId })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('تم إلغاء الطلب بنجاح', 'success');
                    // إعادة تحميل الصفحة
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    showNotification(data.message || 'خطأ في إلغاء الطلب', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('حدث خطأ في إلغاء الطلب', 'error');
            });
    }
}

// البحث عن طلب
function searchOrder(e) {
    e.preventDefault();

    const input = document.getElementById('orderSearchInput');
    const orderId = input.value.trim();

    if (!orderId) {
        showNotification('يرجى إدخال رقم الطلب', 'error');
        return;
    }

    window.location.href = `/track_order/${orderId}`;
}

// فتح نافذة البحث السريع
function openSearchModal() {
    document.getElementById('searchModal').style.display = 'block';
}

// إغلاق نافذة البحث السريع
function closeSearchModal() {
    document.getElementById('searchModal').style.display = 'none';
}

// إظهار الإشعارات
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;

    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    else if (type === 'error') iconClass = 'fa-times-circle';
    else if (type === 'warning') iconClass = 'fa-exclamation-triangle';

    notification.innerHTML = `
        <div class="notification-content">
            <i class="fa-solid ${iconClass}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fa-solid fa-times"></i>
        </button>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// إغلاق نافذة تتبع الطلب
function closeTrackingModal() {
    document.getElementById('trackingModal').style.display = 'none';
}

// إغلاق نافذة تفاصيل الطلب
function closeOrderDetailsModal() {
    document.getElementById('orderDetailsModal').style.display = 'none';
}

// إغلاق نافذة إضافة منتج
function closeAddProductModal() {
    document.getElementById('addProductModal').style.display = 'none';
}

// إظهار نافذة إضافة منتج
function showAddProductModal() {
    document.getElementById('addProductModal').style.display = 'block';
}

// إظهار نافذة إضافة مورد
function showAddSupplierModal() {
    showNotification('سيتم إضافة هذه الميزة قريباً', 'info');
}

// إظهار تبويب
function showTab(tabName) {
    // إخفاء جميع التبويبات
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => tab.classList.remove('active'));

    // إزالة التفعيل من جميع أزرار التبويبات
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => btn.classList.remove('active'));

    // إظهار التبويب المحدد
    document.getElementById(tabName + 'Tab').classList.add('active');

    // تفعيل زر التبويب المحدد
    event.target.classList.add('active');
}

// تحديث الطلبات
function refreshOrders() {
    loadOrders();
    showNotification('تم تحديث الطلبات', 'success');
}

// إنشاء تقرير
function generateReport() {
    showNotification('سيتم إنشاء التقرير قريباً', 'info');
}

// إضافة ترقيم للصفوف
function addRowNumbers(table) {
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach((row, index) => {
        const firstCell = row.querySelector('td');
        if (firstCell) {
            const numberCell = document.createElement('td');
            numberCell.textContent = index + 1;
            numberCell.style.fontWeight = 'bold';
            numberCell.style.color = 'var(--text-muted)';
            row.insertBefore(numberCell, firstCell);
        }
    });
}

// إضافة إمكانية الترتيب
function addSorting(table) {
    const headers = table.querySelectorAll('th');
    headers.forEach(header => {
        header.style.cursor = 'pointer';
        header.addEventListener('click', () => sortTable(table, header));
    });
}

// ترتيب الجدول
function sortTable(table, header) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const columnIndex = Array.from(header.parentNode.children).indexOf(header);
    const isAscending = header.classList.contains('sort-asc');

    // إزالة فئات الترتيب من جميع الرؤوس
    table.querySelectorAll('th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });

    // إضافة فئة الترتيب للرأس الحالي
    header.classList.add(isAscending ? 'sort-desc' : 'sort-asc');

    // ترتيب الصفوف
    rows.sort((a, b) => {
        const aValue = a.children[columnIndex].textContent.trim();
        const bValue = b.children[columnIndex].textContent.trim();

        // محاولة تحويل إلى أرقام
        const aNum = parseFloat(aValue);
        const bNum = parseFloat(bValue);

        if (!isNaN(aNum) && !isNaN(bNum)) {
            return isAscending ? bNum - aNum : aNum - bNum;
        } else {
            return isAscending ? bValue.localeCompare(aValue, 'ar') : aValue.localeCompare(bValue, 'ar');
        }
    });

    // إعادة ترتيب الصفوف في الجدول
    rows.forEach(row => tbody.appendChild(row));
}

// إظهار إشعار
function showNotification(message, type = 'info') {
    // إنشاء عنصر الإشعار
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fa-solid fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fa-solid fa-times"></i>
            </button>
        </div>
    `;

    // إضافة الأنماط
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: var(--bg-card);
        color: var(--text-primary);
        padding: 1rem 1.5rem;
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-lg);
        border: 1px solid var(--border-color);
        z-index: 3000;
        min-width: 300px;
        animation: slideIn 0.3s ease-out;
    `;

    // إضافة لون حسب النوع
    const colors = {
        success: 'var(--success-color)',
        error: 'var(--error-color)',
        warning: 'var(--warning-color)',
        info: 'var(--primary-color)'
    };

    notification.style.borderLeftColor = colors[type] || colors.info;

    // إضافة إلى الصفحة
    document.body.appendChild(notification);

    // إزالة تلقائية بعد 5 ثوان
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// الحصول على أيقونة الإشعار
function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };

    return icons[type] || icons.info;
}

// إغلاق النماذج عند النقر خارجها
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// إغلاق النماذج بمفتاح Escape
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
    }
});

// دالة مساعدة للتحقق من الاتصال
function checkConnection() {
    return navigator.onLine;
}

// دالة مساعدة لتنسيق الأرقام
function formatNumber(num) {
    return new Intl.NumberFormat('ar-SA').format(num);
}

// دالة مساعدة لتنسيق العملة
function formatCurrency(amount) {
    return new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency: 'SAR'
    }).format(amount);
}

// دالة مساعدة لتنسيق التاريخ
function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

// دالة مساعدة لتنسيق الوقت
function formatTime(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA', {
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// ============= الاستبدال والاسترجاع =============

function requestReplacement(orderId, orderItemId, replacementProductId, reason) {
    const formData = new FormData();
    formData.append('order_id', orderId);
    formData.append('order_item_id', orderItemId);
    formData.append('replacement_product_id', replacementProductId);
    formData.append('reason', reason);
    
    fetch('/api/request_replacement', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('تم إرسال طلب الاستبدال بنجاح');
            location.reload();
        } else {
            alert(data.message || 'فشل إرسال طلب الاستبدال');
        }
    })
    .catch(error => {
        alert('حدث خطأ في إرسال طلب الاستبدال');
        console.error(error);
    });
}

function requestReturn(orderId, orderItemId, reason) {
    const formData = new FormData();
    formData.append('order_id', orderId);
    formData.append('order_item_id', orderItemId);
    formData.append('reason', reason);
    
    fetch('/api/request_return', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`تم إرسال طلب الاسترجاع بنجاح. مبلغ الاسترجاع: ${data.refund_amount || 0} ريال`);
            location.reload();
        } else {
            alert(data.message || 'فشل إرسال طلب الاسترجاع');
        }
    })
    .catch(error => {
        alert('حدث خطأ في إرسال طلب الاسترجاع');
        console.error(error);
    });
}

function showReplacementModal(orderId, orderItemId, productId) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2>طلب استبدال منتج</h2>
            <form onsubmit="event.preventDefault(); handleReplacementRequest('${orderId}', '${orderItemId}', '${productId}');">
                <div class="form-group">
                    <label>اختر المنتج البديل:</label>
                    <select id="replacementProductSelect" required style="width: 100%; padding: 0.5rem; margin-top: 0.5rem; border-radius: 4px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color);">
                        <option value="">-- اختر منتج --</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>سبب الاستبدال:</label>
                    <textarea id="replacementReason" rows="4" required style="width: 100%; padding: 0.5rem; margin-top: 0.5rem; border-radius: 4px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color);" placeholder="أدخل سبب الاستبدال..."></textarea>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">إرسال طلب الاستبدال</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    // تحميل جميع المنتجات البديلة
    fetch('/api/replacement_products')
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل تحميل المنتجات');
            }
            return response.json();
        })
        .then(data => {
            console.log('بيانات المنتجات:', data);
            const select = document.getElementById('replacementProductSelect');
            if (!select) {
                console.error('لم يتم العثور على select element');
                return;
            }
            
            // مسح الخيارات الموجودة (باستثناء الخيار الافتراضي)
            while (select.options.length > 1) {
                select.remove(1);
            }
            
            if (data.success && data.products && data.products.length > 0) {
                console.log(`تم تحميل ${data.products.length} منتج`);
                // إضافة جميع المنتجات (بما في ذلك المنتج الحالي)
                data.products.forEach(product => {
                    const option = document.createElement('option');
                    option.value = product.id;
                    const isCurrent = product.id === productId;
                    option.textContent = `${product.name} - ${product.price} ريال${isCurrent ? ' (المنتج الحالي)' : ''}`;
                    if (isCurrent) {
                        option.style.fontWeight = 'bold';
                    }
                    select.appendChild(option);
                });
            } else {
                console.error('لا توجد منتجات:', data);
                // إذا لم توجد منتجات
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'لا توجد منتجات متاحة';
                option.disabled = true;
                select.appendChild(option);
            }
        })
        .catch(error => {
            console.error('خطأ في تحميل المنتجات:', error);
            const select = document.getElementById('replacementProductSelect');
            if (select) {
                // مسح الخيارات الموجودة
                while (select.options.length > 1) {
                    select.remove(1);
                }
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'حدث خطأ في تحميل المنتجات: ' + error.message;
                option.disabled = true;
                select.appendChild(option);
            }
        });
}

function showReturnModal(orderId, orderItemId) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2>طلب استرجاع منتج</h2>
            <form onsubmit="event.preventDefault(); handleReturnRequest('${orderId}', '${orderItemId}');">
                <div class="form-group">
                    <label>سبب الاسترجاع:</label>
                    <textarea id="returnReason" rows="4" required style="width: 100%; padding: 0.5rem; margin-top: 0.5rem; border-radius: 4px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color);" placeholder="أدخل سبب الاسترجاع..."></textarea>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">إرسال طلب الاسترجاع</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

function handleReplacementRequest(orderId, orderItemId, productId) {
    const replacementProductId = document.getElementById('replacementProductSelect').value;
    const reason = document.getElementById('replacementReason').value;
    
    if (!replacementProductId) {
        alert('يرجى اختيار منتج بديل');
        return;
    }
    
    requestReplacement(orderId, orderItemId, replacementProductId, reason);
}

function handleReturnRequest(orderId, orderItemId) {
    const reason = document.getElementById('returnReason').value;
    requestReturn(orderId, orderItemId, reason);
}

// تصدير الدوال للاستخدام العام
window.الشاملApp = {
    addToCart,
    removeFromCart,
    clearCart,
    viewProduct,
    trackOrder,
    searchCheapest,
    showNotification,
    formatNumber,
    formatCurrency,
    formatDate,
    formatTime
};
