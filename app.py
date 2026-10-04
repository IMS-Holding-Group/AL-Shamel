#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
الشامل - منصة قطع غيار السيارات
منصة إلكترونية متكاملة لبيع قطع غيار السيارات في عرعر - المملكة العربية السعودية
"""

import os
import json
from datetime import datetime, timedelta
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, send_file, send_from_directory, session
from werkzeug.utils import secure_filename
import uuid
from database import get_db_connection, init_database

app = Flask(__name__)
app.secret_key = 'alshamel_secret_key_2025'
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 8 * 1024 * 1024  # 8 ميجابايت

# إنشاء المجلدات المطلوبة
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# تهيئة قاعدة البيانات
init_database()

# دوال مساعدة للعمل مع قاعدة البيانات

def dict_from_row(row):
    """تحويل صف من قاعدة البيانات إلى قاموس"""
    return dict(row) if row else None

def get_all_suppliers():
    """الحصول على جميع الموردين"""
    conn = get_db_connection()
    suppliers = conn.execute('SELECT * FROM suppliers').fetchall()
    conn.close()
    return {s['name']: dict_from_row(s) for s in suppliers}

def get_all_products():
    """الحصول على جميع المنتجات"""
    conn = get_db_connection()
    products = conn.execute('SELECT * FROM products').fetchall()
    conn.close()
    result = []
    for p in products:
        product = dict_from_row(p)
        product['vin_compatible'] = json.loads(product['vin_compatible']) if product['vin_compatible'] else []
        product['model_compatible'] = json.loads(product['model_compatible']) if product['model_compatible'] else []
        result.append(product)
    return result

def get_product_by_id(product_id):
    """الحصول على منتج بواسطة ID"""
    conn = get_db_connection()
    product = conn.execute('SELECT * FROM products WHERE id = ?', (product_id,)).fetchone()
    conn.close()
    if product:
        p = dict_from_row(product)
        p['vin_compatible'] = json.loads(p['vin_compatible']) if p['vin_compatible'] else []
        p['model_compatible'] = json.loads(p['model_compatible']) if p['model_compatible'] else []
        return p
    return None

# ============= ROUTES =============

@app.route('/')
def index():
    """الصفحة الرئيسية"""
    conn = get_db_connection()
    
    # جلب الموردين
    suppliers = conn.execute('SELECT * FROM suppliers').fetchall()
    suppliers_dict = {s['name']: dict_from_row(s) for s in suppliers}
    
    # جلب المنتجات مرتبة حسب السعر من الأقل إلى الأعلى (12 منتج)
    products = conn.execute('''
        SELECT * FROM products 
        ORDER BY price ASC 
        LIMIT 12
    ''').fetchall()
    
    latest_products = []
    for p in products:
        product = dict_from_row(p)
        product['vin_compatible'] = json.loads(product['vin_compatible']) if product['vin_compatible'] else []
        product['model_compatible'] = json.loads(product['model_compatible']) if product['model_compatible'] else []
        latest_products.append(product)
    
    # إحصائيات للصفحة الرئيسية
    total_products = conn.execute('SELECT COUNT(*) FROM products').fetchone()[0]
    total_suppliers = conn.execute('SELECT COUNT(*) FROM suppliers').fetchone()[0]
    total_orders = conn.execute('SELECT COUNT(*) FROM orders').fetchone()[0]
    
    conn.close()
    
    return render_template('index.html', 
                         suppliers=suppliers_dict, 
                         latest_products=latest_products,
                         total_products=total_products,
                         total_suppliers=total_suppliers,
                         total_orders=total_orders)

@app.route('/search')
def search():
    """صفحة البحث"""
    query = request.args.get('q', '')
    search_type = request.args.get('type', 'all')
    category = request.args.get('category', '')
    supplier = request.args.get('supplier', '')
    brand = request.args.get('brand', '')
    min_price = request.args.get('min_price', '')
    max_price = request.args.get('max_price', '')
    sort_by = request.args.get('sort', 'price_asc')  # افتراضي: السعر من الأقل إلى الأعلى
    
    conn = get_db_connection()
    
    # بناء استعلام البحث
    where_conditions = []
    params = []
    
    # البحث النصي
    if query:
        if search_type == 'name':
            where_conditions.append('name LIKE ?')
            params.append(f'%{query}%')
        elif search_type == 'part_number':
            where_conditions.append('part_number LIKE ?')
            params.append(f'%{query}%')
        elif search_type == 'vin':
            where_conditions.append('vin_compatible LIKE ?')
            params.append(f'%{query}%')
        elif search_type == 'model':
            where_conditions.append('model_compatible LIKE ?')
            params.append(f'%{query}%')
        else:
            where_conditions.append('(name LIKE ? OR part_number LIKE ? OR brand LIKE ?)')
            params.extend([f'%{query}%', f'%{query}%', f'%{query}%'])
    
    # فلتر الفئة
    if category:
        where_conditions.append('category = ?')
        params.append(category)
    
    # فلتر المورد
    if supplier:
        where_conditions.append('supplier = ?')
        params.append(supplier)
    
    # فلتر العلامة التجارية
    if brand:
        where_conditions.append('brand = ?')
        params.append(brand)
    
    # فلتر السعر الأدنى
    if min_price:
        try:
            where_conditions.append('price >= ?')
            params.append(float(min_price))
        except ValueError:
            pass
    
    # فلتر السعر الأعلى
    if max_price:
        try:
            where_conditions.append('price <= ?')
            params.append(float(max_price))
        except ValueError:
            pass
    
    # بناء استعلام SQL
    sql = 'SELECT * FROM products'
    if where_conditions:
        sql += ' WHERE ' + ' AND '.join(where_conditions)
    
    # ترتيب النتائج
    if sort_by == 'price_desc':
        sql += ' ORDER BY price DESC'
    elif sort_by == 'price_asc':
        sql += ' ORDER BY price ASC'
    elif sort_by == 'name_asc':
        sql += ' ORDER BY name ASC'
    elif sort_by == 'name_desc':
        sql += ' ORDER BY name DESC'
    else:
        sql += ' ORDER BY price ASC'  # افتراضي: السعر من الأقل إلى الأعلى
    
    results = conn.execute(sql, tuple(params)).fetchall()
    
    # جلب الموردين
    suppliers_rows = conn.execute('SELECT * FROM suppliers').fetchall()
    suppliers_dict = {s['name']: dict_from_row(s) for s in suppliers_rows}
    
    # جلب الفئات والعلامات التجارية الفريدة للفلاتر
    categories = conn.execute('SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != "" ORDER BY category').fetchall()
    brands = conn.execute('SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand != "" ORDER BY brand').fetchall()
    
    conn.close()
    
    products = []
    for r in results:
        p = dict_from_row(r)
        p['vin_compatible'] = json.loads(p['vin_compatible']) if p['vin_compatible'] else []
        p['model_compatible'] = json.loads(p['model_compatible']) if p['model_compatible'] else []
        products.append(p)
    
    return render_template('search.html', 
                         products=products, 
                         query=query, 
                         search_type=search_type, 
                         suppliers=suppliers_dict,
                         categories=[c['category'] for c in categories],
                         brands=[b['brand'] for b in brands],
                         selected_category=category,
                         selected_supplier=supplier,
                         selected_brand=brand,
                         min_price=min_price,
                         max_price=max_price,
                         sort_by=sort_by)

@app.route('/product/<product_id>')
def product_detail(product_id):
    """تفاصيل المنتج"""
    product = get_product_by_id(product_id)
    if not product:
        return redirect(url_for('index'))
    
    suppliers = get_all_suppliers()
    supplier = suppliers.get(product['supplier'])
    
    # منتجات مشابهة
    conn = get_db_connection()
    similar = conn.execute('SELECT * FROM products WHERE category = ? AND id != ? LIMIT 4',
                          (product['category'], product_id)).fetchall()
    conn.close()
    
    similar_products = []
    for s in similar:
        sp = dict_from_row(s)
        sp['vin_compatible'] = json.loads(sp['vin_compatible']) if sp['vin_compatible'] else []
        sp['model_compatible'] = json.loads(sp['model_compatible']) if sp['model_compatible'] else []
        similar_products.append(sp)
    
    return render_template('product_detail.html', product=product, supplier=supplier, similar_products=similar_products)

@app.route('/checkout')
def checkout():
    """صفحة الدفع"""
    return render_template('checkout.html')

@app.route('/process_payment', methods=['POST'])
def process_payment():
    """معالجة الدفع"""
    try:
        order_data = json.loads(request.form.get('order_data', '[]'))
        
        if not order_data:
            return jsonify({'success': False, 'message': 'السلة فارغة'})
        
        order_id = f"ORD-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # الحصول على معلومات المستخدم إذا كان مسجل دخول
        user_id = None
        if 'logged_in' in session and session['logged_in']:
            user = conn.execute('SELECT * FROM users WHERE username = ?', (session['username'],)).fetchone()
            if user:
                user_id = user['id']
                # استخدام بيانات المستخدم من قاعدة البيانات بدلاً من النموذج
                customer_name = user['name']
                customer_email = user['email'] if user['email'] else request.form.get('customer_email')
            else:
                customer_name = request.form.get('customer_name')
                customer_email = request.form.get('customer_email')
        else:
            customer_name = request.form.get('customer_name')
            customer_email = request.form.get('customer_email')
        
        # إضافة الطلب
        cursor.execute('''
            INSERT INTO orders (id, customer_name, customer_phone, customer_email, address,
                              payment_method, card_number, card_name, total_amount, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            order_id,
            customer_name,
            request.form.get('customer_phone'),
            customer_email,
            request.form.get('address'),
            request.form.get('payment_method'),
            request.form.get('card_number', ''),
            request.form.get('card_name', ''),
            float(request.form.get('total_amount', 0)),
            'paid'
        ))
        
        # إضافة عناصر الطلب
        for item in order_data:
            cursor.execute('''
                INSERT INTO order_items (order_id, product_id, product_name, supplier, price, quantity)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (order_id, item['id'], item['name'], item['supplier'], item['price'], item['quantity']))
        
        conn.commit()
        conn.close()
        
        # إنشاء إشعار للإدارة
        customer_name = request.form.get('customer_name')
        total_amount = float(request.form.get('total_amount', 0))
        create_notification(
            'order',
            'طلب جديد',
            f'طلب جديد من {customer_name} بمبلغ {total_amount:.2f} ريال - رقم الطلب: {order_id}',
            None  # للإدارة
        )
        
        return jsonify({'success': True, 'order_id': order_id, 'redirect_url': f'/thank_you/{order_id}'})
    
    except Exception as e:
        print(f"خطأ في معالجة الدفع: {e}")
        return jsonify({'success': False, 'message': f'حدث خطأ: {str(e)}'})

@app.route('/thank_you/<order_id>')
def thank_you(order_id):
    """صفحة الشكر"""
    conn = get_db_connection()
    order = conn.execute('SELECT * FROM orders WHERE id = ?', (order_id,)).fetchone()
    
    if not order:
        conn.close()
        return redirect(url_for('index'))
    
    # جلب عناصر الطلب
    items = conn.execute('SELECT * FROM order_items WHERE order_id = ?', (order_id,)).fetchall()
    conn.close()
    
    # تحويل order إلى dict وإضافة items
    order_dict = dict_from_row(order)
    order_dict['items'] = [dict_from_row(item) for item in items]
    
    return render_template('thank_you.html', order=order_dict)

@app.route('/register', methods=['GET', 'POST'])
def register():
    """صفحة تسجيل حساب جديد"""
    if request.method == 'GET':
        return render_template('register.html')
    
    # POST - إنشاء حساب جديد
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # إنشاء الحساب
        username = request.form.get('email')  # استخدام البريد الإلكتروني كاسم مستخدم
        name = request.form.get('name')
        second_name = request.form.get('second_name', '')
        
        # التحقق من عدم وجود اسم المستخدم (البريد الإلكتروني)
        existing = cursor.execute('SELECT id FROM users WHERE username = ? OR email = ?', (username, username)).fetchone()
        if existing:
            return jsonify({'success': False, 'message': 'البريد الإلكتروني مستخدم بالفعل'})
        
        # دمج الاسم الأول والثاني
        full_name = f"{name} {second_name}".strip()
        
        cursor.execute('''
            INSERT INTO users (username, password, name, email, phone, role, created_at)
            VALUES (?, ?, ?, ?, ?, 'customer', CURRENT_TIMESTAMP)
        ''', (
            username,
            request.form.get('password'),  # في الإنتاج يجب تشفير كلمة المرور
            full_name,
            request.form.get('email'),
            request.form.get('phone')
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'تم إنشاء الحساب بنجاح'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'})

@app.route('/admin')
def admin():
    """صفحة الإدارة"""
    return render_template('admin.html')

@app.route('/admin/login', methods=['POST'])
def admin_login():
    """تسجيل دخول الإدارة"""
    email = request.form.get('email')
    password = request.form.get('password')
    
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE email = ? AND password = ?',
                       (email, password)).fetchone()
    conn.close()
    
    if user:
        session['logged_in'] = True
        session['username'] = user['username']
        session['email'] = user['email']
        session['role'] = user['role']
        session['name'] = user['name']
        
        return jsonify({
            'success': True,
            'role': user['role'],
            'name': user['name']
        })
    
    return jsonify({'success': False, 'message': 'بيانات الدخول غير صحيحة'})

@app.route('/customer/dashboard')
def customer_dashboard():
    """لوحة تحكم العميل"""
    if 'logged_in' not in session or not session['logged_in']:
        return redirect(url_for('admin'))
    
    if session.get('role') != 'customer':
        return redirect(url_for('admin'))
    
    return render_template('customer_dashboard.html')

@app.route('/api/customer/info')
def api_customer_info():
    """API للحصول على معلومات العميل"""
    if 'logged_in' not in session:
        return jsonify({'success': False, 'message': 'غير مسجل دخول'})
    
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE username = ?', (session['username'],)).fetchone()
    conn.close()
    
    if user:
        return jsonify({'success': True, 'user': dict_from_row(user)})
    return jsonify({'success': False, 'message': 'مستخدم غير موجود'})

@app.route('/api/customer/stats')
def api_customer_stats():
    """API للحصول على إحصائيات العميل"""
    if 'logged_in' not in session:
        return jsonify({'success': False, 'message': 'غير مسجل دخول'})
    
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE username = ?', (session['username'],)).fetchone()
    
    if not user:
        conn.close()
        return jsonify({'success': False, 'message': 'مستخدم غير موجود'})
    
    # إجمالي الطلبات
    total_orders = conn.execute('''
        SELECT COUNT(*) FROM orders 
        WHERE customer_email = ? OR customer_name = ?
    ''', (user['email'], user['name'])).fetchone()[0]
    
    # الطلبات المكتملة
    completed_orders = conn.execute('''
        SELECT COUNT(*) FROM orders 
        WHERE (customer_email = ? OR customer_name = ?) AND status IN ('delivered', 'received')
    ''', (user['email'], user['name'])).fetchone()[0]
    
    # الطلبات قيد الشحن
    shipping_orders = conn.execute('''
        SELECT COUNT(*) FROM orders 
        WHERE (customer_email = ? OR customer_name = ?) AND status = 'shipped'
    ''', (user['email'], user['name'])).fetchone()[0]
    
    # إجمالي المشتريات
    total_spent = conn.execute('''
        SELECT SUM(total_amount) FROM orders 
        WHERE (customer_email = ? OR customer_name = ?) AND status != 'cancelled'
    ''', (user['email'], user['name'])).fetchone()[0] or 0
    
    conn.close()
    
    return jsonify({
        'success': True,
        'stats': {
            'total_orders': total_orders,
            'completed_orders': completed_orders,
            'shipping_orders': shipping_orders,
            'total_spent': round(total_spent, 2)
        }
    })

@app.route('/api/customer/update', methods=['POST'])
def api_customer_update():
    """API لتحديث معلومات العميل"""
    if 'logged_in' not in session:
        return jsonify({'success': False, 'message': 'غير مسجل دخول'})
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE users SET name=?, email=?, phone=?, city=?
            WHERE username=?
        ''', (
            request.form.get('fullName'),
            request.form.get('email'),
            request.form.get('phone'),
            request.form.get('city'),
            session['username']
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'تم تحديث المعلومات بنجاح'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'})

@app.route('/admin/check_session')
def check_session():
    """التحقق من الجلسة"""
    if 'logged_in' in session and session['logged_in']:
        return jsonify({
            'logged_in': True,
            'username': session.get('username'),
            'role': session.get('role'),
            'name': session.get('name')
        })
    return jsonify({'logged_in': False})

@app.route('/admin/logout')
def admin_logout():
    """تسجيل خروج الإدارة"""
    session.clear()
    return redirect(url_for('index'))

@app.route('/admin/dashboard')
def admin_dashboard():
    """لوحة تحكم الإدارة"""
    # التحقق من تسجيل الدخول ودور المستخدم
    if 'logged_in' not in session or not session['logged_in']:
        return redirect(url_for('admin'))
    
    # إذا كان المستخدم عميل، توجيهه إلى لوحة العميل
    if session.get('role') == 'customer':
        return redirect(url_for('customer_dashboard'))
    
    # فقط admin و supplier يمكنهم الوصول إلى لوحة الإدارة
    if session.get('role') not in ['admin', 'supplier']:
        return redirect(url_for('customer_dashboard'))
    
    conn = get_db_connection()
    
    orders = conn.execute('SELECT * FROM orders ORDER BY created_at DESC').fetchall()
    products = conn.execute('SELECT * FROM products').fetchall()
    suppliers = conn.execute('SELECT * FROM suppliers').fetchall()
    
    stats = {
        'total_orders': len(orders),
        'total_products': len(products),
        'total_suppliers': len(suppliers),
        'pending_orders': len([o for o in orders if o['status'] == 'pending_payment'])
    }
    
    conn.close()
    
    return render_template('admin_dashboard.html', stats=stats, orders=[dict_from_row(o) for o in orders])

@app.route('/admin/orders')
def admin_orders():
    """إدارة الطلبات"""
    conn = get_db_connection()
    orders = conn.execute('SELECT * FROM orders ORDER BY created_at DESC').fetchall()
    conn.close()
    
    return render_template('admin_orders.html', orders=[dict_from_row(o) for o in orders])

@app.route('/admin/products')
def admin_products():
    """إدارة المنتجات"""
    products = get_all_products()
    suppliers = get_all_suppliers()
    return render_template('admin_products.html', products=products, suppliers=suppliers)

@app.route('/admin/add_product', methods=['POST'])
def add_product():
    """إضافة منتج جديد"""
    try:
        image_filename = 'default.jpg'
        if 'product_image' in request.files:
            file = request.files['product_image']
            if file and file.filename:
                filename = secure_filename(file.filename)
                image_filename = f"product_{datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], image_filename))
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # الحصول على آخر ID
        last_id = cursor.execute('SELECT COUNT(*) FROM products').fetchone()[0]
        product_id = f"prod_{last_id + 1:03d}"
        
        cursor.execute('''
            INSERT INTO products (id, name, part_number, vin_compatible, model_compatible,
                                supplier, price, original_price, type, brand, category, stock,
                                description, image, warranty, weight, dimensions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            product_id,
            request.form.get('name'),
            request.form.get('part_number'),
            json.dumps([v.strip() for v in request.form.get('vin_compatible', '').split(',') if v.strip()]),
            json.dumps([m.strip() for m in request.form.get('model_compatible', '').split(',') if m.strip()]),
            request.form.get('supplier'),
            float(request.form.get('price', 0)),
            float(request.form.get('original_price', 0)),
            request.form.get('type'),
            request.form.get('brand'),
            request.form.get('category'),
            int(request.form.get('stock', 0)),
            request.form.get('description'),
            image_filename,
            request.form.get('warranty', 'سنة واحدة'),
            request.form.get('weight', '1 كجم'),
            request.form.get('dimensions', '10x10x10 سم')
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'تم إضافة المنتج بنجاح'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'})

@app.route('/admin/update_product', methods=['POST'])
def update_product():
    """تحديث منتج"""
    try:
        product_id = request.form.get('product_id')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # معالجة رفع الصورة
        image_filename = None
        if 'product_image' in request.files:
            file = request.files['product_image']
            if file and file.filename:
                filename = secure_filename(file.filename)
                image_filename = f"product_{datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], image_filename))
        
        # بناء استعلام التحديث
        if image_filename:
            cursor.execute('''
                UPDATE products SET name=?, part_number=?, price=?, original_price=?, stock=?,
                                  description=?, supplier=?, type=?, brand=?, category=?, image=?,
                                  vin_compatible=?, model_compatible=?
                WHERE id=?
            ''', (
                request.form.get('name'),
                request.form.get('part_number'),
                float(request.form.get('price')),
                float(request.form.get('original_price')),
                int(request.form.get('stock')),
                request.form.get('description'),
                request.form.get('supplier'),
                request.form.get('type'),
                request.form.get('brand'),
                request.form.get('category'),
                image_filename,
                json.dumps([v.strip() for v in request.form.get('vin_compatible', '').split(',') if v.strip()]),
                json.dumps([m.strip() for m in request.form.get('model_compatible', '').split(',') if m.strip()]),
                product_id
            ))
        else:
            cursor.execute('''
                UPDATE products SET name=?, part_number=?, price=?, original_price=?, stock=?,
                                  description=?, supplier=?, type=?, brand=?, category=?,
                                  vin_compatible=?, model_compatible=?
                WHERE id=?
            ''', (
                request.form.get('name'),
                request.form.get('part_number'),
                float(request.form.get('price')),
                float(request.form.get('original_price')),
                int(request.form.get('stock')),
                request.form.get('description'),
                request.form.get('supplier'),
                request.form.get('type'),
                request.form.get('brand'),
                request.form.get('category'),
                json.dumps([v.strip() for v in request.form.get('vin_compatible', '').split(',') if v.strip()]),
                json.dumps([m.strip() for m in request.form.get('model_compatible', '').split(',') if m.strip()]),
                product_id
            ))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'تم تحديث المنتج بنجاح'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'})

@app.route('/admin/delete_product', methods=['POST'])
def delete_product():
    """حذف منتج"""
    try:
        data = request.get_json()
        product_id = data.get('product_id')
        
        conn = get_db_connection()
        conn.execute('DELETE FROM products WHERE id = ?', (product_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'تم حذف المنتج بنجاح'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'})

@app.route('/admin/add_supplier', methods=['POST'])
def add_supplier():
    """إضافة مورد جديد"""
    try:
        logo_filename = 'default_supplier.png'
        if 'supplier_logo' in request.files:
            file = request.files['supplier_logo']
            if file and file.filename:
                filename = secure_filename(file.filename)
                logo_filename = f"supplier_{datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], logo_filename))
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO suppliers (name, location, phone, email, type, rating, logo)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            request.form.get('name'),
            request.form.get('location'),
            request.form.get('phone'),
            request.form.get('email'),
            request.form.get('type'),
            float(request.form.get('rating', 4.0)),
            logo_filename
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'تم إضافة المورد بنجاح'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'})

@app.route('/api/product/<product_id>')
def api_product(product_id):
    """API للحصول على منتج"""
    product = get_product_by_id(product_id)
    if product:
        return jsonify({'success': True, 'product': product})
    return jsonify({'success': False, 'message': 'المنتج غير موجود'})

@app.route('/api/replacement_products')
def api_replacement_products():
    """API لجلب جميع المنتجات للاستبدال"""
    try:
        conn = get_db_connection()
        results = conn.execute('SELECT * FROM products ORDER BY name ASC').fetchall()
        conn.close()
        
        if not results:
            return jsonify({'success': False, 'message': 'لا توجد منتجات متاحة'})
        
        products = []
        for r in results:
            p = dict_from_row(r)
            products.append({
                'id': p['id'],
                'name': p['name'],
                'price': p['price'],
                'supplier': p['supplier'],
                'part_number': p['part_number']
            })
        
        return jsonify({'success': True, 'products': products})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'})

@app.route('/api/cheapest_product')
def api_cheapest_product():
    """API للبحث عن أرخص منتج"""
    query = request.args.get('q', '')
    
    conn = get_db_connection()
    
    if query:
        results = conn.execute('''
            SELECT * FROM products WHERE name LIKE ? OR part_number LIKE ?
            ORDER BY price ASC LIMIT 10
        ''', (f'%{query}%', f'%{query}%')).fetchall()
    else:
        # إذا كان البحث فارغ، جلب جميع المنتجات
        results = conn.execute('''
            SELECT * FROM products ORDER BY price ASC LIMIT 50
        ''').fetchall()
    
    conn.close()
    
    if not results:
        return jsonify({'success': False, 'message': 'لم يتم العثور على منتجات'})
    
    products = []
    for r in results:
        p = dict_from_row(r)
        p['vin_compatible'] = json.loads(p['vin_compatible']) if p['vin_compatible'] else []
        p['model_compatible'] = json.loads(p['model_compatible']) if p['model_compatible'] else []
        # إضافة المنتج بشكل مباشر للاستخدام في الاستبدال
        products.append({
            'id': p['id'],
            'name': p['name'],
            'price': p['price'],
            'supplier': p['supplier'],
            'product': p,
            'price_range': {'min': p['price'], 'max': p['original_price']},
            'alternatives': 0
        })
    
    return jsonify({'success': True, 'products': products, 'total_found': len(products)})

@app.route('/api/cancel_order', methods=['POST'])
def cancel_order():
    """إلغاء طلب"""
    try:
        order_id = request.form.get('order_id')
        
        conn = get_db_connection()
        conn.execute('''
            UPDATE orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status IN ('pending_payment', 'paid')
        ''', (order_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'تم إلغاء الطلب بنجاح'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'})

@app.route('/api/update_order_status', methods=['POST'])
def update_order_status():
    """تحديث حالة الطلب"""
    try:
        if 'logged_in' not in session or not session['logged_in']:
            return jsonify({'success': False, 'message': 'غير مسجل دخول'})
        
        order_id = request.form.get('order_id')
        new_status = request.form.get('status')
        
        # التحقق من الحالات المسموحة
        allowed_statuses = ['pending_payment', 'paid', 'shipped', 'delivered', 'received', 'returned', 'cancelled']
        if new_status not in allowed_statuses:
            return jsonify({'success': False, 'message': 'حالة غير صحيحة'})
        
        conn = get_db_connection()
        conn.execute('''
            UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (new_status, order_id))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': f'تم تحديث حالة الطلب إلى {new_status}'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'})

@app.route('/api/request_replacement', methods=['POST'])
def request_replacement():
    """طلب استبدال منتج"""
    try:
        order_id = request.form.get('order_id')
        order_item_id = request.form.get('order_item_id')
        replacement_product_id = request.form.get('replacement_product_id')
        reason = request.form.get('reason', '')
        
        conn = get_db_connection()
        
        # التحقق من وجود الطلب والعنصر
        order_item = conn.execute('SELECT * FROM order_items WHERE id = ? AND order_id = ?', 
                                 (order_item_id, order_id)).fetchone()
        if not order_item:
            conn.close()
            return jsonify({'success': False, 'message': 'عنصر الطلب غير موجود'})
        
        # التحقق من حالة الطلب (يجب أن يكون paid أو أعلى)
        order = conn.execute('SELECT * FROM orders WHERE id = ?', (order_id,)).fetchone()
        if not order or order['status'] not in ['paid', 'shipped', 'delivered', 'received']:
            conn.close()
            return jsonify({'success': False, 'message': 'يمكن طلب الاستبدال فقط للطلبات المدفوعة'})
        
        # إضافة طلب الاستبدال
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO replacements (order_id, order_item_id, original_product_id, 
                                   replacement_product_id, reason, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
        ''', (order_id, order_item_id, order_item['product_id'], replacement_product_id, reason))
        
        conn.commit()
        conn.close()
        
        # إنشاء إشعار للإدارة
        create_notification(
            'order',
            'طلب استبدال جديد',
            f'طلب استبدال جديد للطلب {order_id}',
            None
        )
        
        return jsonify({'success': True, 'message': 'تم إرسال طلب الاستبدال بنجاح'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'})

@app.route('/api/request_return', methods=['POST'])
def request_return():
    """طلب استرجاع منتج"""
    try:
        order_id = request.form.get('order_id')
        order_item_id = request.form.get('order_item_id')
        reason = request.form.get('reason', '')
        
        conn = get_db_connection()
        
        # التحقق من وجود الطلب والعنصر
        order_item = conn.execute('SELECT * FROM order_items WHERE id = ? AND order_id = ?', 
                                 (order_item_id, order_id)).fetchone()
        if not order_item:
            conn.close()
            return jsonify({'success': False, 'message': 'عنصر الطلب غير موجود'})
        
        # التحقق من حالة الطلب (يجب أن يكون paid أو أعلى)
        order = conn.execute('SELECT * FROM orders WHERE id = ?', (order_id,)).fetchone()
        if not order or order['status'] not in ['paid', 'shipped', 'delivered', 'received']:
            conn.close()
            return jsonify({'success': False, 'message': 'يمكن طلب الاسترجاع فقط للطلبات المدفوعة'})
        
        # حساب مبلغ الاسترجاع
        refund_amount = float(order_item['price']) * int(order_item['quantity'])
        
        # إضافة طلب الاسترجاع
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO returns (order_id, order_item_id, product_id, reason, status, refund_amount)
            VALUES (?, ?, ?, ?, 'pending', ?)
        ''', (order_id, order_item_id, order_item['product_id'], reason, refund_amount))
        
        conn.commit()
        conn.close()
        
        # إنشاء إشعار للإدارة
        create_notification(
            'order',
            'طلب استرجاع جديد',
            f'طلب استرجاع جديد للطلب {order_id} بمبلغ {refund_amount:.2f} ريال',
            None
        )
        
        return jsonify({'success': True, 'message': 'تم إرسال طلب الاسترجاع بنجاح', 'refund_amount': refund_amount})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'})

@app.route('/api/process_replacement', methods=['POST'])
def process_replacement():
    """معالجة طلب الاستبدال (للإدارة)"""
    try:
        if 'logged_in' not in session or not session['logged_in']:
            return jsonify({'success': False, 'message': 'غير مسجل دخول'})
        
        replacement_id = request.form.get('replacement_id')
        action = request.form.get('action')  # 'approve' or 'reject'
        
        conn = get_db_connection()
        
        replacement = conn.execute('SELECT * FROM replacements WHERE id = ?', (replacement_id,)).fetchone()
        if not replacement:
            conn.close()
            return jsonify({'success': False, 'message': 'طلب الاستبدال غير موجود'})
        
        if action == 'approve':
            # تحديث حالة الاستبدال
            conn.execute('''
                UPDATE replacements SET status = 'approved', processed_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (replacement_id,))
            
            # تحديث عنصر الطلب
            conn.execute('''
                UPDATE order_items SET product_id = ?, product_name = (SELECT name FROM products WHERE id = ?)
                WHERE id = ?
            ''', (replacement['replacement_product_id'], replacement['replacement_product_id'], replacement['order_item_id']))
            
            conn.commit()
            conn.close()
            
            return jsonify({'success': True, 'message': 'تم الموافقة على طلب الاستبدال'})
        
        elif action == 'reject':
            conn.execute('''
                UPDATE replacements SET status = 'rejected', processed_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (replacement_id,))
            conn.commit()
            conn.close()
            
            return jsonify({'success': True, 'message': 'تم رفض طلب الاستبدال'})
        
        else:
            return jsonify({'success': False, 'message': 'إجراء غير صحيح'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'})

@app.route('/api/process_return', methods=['POST'])
def process_return():
    """معالجة طلب الاسترجاع (للإدارة)"""
    try:
        if 'logged_in' not in session or not session['logged_in']:
            return jsonify({'success': False, 'message': 'غير مسجل دخول'})
        
        return_id = request.form.get('return_id')
        action = request.form.get('action')  # 'approve' or 'reject'
        
        conn = get_db_connection()
        
        return_request = conn.execute('SELECT * FROM returns WHERE id = ?', (return_id,)).fetchone()
        if not return_request:
            conn.close()
            return jsonify({'success': False, 'message': 'طلب الاسترجاع غير موجود'})
        
        if action == 'approve':
            # تحديث حالة الاسترجاع
            conn.execute('''
                UPDATE returns SET status = 'approved', processed_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (return_id,))
            
            # تحديث حالة الطلب
            conn.execute('''
                UPDATE orders SET status = 'returned', updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (return_request['order_id'],))
            
            conn.commit()
            conn.close()
            
            return jsonify({'success': True, 'message': 'تم الموافقة على طلب الاسترجاع'})
        
        elif action == 'reject':
            conn.execute('''
                UPDATE returns SET status = 'rejected', processed_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (return_id,))
            conn.commit()
            conn.close()
            
            return jsonify({'success': True, 'message': 'تم رفض طلب الاسترجاع'})
        
        else:
            return jsonify({'success': False, 'message': 'إجراء غير صحيح'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'})

@app.route('/api/get_replacements')
def get_replacements():
    """الحصول على طلبات الاستبدال"""
    try:
        if 'logged_in' not in session or not session['logged_in']:
            return jsonify({'success': False, 'message': 'غير مسجل دخول'})
        
        conn = get_db_connection()
        replacements = conn.execute('''
            SELECT r.*, o.customer_name, oi.product_name as original_product_name,
                   p.name as replacement_product_name
            FROM replacements r
            JOIN orders o ON r.order_id = o.id
            JOIN order_items oi ON r.order_item_id = oi.id
            JOIN products p ON r.replacement_product_id = p.id
            ORDER BY r.requested_at DESC
        ''').fetchall()
        
        conn.close()
        
        return jsonify({
            'success': True,
            'replacements': [dict_from_row(r) for r in replacements]
        })
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'})

@app.route('/api/get_returns')
def get_returns():
    """الحصول على طلبات الاسترجاع"""
    try:
        if 'logged_in' not in session or not session['logged_in']:
            return jsonify({'success': False, 'message': 'غير مسجل دخول'})
        
        conn = get_db_connection()
        returns = conn.execute('''
            SELECT r.*, o.customer_name, oi.product_name
            FROM returns r
            JOIN orders o ON r.order_id = o.id
            JOIN order_items oi ON r.order_item_id = oi.id
            ORDER BY r.requested_at DESC
        ''').fetchall()
        
        conn.close()
        
        return jsonify({
            'success': True,
            'returns': [dict_from_row(r) for r in returns]
        })
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'})

@app.route('/profile')
def profile():
    """صفحة الملف الشخصي - توجيه إلى لوحة التحكم"""
    if 'logged_in' not in session or not session['logged_in']:
        return redirect(url_for('admin'))
    
    # إذا كان المستخدم عميل، توجيهه إلى لوحة التحكم
    if session.get('role') == 'customer':
        return redirect(url_for('customer_dashboard'))
    
    # للآخرين (admin/supplier)، يمكن الاحتفاظ بصفحة profile أو توجيههم أيضاً
    # يمكنك إضافة صفحة profile خاصة بهم لاحقاً إذا أردت
    return redirect(url_for('admin'))

@app.route('/api/user_orders')
def api_user_orders():
    """API للحصول على طلبات المستخدم"""
    if 'logged_in' not in session:
        return jsonify({'success': False, 'message': 'غير مسجل دخول'})
    
    conn = get_db_connection()
    
    # الحصول على طلبات المستخدم (حسب الاسم أو البريد)
    user = conn.execute('SELECT * FROM users WHERE username = ?', (session['username'],)).fetchone()
    
    if user:
        orders = conn.execute('''
            SELECT o.*, COUNT(oi.id) as items_count
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.customer_name = ? 
               OR o.customer_email = ? 
               OR o.customer_email = ?
            GROUP BY o.id
            ORDER BY o.created_at DESC
        ''', (user['name'], user['email'], session['username'])).fetchall()
        
        orders_list = []
        for order in orders:
            order_dict = dict_from_row(order)
            
            # الحصول على عناصر الطلب
            items = conn.execute('SELECT * FROM order_items WHERE order_id = ?', (order['id'],)).fetchall()
            order_dict['items'] = [dict_from_row(item) for item in items]
            orders_list.append(order_dict)
        
        conn.close()
        return jsonify({'success': True, 'orders': orders_list})
    
    conn.close()
    return jsonify({'success': False, 'message': 'مستخدم غير موجود'})

@app.route('/orders')
def orders():
    """صفحة الطلبات - تعرض فقط طلبات المستخدم المسجل دخول"""
    # التحقق من تسجيل الدخول
    if 'logged_in' not in session or not session['logged_in']:
        return redirect(url_for('admin'))
    
    conn = get_db_connection()
    
    # الحصول على معلومات المستخدم
    user = conn.execute('SELECT * FROM users WHERE username = ?', (session['username'],)).fetchone()
    
    if not user:
        conn.close()
        return redirect(url_for('admin'))
    
    # جلب طلبات المستخدم فقط (حسب الاسم أو البريد أو username)
    # البحث بطرق متعددة للتأكد من العثور على الطلبات
    orders_rows = conn.execute('''
        SELECT * FROM orders 
        WHERE customer_name = ? 
           OR customer_email = ? 
           OR customer_email = ?
        ORDER BY created_at DESC
    ''', (user['name'], user['email'], session['username'])).fetchall()
    
    # تحويل الطلبات إلى dicts وإضافة items لكل طلب
    orders_list = []
    for order_row in orders_rows:
        order_dict = dict_from_row(order_row)
        
        # جلب عناصر الطلب
        items = conn.execute('SELECT * FROM order_items WHERE order_id = ?', (order_dict['id'],)).fetchall()
        order_dict['items'] = [dict_from_row(item) for item in items]
        
        orders_list.append(order_dict)
    
    conn.close()
    
    return render_template('orders.html', orders=orders_list)

@app.route('/track_order/<order_id>')
@app.route('/track_order')
def track_order(order_id=None):
    """صفحة تتبع الطلب"""
    if not order_id:
        order_id = request.args.get('order_id')
    
    if not order_id:
        return redirect(url_for('orders'))
    
    conn = get_db_connection()
    order = conn.execute('SELECT * FROM orders WHERE id = ?', (order_id,)).fetchone()
    
    if not order:
        conn.close()
        return redirect(url_for('orders'))
    
    # جلب عناصر الطلب
    items = conn.execute('SELECT * FROM order_items WHERE order_id = ?', (order_id,)).fetchall()
    conn.close()
    
    # تحويل order إلى dict وإضافة items
    order_dict = dict_from_row(order)
    order_dict['items'] = [dict_from_row(item) for item in items]
    
    # تحديد الحالات المكتملة بناءً على حالة الطلب الحالية
    status = order_dict['status']
    
    # إضافة معلومات التتبع بناءً على الحالة الحالية
    order_dict['tracking'] = {
        'paid': order_dict['created_at'] if status in ['paid', 'shipped', 'delivered', 'received'] else None,
        'preparing': order_dict['updated_at'] if status in ['shipped', 'delivered', 'received'] else None,
        'shipped': order_dict['updated_at'] if status in ['shipped', 'delivered', 'received'] else None,
        'delivered': order_dict['updated_at'] if status in ['delivered', 'received'] else None,
        'received': order_dict['updated_at'] if status == 'received' else None
    }
    
    # تحديد الحالة التالية بناءً على الحالة الحالية
    if status == 'paid':
        order_dict['next_status'] = 'preparing'
        order_dict['next_status_text'] = 'جاري التجهيز'
    elif status == 'shipped':
        order_dict['next_status'] = 'delivered'
        order_dict['next_status_text'] = 'جاري التوصيل'
    elif status == 'delivered':
        order_dict['next_status'] = 'received'
        order_dict['next_status_text'] = 'في انتظار الاستلام'
    else:
        order_dict['next_status'] = None
        order_dict['next_status_text'] = None
    
    return render_template('track_order.html', order=order_dict)

@app.route('/api/admin/orders')
def api_admin_orders():
    """API للحصول على جميع الطلبات"""
    if 'logged_in' not in session:
        return jsonify({'success': False, 'message': 'غير مسجل دخول'})
    
    conn = get_db_connection()
    orders = conn.execute('SELECT * FROM orders ORDER BY created_at DESC').fetchall()
    conn.close()
    
    return jsonify({'success': True, 'orders': [dict_from_row(o) for o in orders]})

@app.route('/api/admin/products')
def api_admin_products():
    """API للحصول على جميع المنتجات"""
    if 'logged_in' not in session:
        return jsonify({'success': False, 'message': 'غير مسجل دخول'})
    
    products = get_all_products()
    return jsonify({'success': True, 'products': products})

@app.route('/api/admin/suppliers')
def api_admin_suppliers():
    """API للحصول على جميع الموردين"""
    if 'logged_in' not in session:
        return jsonify({'success': False, 'message': 'غير مسجل دخول'})
    
    conn = get_db_connection()
    suppliers = conn.execute('SELECT * FROM suppliers').fetchall()
    conn.close()
    
    return jsonify({'success': True, 'suppliers': [dict_from_row(s) for s in suppliers]})

@app.route('/api/admin/stats')
def api_admin_stats():
    """API للحصول على الإحصائيات الكاملة"""
    if 'logged_in' not in session:
        return jsonify({'success': False, 'message': 'غير مسجل دخول'})
    
    conn = get_db_connection()
    
    # إجمالي المبيعات
    total_sales = conn.execute('SELECT SUM(total_amount) FROM orders').fetchone()[0] or 0
    
    # عدد الطلبات
    total_orders = conn.execute('SELECT COUNT(*) FROM orders').fetchone()[0]
    
    # متوسط قيمة الطلب
    avg_order_value = total_sales / total_orders if total_orders > 0 else 0
    
    # حساب التكلفة والأرباح
    # نفترض أن السعر الأصلي هو سعر الشراء والسعر الحالي هو سعر البيع
    cost_query = conn.execute('''
        SELECT SUM(oi.quantity * p.original_price) as total_cost
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
    ''').fetchone()
    
    total_cost = cost_query[0] if cost_query[0] else 0
    
    # صافي الربح = المبيعات - التكلفة
    net_profit = total_sales - total_cost
    
    # هامش الربح = (صافي الربح / المبيعات) * 100
    profit_margin = (net_profit / total_sales * 100) if total_sales > 0 else 0
    
    # عدد المنتجات
    total_products = conn.execute('SELECT COUNT(*) FROM products').fetchone()[0]
    
    # عدد الموردين
    total_suppliers = conn.execute('SELECT COUNT(*) FROM suppliers').fetchone()[0]
    
    # عدد العملاء الفريدين
    unique_customers = conn.execute('SELECT COUNT(DISTINCT customer_email) FROM orders WHERE customer_email IS NOT NULL').fetchone()[0]
    
    # متوسط الزوار (محاكاة - يمكن إضافة جدول للزوار لاحقاً)
    avg_visitors = total_orders * 10  # كل طلب يمثل 10 زوار تقريباً
    
    # المصروفات (محاكاة - 20% من التكلفة)
    expenses = total_cost * 0.2
    
    # الطلبات حسب الحالة
    orders_by_status = {}
    status_results = conn.execute('SELECT status, COUNT(*) FROM orders GROUP BY status').fetchall()
    for row in status_results:
        orders_by_status[row[0]] = row[1]
    
    # أكثر المنتجات مبيعاً
    top_products = conn.execute('''
        SELECT p.name, SUM(oi.quantity) as total_sold
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        GROUP BY p.id
        ORDER BY total_sold DESC
        LIMIT 5
    ''').fetchall()
    
    # أكثر الموردين مبيعاً
    top_suppliers = conn.execute('''
        SELECT oi.supplier, COUNT(*) as order_count, SUM(oi.price * oi.quantity) as total_revenue
        FROM order_items oi
        GROUP BY oi.supplier
        ORDER BY total_revenue DESC
    ''').fetchall()
    
    conn.close()
    
    return jsonify({
        'success': True,
        'stats': {
            'total_sales': round(total_sales, 2),
            'total_orders': total_orders,
            'avg_order_value': round(avg_order_value, 2),
            'total_cost': round(total_cost, 2),
            'net_profit': round(net_profit, 2),
            'profit_margin': round(profit_margin, 2),
            'total_products': total_products,
            'total_suppliers': total_suppliers,
            'unique_customers': unique_customers,
            'avg_visitors': avg_visitors,
            'expenses': round(expenses, 2),
            'orders_by_status': orders_by_status,
            'top_products': [{'name': p['name'], 'sold': p['total_sold']} for p in top_products] if top_products else [],
            'top_suppliers': [{'name': s['supplier'], 'orders': s['order_count'], 'revenue': round(s['total_revenue'], 2)} for s in top_suppliers] if top_suppliers else []
        }
    })

@app.route('/api/supplier/<supplier_id>')
def api_supplier(supplier_id):
    """API للحصول على مورد"""
    conn = get_db_connection()
    supplier = conn.execute('SELECT * FROM suppliers WHERE id = ?', (supplier_id,)).fetchone()
    conn.close()
    
    if supplier:
        return jsonify({'success': True, 'supplier': dict_from_row(supplier)})
    return jsonify({'success': False, 'message': 'المورد غير موجود'})

@app.route('/admin/update_supplier', methods=['POST'])
def update_supplier():
    """تحديث مورد"""
    try:
        supplier_id = request.form.get('supplier_id')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE suppliers 
            SET name = ?, location = ?, phone = ?, email = ?, type = ?, rating = ?
            WHERE id = ?
        ''', (
            request.form.get('name'),
            request.form.get('location'),
            request.form.get('phone'),
            request.form.get('email'),
            request.form.get('type'),
            float(request.form.get('rating', 4.0)),
            supplier_id
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'تم تحديث المورد بنجاح'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'})

@app.route('/admin/delete_supplier', methods=['POST'])
def delete_supplier():
    """حذف مورد"""
    try:
        supplier_id = request.form.get('supplier_id')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # التحقق من عدم وجود منتجات للمورد
        cursor.execute('SELECT COUNT(*) FROM products WHERE supplier = (SELECT name FROM suppliers WHERE id = ?)', (supplier_id,))
        product_count = cursor.fetchone()[0]
        
        if product_count > 0:
            conn.close()
            return jsonify({'success': False, 'message': f'لا يمكن حذف المورد لأنه يحتوي على {product_count} منتج'})
        
        cursor.execute('DELETE FROM suppliers WHERE id = ?', (supplier_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'تم حذف المورد بنجاح'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'})

@app.route('/api/admin/notifications')
def api_admin_notifications():
    """API للحصول على الإشعارات"""
    if 'logged_in' not in session:
        return jsonify({'success': False, 'message': 'غير مسجل دخول'})
    
    conn = get_db_connection()
    
    # جلب آخر 20 إشعار
    notifications = conn.execute('''
        SELECT * FROM notifications 
        WHERE user_id IS NULL OR user_id = 1
        ORDER BY created_at DESC 
        LIMIT 20
    ''').fetchall()
    
    # عدد الإشعارات غير المقروءة
    unread_count = conn.execute('''
        SELECT COUNT(*) FROM notifications 
        WHERE (user_id IS NULL OR user_id = 1) AND is_read = 0
    ''').fetchone()[0]
    
    conn.close()
    
    return jsonify({
        'success': True,
        'notifications': [dict_from_row(n) for n in notifications],
        'unread_count': unread_count
    })

@app.route('/api/admin/mark_notification_read', methods=['POST'])
def mark_notification_read():
    """تحديد إشعار كمقروء"""
    if 'logged_in' not in session:
        return jsonify({'success': False, 'message': 'غير مسجل دخول'})
    
    notification_id = request.form.get('notification_id')
    
    conn = get_db_connection()
    conn.execute('UPDATE notifications SET is_read = 1 WHERE id = ?', (notification_id,))
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/api/admin/mark_all_notifications_read', methods=['POST'])
def mark_all_notifications_read():
    """تحديد جميع الإشعارات كمقروءة"""
    if 'logged_in' not in session:
        return jsonify({'success': False, 'message': 'غير مسجل دخول'})
    
    conn = get_db_connection()
    conn.execute('UPDATE notifications SET is_read = 1 WHERE user_id IS NULL OR user_id = 1')
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

def create_notification(type, title, message, user_id=None):
    """إنشاء إشعار جديد"""
    try:
        conn = get_db_connection()
        conn.execute('''
            INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
            VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
        ''', (user_id, type, title, message))
        conn.commit()
        conn.close()
        return True
    except:
        return False

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    """خدمة الملفات المرفوعة"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/favicon.ico')
def favicon():
    """خدمة أيقونة الموقع"""
    favicon_path = os.path.join(os.path.dirname(__file__), 'assets', 'images', 'Icon.ico')
    if os.path.exists(favicon_path):
        return send_file(favicon_path)
    return '', 204

@app.errorhandler(404)
def not_found(error):
    """معالج أخطاء 404"""
    return '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>404 - الصفحة غير موجودة</title><style>body{font-family:Arial;text-align:center;padding:50px;direction:rtl;}h1{color:#d32f2f;}</style></head><body><h1>404 - الصفحة غير موجودة</h1><p>عذراً، الصفحة التي تبحث عنها غير موجودة.</p><p><a href="/">العودة إلى الصفحة الرئيسية</a></p></body></html>', 404

if __name__ == '__main__':
    print("=" * 60)
    print("الشامل - منصة قطع غيار السيارات")
    print("عرعر - المملكة العربية السعودية")
    print("=" * 60)
    print("التشغيل على: http://localhost:5000")
    print("=" * 60)
    
    app.run(debug=True, host='0.0.0.0', port=5000)
