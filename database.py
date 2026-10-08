#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
الشامل - منصة قطع غيار السيارات
ملف قاعدة البيانات SQLite
"""

import sqlite3
import json
from datetime import datetime
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'alshamel.db')

def get_db_connection():
    """إنشاء اتصال بقاعدة البيانات"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    """تهيئة قاعدة البيانات وإنشاء الجداول"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # جدول المستخدمين
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            role TEXT NOT NULL,
            city TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # جدول الموردين
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            location TEXT,
            phone TEXT,
            email TEXT,
            type TEXT,
            rating REAL DEFAULT 4.0,
            logo TEXT DEFAULT 'default_supplier.png',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # جدول المنتجات
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            part_number TEXT NOT NULL,
            vin_compatible TEXT,
            model_compatible TEXT,
            supplier TEXT NOT NULL,
            price REAL NOT NULL,
            original_price REAL,
            type TEXT,
            brand TEXT,
            category TEXT,
            stock INTEGER DEFAULT 0,
            description TEXT,
            image TEXT DEFAULT 'default.jpg',
            warranty TEXT,
            weight TEXT,
            dimensions TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (supplier) REFERENCES suppliers(name)
        )
    ''')
    
    # جدول الطلبات
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            customer_name TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            customer_email TEXT,
            address TEXT NOT NULL,
            payment_method TEXT NOT NULL,
            card_number TEXT,
            card_name TEXT,
            total_amount REAL NOT NULL,
            status TEXT DEFAULT 'pending_payment',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # جدول عناصر الطلبات
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            product_name TEXT NOT NULL,
            supplier TEXT NOT NULL,
            price REAL NOT NULL,
            quantity INTEGER NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    ''')
    
    # جدول الإشعارات
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # جدول الاستبدالات
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS replacements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT NOT NULL,
            order_item_id INTEGER NOT NULL,
            original_product_id TEXT NOT NULL,
            replacement_product_id TEXT NOT NULL,
            reason TEXT,
            status TEXT DEFAULT 'pending',
            requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            processed_at TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (order_item_id) REFERENCES order_items(id),
            FOREIGN KEY (original_product_id) REFERENCES products(id),
            FOREIGN KEY (replacement_product_id) REFERENCES products(id)
        )
    ''')
    
    # جدول الاسترجاعات
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS returns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT NOT NULL,
            order_item_id INTEGER NOT NULL,
            product_id TEXT NOT NULL,
            reason TEXT,
            status TEXT DEFAULT 'pending',
            refund_amount REAL,
            requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            processed_at TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (order_item_id) REFERENCES order_items(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    ''')
    
    conn.commit()
    
    # إضافة بيانات أولية إذا كانت الجداول فارغة
    cursor.execute('SELECT COUNT(*) FROM users')
    if cursor.fetchone()[0] == 0:
        insert_initial_data(conn)
    
    conn.close()
    print("تم تهيئة قاعدة البيانات بنجاح")

def insert_initial_data(conn):
    """إضافة بيانات أولية للنظام"""
    cursor = conn.cursor()
    
    # إضافة مستخدم إدارة
    cursor.execute('''
        INSERT INTO users (username, password, name, email, role, city)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', ('admin', '', 'مدير النظام', 'admin@alshamel.com', 'admin', 'عرعر'))
    
    # إضافة موردين
    suppliers = [
        ('شركة الأصيل لقطع الغيار', 'عرعر - حي الملك فهد', '016-321-4567', 'aseel@parts.com', 'أصلي', 4.8),
        ('مؤسسة النجاح التجارية', 'عرعر - حي الصناعية', '016-322-5678', 'alnajah@parts.com', 'تجاري', 4.5),
        ('شركة الجودة العالمية', 'عرعر - طريق الملك عبدالعزيز', '016-323-6789', 'quality@parts.com', 'أصلي', 4.9),
    ]
    
    for supplier in suppliers:
        cursor.execute('''
            INSERT INTO suppliers (name, location, phone, email, type, rating)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', supplier)
    
    # إضافة منتجات
    products = [
        ('prod_001', 'فلتر زيت', 'OF-12345', '["WDB123", "WDB456"]', '["كامري 2020", "كامري 2021"]', 
         'شركة الأصيل لقطع الغيار', 45.00, 60.00, 'أصلي', 'Toyota', 'فلاتر', 50, 
         'فلتر زيت أصلي عالي الجودة', 'default.jpg', 'سنة واحدة', '0.5 كجم', '10x10x15 سم'),
        ('prod_002', 'بطارية سيارة', 'BAT-67890', '["WDB789"]', '["كورولا 2019", "كورولا 2020"]',
         'مؤسسة النجاح التجارية', 350.00, 400.00, 'تجاري', 'AC Delco', 'بطاريات', 30,
         'بطارية 70 أمبير', 'default.jpg', 'سنتان', '15 كجم', '30x20x25 سم'),
        ('prod_003', 'إطار سيارة', 'TIRE-11111', '["WDB321"]', '["كامري 2020"]',
         'شركة الجودة العالمية', 280.00, 320.00, 'أصلي', 'Michelin', 'إطارات', 40,
         'إطار 205/55 R16', 'default.jpg', 'سنة واحدة', '10 كجم', '65x65x20 سم'),
    ]
    
    for product in products:
        cursor.execute('''
            INSERT INTO products (id, name, part_number, vin_compatible, model_compatible,
                                supplier, price, original_price, type, brand, category, stock,
                                description, image, warranty, weight, dimensions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', product)
    
    conn.commit()
    print("تم إضافة البيانات الأولية")

if __name__ == '__main__':
    init_database()
