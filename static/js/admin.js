// ============= إدارة لوحة التحكم =============

// التحقق من الجلسة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    checkSession();
    loadNotifications();
});

// التحقق من جلسة المستخدم
function checkSession() {
    fetch('/admin/check_session')
        .then(response => response.json())
        .then(data => {
            if (data.logged_in) {
                // إذا كان المستخدم عميل، توجيهه إلى لوحة العميل
                if (data.role === 'customer') {
                    window.location.href = '/customer/dashboard';
                    return;
                }
                // إذا كان admin أو supplier، عرض لوحة الإدارة
                if (data.role === 'admin' || data.role === 'supplier') {
                    document.querySelector('.admin-login-container').style.display = 'none';
                    document.getElementById('adminDashboard').style.display = 'block';
                    document.getElementById('adminSection').classList.add('logged-in');
                    loadDashboardData();
                }
            }
        });
}

// تسجيل الدخول
document.getElementById('adminLoginForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    
    fetch('/admin/login', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('تم تسجيل الدخول بنجاح', 'success');
            
            // التحقق من نوع المستخدم والتوجيه بناءً عليه
            if (data.role === 'customer') {
                // إذا كان عميل، توجيهه إلى لوحة العميل
                setTimeout(() => {
                    window.location.href = '/customer/dashboard';
                }, 1000);
            } else if (data.role === 'admin' || data.role === 'supplier') {
                // إذا كان admin أو supplier، عرض لوحة الإدارة
                setTimeout(() => {
                    document.querySelector('.admin-login-container').style.display = 'none';
                    document.getElementById('adminDashboard').style.display = 'block';
                    document.getElementById('adminSection').classList.add('logged-in');
                    loadDashboardData();
                }, 1000);
            }
        } else {
            showNotification(data.message || 'فشل تسجيل الدخول', 'error');
        }
    })
    .catch(error => {
        showNotification('حدث خطأ في تسجيل الدخول', 'error');
    });
});

// تسجيل الخروج
function logout() {
    fetch('/admin/logout')
        .then(() => {
            showNotification('تم تسجيل الخروج بنجاح', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        });
}

// تحميل بيانات لوحة التحكم
function loadDashboardData() {
    loadOrders();
    loadProducts();
    loadSuppliers();
    loadQuickSuppliers();
    loadProductsSummary();
    loadStats();
}

// تحميل الموردين في القسم السريع
function loadQuickSuppliers() {
    fetch('/api/admin/suppliers')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayQuickSuppliers(data.suppliers);
            }
        });
}

function displayQuickSuppliers(suppliers) {
    const container = document.getElementById('quickSuppliersList');
    
    if (suppliers.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 1rem;">لا توجد موردين</p>';
        return;
    }
    
    let html = '';
    suppliers.slice(0, 4).forEach(supplier => {
        html += `
            <div class="supplier-item" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid var(--border-color);">
                <div class="supplier-info">
                    <h4 style="margin: 0 0 0.25rem 0;">${supplier.name}</h4>
                    <p style="margin: 0; color: var(--text-muted); font-size: 0.875rem;">${supplier.type}</p>
                </div>
                <div class="supplier-actions" style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-sm btn-primary" onclick="editSupplierQuick(${supplier.id})"><i class="fa-solid fa-edit"></i> تعديل</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSupplier(${supplier.id})"><i class="fa-solid fa-trash"></i> حذف</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// تحميل ملخص المنتجات
function loadProductsSummary() {
    fetch('/api/admin/products')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const products = data.products;
                const total = products.length;
                const original = products.filter(p => p.type === 'أصلية').length;
                const commercial = products.filter(p => p.type === 'تجارية').length;
                
                document.getElementById('totalProductsCount').textContent = total + ' منتج';
                document.getElementById('originalProductsCount').textContent = original + ' منتج';
                document.getElementById('commercialProductsCount').textContent = commercial + ' منتج';
            }
        });
}

// تحميل الإحصائيات
function loadStats() {
    fetch('/api/admin/stats')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const stats = data.stats;
                
                // تحديث الإحصائيات الأساسية
                document.getElementById('totalSales').textContent = stats.total_sales.toLocaleString('AR-EN') + ' ريال';
                document.getElementById('totalOrdersReport').textContent = stats.total_orders;
                document.getElementById('avgOrderValue').textContent = stats.avg_order_value.toLocaleString('AR-EN') + ' ريال';
                
                // تحديث بطاقات الإحصائيات في الداشبورد
                updateStatCard('المستخدمين', stats.unique_customers);
                updateStatCard('المنتجات', stats.total_products);
                updateStatCard('الموردين', stats.total_suppliers);
                updateStatCard('المبيعات', stats.total_sales.toLocaleString('AR-EN') + ' ريال');
                updateStatCard('هامش الربح', stats.profit_margin.toFixed(1) + '%');
                updateStatCard('صافي الربح', stats.net_profit.toLocaleString('AR-EN') + ' ريال');
                updateStatCard('متوسط السلة', stats.avg_order_value.toLocaleString('AR-EN') + ' ريال');
                updateStatCard('متوسط الزوار', stats.avg_visitors.toLocaleString('AR-EN'));
                updateStatCard('المصروفات', stats.expenses.toLocaleString('AR-EN') + ' ريال');
            }
        });
}

// تحديث بطاقة إحصائية
function updateStatCard(title, value) {
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        const h3 = card.querySelector('h3');
        if (h3 && h3.textContent === title) {
            const statNumber = card.querySelector('.stat-number');
            if (statNumber) {
                statNumber.textContent = value;
            }
        }
    });
}

// ============= إدارة الطلبات =============

function loadOrders() {
    fetch('/api/admin/orders')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayOrders(data.orders);
            }
        });
}

function displayOrders(orders) {
    const container = document.getElementById('ordersList');
    
    if (orders.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">لا توجد طلبات</p>';
        return;
    }
    
    const statusMap = {
        'pending_payment': 'في انتظار الدفع',
        'paid': 'تم الدفع',
        'shipped': 'قيد الشحن',
        'delivered': 'تم التوصيل',
        'received': 'تم الاستلام',
        'returned': 'تم الإرجاع',
        'cancelled': 'ملغي'
    };
    
    let html = '<div class="orders-grid">';
    orders.forEach(order => {
        const statusText = statusMap[order.status] || order.status;
        html += `
            <div class="order-card">
                <div class="order-header">
                    <h4><i class="fa-solid fa-shopping-bag"></i> طلب رقم: ${order.id}</h4>
                    <span class="order-status">${statusText}</span>
                </div>
                <div class="order-details">
                    <p><i class="fa-solid fa-user"></i> <strong>العميل:</strong> ${order.customer_name}</p>
                    <p><i class="fa-solid fa-phone"></i> <strong>الهاتف:</strong> ${order.customer_phone}</p>
                    <p><i class="fa-solid fa-money-bill"></i> <strong>المبلغ:</strong> ${order.total_amount} ريال</p>
                    <p><i class="fa-solid fa-credit-card"></i> <strong>طريقة الدفع:</strong> ${order.payment_method}</p>
                    <p><i class="fa-solid fa-calendar"></i> <strong>التاريخ:</strong> ${new Date(order.created_at).toLocaleDateString('AR-EN')}</p>
                </div>
                <div class="order-actions">
                    <select class="status-select" onchange="updateOrderStatus('${order.id}', this.value)" style="margin-bottom: 0.5rem; padding: 0.5rem; border-radius: 4px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color);">
                        <option value="pending_payment" ${order.status === 'pending_payment' ? 'selected' : ''}>في انتظار الدفع</option>
                        <option value="paid" ${order.status === 'paid' ? 'selected' : ''}>تم الدفع</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>قيد الشحن</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>تم التوصيل</option>
                        <option value="received" ${order.status === 'received' ? 'selected' : ''}>تم الاستلام</option>
                        <option value="returned" ${order.status === 'returned' ? 'selected' : ''}>تم الإرجاع</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>ملغي</option>
                    </select>
                    <button class="btn btn-sm btn-primary" onclick="viewOrderDetails('${order.id}')">
                        <i class="fa-solid fa-eye"></i> عرض التفاصيل
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="cancelOrder('${order.id}')">
                        <i class="fa-solid fa-times"></i> إلغاء الطلب
                    </button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function updateOrderStatus(orderId, newStatus) {
    const formData = new FormData();
    formData.append('order_id', orderId);
    formData.append('status', newStatus);
    
    fetch('/api/update_order_status', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('تم تحديث حالة الطلب بنجاح', 'success');
            loadOrders();
        } else {
            showNotification(data.message || 'فشل تحديث حالة الطلب', 'error');
        }
    })
    .catch(error => {
        showNotification('حدث خطأ في تحديث حالة الطلب', 'error');
    });
}

function refreshOrders() {
    showNotification('جاري تحديث الطلبات...', 'info');
    loadOrders();
}

function viewOrderDetails(orderId) {
    window.location.href = `/track_order?order_id=${orderId}`;
}

function cancelOrder(orderId) {
    if (!confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) return;
    
    const formData = new FormData();
    formData.append('order_id', orderId);
    
    fetch('/api/cancel_order', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('تم إلغاء الطلب بنجاح', 'success');
            loadOrders();
        } else {
            showNotification(data.message || 'فشل إلغاء الطلب', 'error');
        }
    });
}

// ============= إدارة المنتجات =============

function loadProducts() {
    fetch('/api/admin/products')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayProducts(data.products);
            }
        });
}

function displayProducts(products) {
    const container = document.getElementById('productsList');
    
    if (products.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">لا توجد منتجات</p>';
        return;
    }
    
    let html = '<div class="products-grid">';
    products.forEach(product => {
        html += `
            <div class="product-card">
                <div class="product-header">
                    <h4><i class="fa-solid fa-box"></i> ${product.name}</h4>
                    <span class="product-type">${product.type}</span>
                </div>
                <div class="product-details">
                    <p><i class="fa-solid fa-barcode"></i> <strong>رقم القطعة:</strong> ${product.part_number}</p>
                    <p><i class="fa-solid fa-tag"></i> <strong>العلامة:</strong> ${product.brand}</p>
                    <p><i class="fa-solid fa-truck"></i> <strong>المورد:</strong> ${product.supplier}</p>
                    <p><i class="fa-solid fa-money-bill"></i> <strong>السعر:</strong> ${product.price} ريال</p>
                    <p><i class="fa-solid fa-warehouse"></i> <strong>المخزون:</strong> ${product.stock}</p>
                </div>
                <div class="product-actions">
                    <button class="btn btn-sm btn-primary" onclick="editProduct('${product.id}')">
                        <i class="fa-solid fa-edit"></i> تعديل
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProduct('${product.id}')">
                        <i class="fa-solid fa-trash"></i> حذف
                    </button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function showAddProductModal() {
    document.getElementById('addProductModal').style.display = 'block';
}

function closeAddProductModal() {
    document.getElementById('addProductModal').style.display = 'none';
    document.getElementById('addProductForm').reset();
}

// إضافة منتج جديد
document.getElementById('addProductForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    
    // تحويل VIN و Models إلى JSON
    const vinCompatible = formData.get('vin_compatible').split(',').map(v => v.trim()).filter(v => v);
    const modelCompatible = formData.get('model_compatible').split(',').map(m => m.trim()).filter(m => m);
    
    formData.set('vin_compatible', JSON.stringify(vinCompatible));
    formData.set('model_compatible', JSON.stringify(modelCompatible));
    
    fetch('/admin/add_product', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('تم إضافة المنتج بنجاح', 'success');
            closeAddProductModal();
            loadProducts();
            loadStats();
        } else {
            showNotification(data.message || 'فشل إضافة المنتج', 'error');
        }
    })
    .catch(error => {
        showNotification('حدث خطأ في إضافة المنتج', 'error');
    });
});

function editProduct(productId) {
    // جلب بيانات المنتج
    fetch(`/api/product/${productId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const product = data.product;
                
                // ملء النموذج
                document.getElementById('productName').value = product.name;
                document.getElementById('partNumber').value = product.part_number;
                document.getElementById('productBrand').value = product.brand;
                document.getElementById('productCategory').value = product.category;
                document.getElementById('productPrice').value = product.price;
                document.getElementById('originalPrice').value = product.original_price || '';
                document.getElementById('productStock').value = product.stock;
                document.getElementById('productType').value = product.type;
                document.getElementById('productSupplier').value = product.supplier;
                document.getElementById('productDescription').value = product.description || '';
                document.getElementById('vinCompatible').value = product.vin_compatible.join(', ');
                document.getElementById('modelCompatible').value = product.model_compatible.join(', ');
                
                // تغيير النموذج للتعديل
                const form = document.getElementById('addProductForm');
                form.onsubmit = function(e) {
                    e.preventDefault();
                    updateProduct(productId);
                };
                
                document.querySelector('#addProductModal h2').textContent = 'تعديل المنتج';
                document.querySelector('#addProductForm button[type="submit"]').innerHTML = '<i class="fa-solid fa-save"></i> حفظ التعديلات';
                
                showAddProductModal();
            }
        });
}

function updateProduct(productId) {
    const formData = new FormData(document.getElementById('addProductForm'));
    formData.append('product_id', productId);
    
    // تحويل VIN و Models إلى JSON
    const vinCompatible = formData.get('vin_compatible').split(',').map(v => v.trim()).filter(v => v);
    const modelCompatible = formData.get('model_compatible').split(',').map(m => m.trim()).filter(m => m);
    
    formData.set('vin_compatible', JSON.stringify(vinCompatible));
    formData.set('model_compatible', JSON.stringify(modelCompatible));
    
    fetch('/admin/update_product', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('تم تحديث المنتج بنجاح', 'success');
            closeAddProductModal();
            loadProducts();
            
            // إعادة النموذج للوضع الافتراضي
            const form = document.getElementById('addProductForm');
            form.onsubmit = function(e) {
                e.preventDefault();
                // سيتم التعامل معه بواسطة المستمع الأصلي
            };
            document.querySelector('#addProductModal h2').textContent = 'إضافة منتج جديد';
            document.querySelector('#addProductForm button[type="submit"]').innerHTML = '<i class="fa-solid fa-plus"></i> إضافة المنتج';
        } else {
            showNotification(data.message || 'فشل تحديث المنتج', 'error');
        }
    });
}

function deleteProduct(productId) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    
    const formData = new FormData();
    formData.append('product_id', productId);
    
    fetch('/admin/delete_product', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('تم حذف المنتج بنجاح', 'success');
            loadProducts();
            loadStats();
        } else {
            showNotification(data.message || 'فشل حذف المنتج', 'error');
        }
    });
}

// ============= إدارة الموردين =============

function loadSuppliers() {
    fetch('/api/admin/suppliers')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displaySuppliers(data.suppliers);
            }
        });
}

function displaySuppliers(suppliers) {
    const container = document.getElementById('suppliersList');
    
    if (suppliers.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">لا توجد موردين</p>';
        return;
    }
    
    let html = '<div class="suppliers-grid">';
    suppliers.forEach(supplier => {
        html += `
            <div class="supplier-card">
                <div class="supplier-header">
                    <h4><i class="fa-solid fa-truck"></i> ${supplier.name}</h4>
                    <span class="supplier-rating"><i class="fa-solid fa-star"></i> ${supplier.rating}</span>
                </div>
                <div class="supplier-details">
                    <p><i class="fa-solid fa-map-marker-alt"></i> <strong>الموقع:</strong> ${supplier.location}</p>
                    <p><i class="fa-solid fa-phone"></i> <strong>الهاتف:</strong> ${supplier.phone}</p>
                    <p><i class="fa-solid fa-envelope"></i> <strong>البريد:</strong> ${supplier.email}</p>
                    <p><i class="fa-solid fa-tag"></i> <strong>النوع:</strong> ${supplier.type}</p>
                </div>
                <div class="supplier-actions">
                    <button class="btn btn-sm btn-primary" onclick="editSupplier(${supplier.id})">
                        <i class="fa-solid fa-edit"></i> تعديل
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSupplier(${supplier.id})">
                        <i class="fa-solid fa-trash"></i> حذف
                    </button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function showAddSupplierModal() {
    document.getElementById('addSupplierModal').style.display = 'block';
    document.getElementById('supplierModalTitle').textContent = 'إضافة مورد جديد';
    document.getElementById('addSupplierForm').reset();
    document.getElementById('supplierIdEdit').value = '';
}

function closeAddSupplierModal() {
    document.getElementById('addSupplierModal').style.display = 'none';
    document.getElementById('addSupplierForm').reset();
}

// إضافة/تعديل مورد
document.getElementById('addSupplierForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const supplierId = document.getElementById('supplierIdEdit').value;
    const url = supplierId ? '/admin/update_supplier' : '/admin/add_supplier';
    
    if (supplierId) {
        formData.append('supplier_id', supplierId);
    }
    
    fetch(url, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(data.message || 'تم حفظ المورد بنجاح', 'success');
            closeAddSupplierModal();
            loadSuppliers();
            loadQuickSuppliers();
        } else {
            showNotification(data.message || 'فشل حفظ المورد', 'error');
        }
    })
    .catch(error => {
        showNotification('حدث خطأ في حفظ المورد', 'error');
    });
});

function editSupplier(supplierId) {
    // جلب بيانات المورد
    fetch(`/api/supplier/${supplierId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const supplier = data.supplier;
                
                // ملء النموذج
                document.getElementById('supplierIdEdit').value = supplier.id;
                document.getElementById('supplierName').value = supplier.name;
                document.getElementById('supplierLocation').value = supplier.location;
                document.getElementById('supplierPhone').value = supplier.phone;
                document.getElementById('supplierEmail').value = supplier.email;
                document.getElementById('supplierType').value = supplier.type;
                document.getElementById('supplierRating').value = supplier.rating;
                
                document.getElementById('supplierModalTitle').textContent = 'تعديل المورد';
                showAddSupplierModal();
            }
        });
}

function editSupplierQuick(supplierId) {
    editSupplier(supplierId);
}

function deleteSupplier(supplierId) {
    if (!confirm('هل أنت متأكد من حذف هذا المورد؟')) return;
    
    const formData = new FormData();
    formData.append('supplier_id', supplierId);
    
    fetch('/admin/delete_supplier', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('تم حذف المورد بنجاح', 'success');
            loadSuppliers();
        } else {
            showNotification(data.message || 'فشل حذف المورد', 'error');
        }
    });
}

// ============= التبويبات =============

function showTab(tabName) {
    // إخفاء جميع التبويبات
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // إزالة الكلاس النشط من جميع الأزرار
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // إظهار التبويب المحدد
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // إضافة الكلاس النشط للزر المحدد
    event.target.classList.add('active');
}

// ============= الإشعارات =============

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fa-solid fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// ============= الإشعارات =============

function loadNotifications() {
    fetch('/api/admin/notifications')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayNotifications(data.notifications);
                updateNotificationBadge(data.unread_count);
            }
        })
        .catch(error => {
            console.error('خطأ في تحميل الإشعارات:', error);
        });
}

function displayNotifications(notifications) {
    const container = document.getElementById('notificationsList');
    
    if (notifications.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-muted);">لا توجد إشعارات</p>';
        return;
    }
    
    let html = '';
    notifications.forEach(notif => {
        const isUnread = !notif.is_read;
        const bgColor = isUnread ? 'var(--bg-tertiary)' : 'transparent';
        const icon = notif.type === 'order' ? 'shopping-bag' : 
                     notif.type === 'product' ? 'box' : 
                     notif.type === 'user' ? 'user' : 'bell';
        
        html += `
            <div class="notification-item" style="padding: 1rem; border-bottom: 1px solid var(--border-color); background: ${bgColor}; border-radius: 8px; margin-bottom: 0.5rem; cursor: pointer;" onclick="markAsRead(${notif.id})">
                <div style="display: flex; gap: 1rem; align-items: start;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--primary-color); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <i class="fa-solid fa-${icon}" style="color: white;"></i>
                    </div>
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 0.5rem 0; font-size: 1rem; color: var(--text-primary);">${notif.title}</h4>
                        <p style="margin: 0 0 0.5rem 0; color: var(--text-secondary); font-size: 0.875rem;">${notif.message}</p>
                        <span style="color: var(--text-muted); font-size: 0.75rem;">${formatNotificationTime(notif.created_at)}</span>
                    </div>
                    ${isUnread ? '<div style="width: 10px; height: 10px; border-radius: 50%; background: var(--error-color); flex-shrink: 0;"></div>' : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function formatNotificationTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // بالثواني
    
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
    if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} يوم`;
    return date.toLocaleDateString('ar-SA');
}

function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationBadge');
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function toggleNotifications() {
    const panel = document.getElementById('notificationsPanel');
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        loadNotifications();
    } else {
        panel.style.display = 'none';
    }
}

function markAsRead(notificationId) {
    fetch('/api/admin/mark_notification_read', {
        method: 'POST',
        body: new FormData().append('notification_id', notificationId)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadNotifications();
        }
    });
}

function markAllAsRead() {
    fetch('/api/admin/mark_all_notifications_read', {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('تم تحديد جميع الإشعارات كمقروءة', 'success');
            loadNotifications();
        }
    });
}

// ============= إدارة الاستبدالات والاسترجاعات =============

function loadReplacements() {
    fetch('/api/get_replacements')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayReplacements(data.replacements);
            }
        });
}

function displayReplacements(replacements) {
    const container = document.getElementById('replacementsList');
    if (!container) return;
    
    if (replacements.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">لا توجد طلبات استبدال</p>';
        return;
    }
    
    let html = '<div class="replacements-grid">';
    replacements.forEach(replacement => {
        const statusMap = {
            'pending': 'قيد الانتظار',
            'approved': 'موافق عليه',
            'rejected': 'مرفوض'
        };
        const statusText = statusMap[replacement.status] || replacement.status;
        
        html += `
            <div class="replacement-card" style="padding: 1rem; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 1rem;">
                <h4>طلب استبدال #${replacement.id}</h4>
                <p><strong>الطلب:</strong> ${replacement.order_id}</p>
                <p><strong>المنتج الأصلي:</strong> ${replacement.original_product_name}</p>
                <p><strong>المنتج البديل:</strong> ${replacement.replacement_product_name}</p>
                <p><strong>السبب:</strong> ${replacement.reason || 'غير محدد'}</p>
                <p><strong>الحالة:</strong> ${statusText}</p>
                ${replacement.status === 'pending' ? `
                    <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                        <button class="btn btn-sm btn-success" onclick="processReplacement(${replacement.id}, 'approve')">
                            <i class="fa-solid fa-check"></i> موافقة
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="processReplacement(${replacement.id}, 'reject')">
                            <i class="fa-solid fa-times"></i> رفض
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function processReplacement(replacementId, action) {
    const formData = new FormData();
    formData.append('replacement_id', replacementId);
    formData.append('action', action);
    
    fetch('/api/process_replacement', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(data.message, 'success');
            loadReplacements();
        } else {
            showNotification(data.message || 'فشل معالجة طلب الاستبدال', 'error');
        }
    });
}

function loadReturns() {
    fetch('/api/get_returns')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayReturns(data.returns);
            }
        });
}

function displayReturns(returns) {
    const container = document.getElementById('returnsList');
    if (!container) return;
    
    if (returns.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">لا توجد طلبات استرجاع</p>';
        return;
    }
    
    let html = '<div class="returns-grid">';
    returns.forEach(returnRequest => {
        const statusMap = {
            'pending': 'قيد الانتظار',
            'approved': 'موافق عليه',
            'rejected': 'مرفوض'
        };
        const statusText = statusMap[returnRequest.status] || returnRequest.status;
        
        html += `
            <div class="return-card" style="padding: 1rem; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 1rem;">
                <h4>طلب استرجاع #${returnRequest.id}</h4>
                <p><strong>الطلب:</strong> ${returnRequest.order_id}</p>
                <p><strong>المنتج:</strong> ${returnRequest.product_name}</p>
                <p><strong>السبب:</strong> ${returnRequest.reason || 'غير محدد'}</p>
                <p><strong>مبلغ الاسترجاع:</strong> ${returnRequest.refund_amount || 0} ريال</p>
                <p><strong>الحالة:</strong> ${statusText}</p>
                ${returnRequest.status === 'pending' ? `
                    <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                        <button class="btn btn-sm btn-success" onclick="processReturn(${returnRequest.id}, 'approve')">
                            <i class="fa-solid fa-check"></i> موافقة
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="processReturn(${returnRequest.id}, 'reject')">
                            <i class="fa-solid fa-times"></i> رفض
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function processReturn(returnId, action) {
    const formData = new FormData();
    formData.append('return_id', returnId);
    formData.append('action', action);
    
    fetch('/api/process_return', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(data.message, 'success');
            loadReturns();
        } else {
            showNotification(data.message || 'فشل معالجة طلب الاسترجاع', 'error');
        }
    });
}

// إغلاق المودال عند الضغط خارجه
window.onclick = function(event) {
    const modal = document.getElementById('addProductModal');
    const supplierModal = document.getElementById('addSupplierModal');
    if (event.target == modal) {
        closeAddProductModal();
    }
    if (event.target == supplierModal) {
        closeAddSupplierModal();
    }
}
