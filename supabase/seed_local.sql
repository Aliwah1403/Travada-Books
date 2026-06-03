DO $$
DECLARE
  v_user_id uuid := '81b84470-16ac-4f59-b8ae-f2cebef5ccef';
  v_org_id  uuid := '3a079038-1f2c-44f5-8ed8-f2d152f8b856';
  c1_id uuid; c2_id uuid; c3_id uuid; c4_id uuid;
BEGIN
  -- ── CUSTOMERS ──────────────────────────────────────────────────────────────
  INSERT INTO customers (org_id, name, email, billing_email, phone, city, country, country_code, preferred_currency)
  VALUES (v_org_id, 'Savanna Tech Ltd', 'hello@savannatech.co.ke', 'billing+test1@example.com', '+254711000001', 'Nairobi', 'Kenya', 'KE', 'KES')
  RETURNING id INTO c1_id;

  INSERT INTO customers (org_id, name, email, billing_email, phone, city, country, country_code, preferred_currency)
  VALUES (v_org_id, 'Gulf Bridge Solutions', 'info@gulfbridge.ae', 'billing+test2@example.com', '+971501000002', 'Dubai', 'United Arab Emirates', 'AE', 'AED')
  RETURNING id INTO c2_id;

  INSERT INTO customers (org_id, name, email, billing_email, phone, city, country, country_code, preferred_currency)
  VALUES (v_org_id, 'Apex Creatives', 'accounts@apexcreatives.com', 'billing+test3@example.com', '+15550001003', 'New York', 'United States', 'US', 'USD')
  RETURNING id INTO c3_id;

  INSERT INTO customers (org_id, name, email, billing_email, phone, city, country, country_code, preferred_currency)
  VALUES (v_org_id, 'Ndovu Logistics', 'pay@ndovulogistics.co.ke', 'billing+test4@example.com', '+254722000004', 'Mombasa', 'Kenya', 'KE', 'KES')
  RETURNING id INTO c4_id;

  -- ── INVOICES ───────────────────────────────────────────────────────────────

  -- 1. Savanna Tech – draft, KES
  INSERT INTO invoices (org_id, user_id, customer_id, customer_name, invoice_number, status, issue_date, due_date, currency, line_items, subtotal, tax_amount, discount, total)
  VALUES (v_org_id, v_user_id, c1_id, 'Savanna Tech Ltd', 'INV-0001', 'draft', CURRENT_DATE, CURRENT_DATE + 30, 'KES',
    '[{"id":"1","description":"Web Design","qty":"1","rate":"85000","tax":"0"}]',
    85000, 0, 0, 85000);

  -- 2. Savanna Tech – unpaid, KES
  INSERT INTO invoices (org_id, user_id, customer_id, customer_name, invoice_number, status, issue_date, due_date, currency, line_items, subtotal, tax_amount, discount, total, sent_at, customer_details, from_details)
  VALUES (v_org_id, v_user_id, c1_id, 'Savanna Tech Ltd', 'INV-0002', 'unpaid', CURRENT_DATE - 10, CURRENT_DATE + 20, 'KES',
    '[{"id":"1","description":"Brand Identity Package","qty":"1","rate":"120000","tax":"16"}]',
    120000, 19200, 0, 139200,
    NOW() - INTERVAL '10 days',
    '{"name":"Savanna Tech Ltd","email":"curtisaliwah5@gmail.com"}',
    '{"name":"Local ORG"}');

  -- 3. Savanna Tech – paid, KES
  INSERT INTO invoices (org_id, user_id, customer_id, customer_name, invoice_number, status, issue_date, due_date, currency, line_items, subtotal, tax_amount, discount, total, sent_at, paid_at, customer_details, from_details)
  VALUES (v_org_id, v_user_id, c1_id, 'Savanna Tech Ltd', 'INV-0003', 'paid', CURRENT_DATE - 45, CURRENT_DATE - 15, 'KES',
    '[{"id":"1","description":"SEO Audit","qty":"1","rate":"50000","tax":"16"},{"id":"2","description":"Content Strategy","qty":"1","rate":"30000","tax":"0"}]',
    80000, 8000, 0, 88000,
    NOW() - INTERVAL '45 days', NOW() - INTERVAL '10 days',
    '{"name":"Savanna Tech Ltd","email":"curtisaliwah5@gmail.com"}',
    '{"name":"Local ORG"}');

  -- 4. Gulf Bridge – unpaid, AED
  INSERT INTO invoices (org_id, user_id, customer_id, customer_name, invoice_number, status, issue_date, due_date, currency, line_items, subtotal, tax_amount, discount, total, sent_at, customer_details, from_details)
  VALUES (v_org_id, v_user_id, c2_id, 'Gulf Bridge Solutions', 'INV-0004', 'unpaid', CURRENT_DATE - 5, CURRENT_DATE + 25, 'AED',
    '[{"id":"1","description":"Mobile App UI/UX","qty":"1","rate":"18000","tax":"5"}]',
    18000, 900, 0, 18900,
    NOW() - INTERVAL '5 days',
    '{"name":"Gulf Bridge Solutions","email":"curtisaliwah5@gmail.com"}',
    '{"name":"Local ORG"}');

  -- 5. Gulf Bridge – overdue, AED
  INSERT INTO invoices (org_id, user_id, customer_id, customer_name, invoice_number, status, issue_date, due_date, currency, line_items, subtotal, tax_amount, discount, total, sent_at, customer_details, from_details)
  VALUES (v_org_id, v_user_id, c2_id, 'Gulf Bridge Solutions', 'INV-0005', 'overdue', CURRENT_DATE - 60, CURRENT_DATE - 30, 'AED',
    '[{"id":"1","description":"Consulting Retainer – April","qty":"1","rate":"12000","tax":"5"}]',
    12000, 600, 0, 12600,
    NOW() - INTERVAL '60 days',
    '{"name":"Gulf Bridge Solutions","email":"curtisaliwah5@gmail.com"}',
    '{"name":"Local ORG"}');

  -- 6. Apex Creatives – paid, USD
  INSERT INTO invoices (org_id, user_id, customer_id, customer_name, invoice_number, status, issue_date, due_date, currency, line_items, subtotal, tax_amount, discount, total, sent_at, paid_at, customer_details, from_details)
  VALUES (v_org_id, v_user_id, c3_id, 'Apex Creatives', 'INV-0006', 'paid', CURRENT_DATE - 30, CURRENT_DATE, 'USD',
    '[{"id":"1","description":"Video Production","qty":"2","rate":"1500","tax":"0"},{"id":"2","description":"Motion Graphics","qty":"1","rate":"800","tax":"0"}]',
    3800, 0, 200, 3600,
    NOW() - INTERVAL '30 days', NOW() - INTERVAL '2 days',
    '{"name":"Apex Creatives","email":"curtisaliwah5@gmail.com"}',
    '{"name":"Local ORG"}');

  -- 7. Apex Creatives – draft, USD
  INSERT INTO invoices (org_id, user_id, customer_id, customer_name, invoice_number, status, issue_date, due_date, currency, line_items, subtotal, tax_amount, discount, total)
  VALUES (v_org_id, v_user_id, c3_id, 'Apex Creatives', 'INV-0007', 'draft', CURRENT_DATE, CURRENT_DATE + 14, 'USD',
    '[{"id":"1","description":"Social Media Campaign","qty":"1","rate":"2200","tax":"0"}]',
    2200, 0, 0, 2200);

  -- 8. Ndovu Logistics – unpaid, KES
  INSERT INTO invoices (org_id, user_id, customer_id, customer_name, invoice_number, status, issue_date, due_date, currency, line_items, subtotal, tax_amount, discount, total, sent_at, customer_details, from_details)
  VALUES (v_org_id, v_user_id, c4_id, 'Ndovu Logistics', 'INV-0008', 'unpaid', CURRENT_DATE - 3, CURRENT_DATE + 27, 'KES',
    '[{"id":"1","description":"Fleet Tracking Setup","qty":"1","rate":"45000","tax":"16"},{"id":"2","description":"Driver Training","qty":"5","rate":"8000","tax":"0"}]',
    85000, 7200, 0, 92200,
    NOW() - INTERVAL '3 days',
    '{"name":"Ndovu Logistics","email":"curtisaliwah5@gmail.com"}',
    '{"name":"Local ORG"}');

  -- ── QUOTES ─────────────────────────────────────────────────────────────────

  -- 1. Savanna Tech – draft, KES
  INSERT INTO quotes (org_id, user_id, customer_id, customer_name, quote_number, status, issue_date, valid_until, currency, line_items, subtotal, tax_amount, discount, total)
  VALUES (v_org_id, v_user_id, c1_id, 'Savanna Tech Ltd', 'QUO-0001', 'draft', CURRENT_DATE, CURRENT_DATE + 14, 'KES',
    '[{"id":"1","description":"E-commerce Platform","qty":"1","rate":"350000","tax":"16"}]',
    350000, 56000, 0, 406000);

  -- 2. Gulf Bridge – sent, AED
  INSERT INTO quotes (org_id, user_id, customer_id, customer_name, quote_number, status, issue_date, valid_until, currency, line_items, subtotal, tax_amount, discount, total, sent_at, customer_details, from_details)
  VALUES (v_org_id, v_user_id, c2_id, 'Gulf Bridge Solutions', 'QUO-0002', 'sent', CURRENT_DATE - 3, CURRENT_DATE + 11, 'AED',
    '[{"id":"1","description":"ERP Integration","qty":"1","rate":"35000","tax":"5"}]',
    35000, 1750, 0, 36750,
    NOW() - INTERVAL '3 days',
    '{"name":"Gulf Bridge Solutions","email":"curtisaliwah5@gmail.com"}',
    '{"name":"Local ORG"}');

  -- 3. Apex Creatives – accepted, USD
  INSERT INTO quotes (org_id, user_id, customer_id, customer_name, quote_number, status, issue_date, valid_until, currency, line_items, subtotal, tax_amount, discount, total, sent_at, accepted_at, customer_details, from_details)
  VALUES (v_org_id, v_user_id, c3_id, 'Apex Creatives', 'QUO-0003', 'accepted', CURRENT_DATE - 20, CURRENT_DATE - 6, 'USD',
    '[{"id":"1","description":"Brand Photoshoot","qty":"1","rate":"4500","tax":"0"}]',
    4500, 0, 0, 4500,
    NOW() - INTERVAL '20 days', NOW() - INTERVAL '14 days',
    '{"name":"Apex Creatives","email":"curtisaliwah5@gmail.com"}',
    '{"name":"Local ORG"}');

  -- 4. Ndovu Logistics – declined, KES
  INSERT INTO quotes (org_id, user_id, customer_id, customer_name, quote_number, status, issue_date, valid_until, currency, line_items, subtotal, tax_amount, discount, total, sent_at, declined_at, decline_reason, customer_details, from_details)
  VALUES (v_org_id, v_user_id, c4_id, 'Ndovu Logistics', 'QUO-0004', 'declined', CURRENT_DATE - 15, CURRENT_DATE - 1, 'KES',
    '[{"id":"1","description":"Warehouse Management System","qty":"1","rate":"180000","tax":"16"}]',
    180000, 28800, 0, 208800,
    NOW() - INTERVAL '15 days', NOW() - INTERVAL '5 days',
    'Budget constraints this quarter',
    '{"name":"Ndovu Logistics","email":"curtisaliwah5@gmail.com"}',
    '{"name":"Local ORG"}');

  -- 5. Savanna Tech – expired, KES
  INSERT INTO quotes (org_id, user_id, customer_id, customer_name, quote_number, status, issue_date, valid_until, currency, line_items, subtotal, tax_amount, discount, total, sent_at, customer_details, from_details)
  VALUES (v_org_id, v_user_id, c1_id, 'Savanna Tech Ltd', 'QUO-0005', 'expired', CURRENT_DATE - 40, CURRENT_DATE - 10, 'KES',
    '[{"id":"1","description":"Data Analytics Dashboard","qty":"1","rate":"95000","tax":"16"}]',
    95000, 15200, 0, 110200,
    NOW() - INTERVAL '40 days',
    '{"name":"Savanna Tech Ltd","email":"curtisaliwah5@gmail.com"}',
    '{"name":"Local ORG"}');

END;
$$;
