-- Seed data for Flour Ordering Database
-- Insert initial grains data

-- Global grains (mill_id is NULL for global availability)
INSERT INTO grains (id, name, description, category, price_per_kg, image_url, is_available, nutritional_info, mill_id, created_at, updated_at) VALUES
-- Wheat varieties
(uuid_generate_v4(), 'Wheat Whole', 'Premium quality whole wheat grains perfect for daily consumption', 'wheat', 45.00, 'https://example.com/wheat-whole.jpg', true, '{"protein": 12.6, "carbohydrates": 71.2, "fiber": 12.2, "fat": 1.5, "calories": 346, "vitamins": ["Vitamin B1", "Vitamin B3", "Vitamin E"], "minerals": ["Iron", "Magnesium", "Phosphorus"]}', null, NOW(), NOW()),

(uuid_generate_v4(), 'Wheat Durum', 'High-protein durum wheat for pasta and bread making', 'wheat', 55.00, 'https://example.com/wheat-durum.jpg', true, '{"protein": 13.7, "carbohydrates": 70.1, "fiber": 11.5, "fat": 2.5, "calories": 352, "vitamins": ["Vitamin B1", "Vitamin B2"], "minerals": ["Iron", "Selenium"]}', null, NOW(), NOW()),

-- Rice varieties
(uuid_generate_v4(), 'Basmati Rice', 'Premium long-grain basmati rice with aromatic fragrance', 'rice', 120.00, 'https://example.com/basmati-rice.jpg', true, '{"protein": 7.1, "carbohydrates": 78.2, "fiber": 1.3, "fat": 0.7, "calories": 345, "vitamins": ["Vitamin B1"], "minerals": ["Manganese", "Magnesium"]}', null, NOW(), NOW()),

(uuid_generate_v4(), 'Brown Rice', 'Nutritious whole grain brown rice rich in fiber', 'rice', 85.00, 'https://example.com/brown-rice.jpg', true, '{"protein": 7.9, "carbohydrates": 77.2, "fiber": 3.5, "fat": 2.9, "calories": 362, "vitamins": ["Vitamin B1", "Vitamin B3"], "minerals": ["Manganese", "Selenium"]}', null, NOW(), NOW()),

-- Pulses
(uuid_generate_v4(), 'Toor Dal', 'Split pigeon peas, a staple protein source', 'pulses', 140.00, 'https://example.com/toor-dal.jpg', true, '{"protein": 22.3, "carbohydrates": 62.8, "fiber": 15.5, "fat": 1.2, "calories": 343, "vitamins": ["Folate", "Vitamin B1"], "minerals": ["Iron", "Potassium"]}', null, NOW(), NOW()),

(uuid_generate_v4(), 'Moong Dal', 'Yellow split mung beans, easy to digest', 'pulses', 150.00, 'https://example.com/moong-dal.jpg', true, '{"protein": 24.5, "carbohydrates": 59.0, "fiber": 16.3, "fat": 1.2, "calories": 347, "vitamins": ["Folate", "Vitamin B1"], "minerals": ["Iron", "Magnesium"]}', null, NOW(), NOW()),

(uuid_generate_v4(), 'Chana Dal', 'Split chickpeas with rich protein content', 'pulses', 135.00, 'https://example.com/chana-dal.jpg', true, '{"protein": 22.0, "carbohydrates": 62.9, "fiber": 12.8, "fat": 1.7, "calories": 345, "vitamins": ["Folate"], "minerals": ["Iron", "Phosphorus"]}', null, NOW(), NOW()),

-- Millets
(uuid_generate_v4(), 'Pearl Millet (Bajra)', 'Nutritious pearl millet grains high in iron', 'millets', 75.00, 'https://example.com/bajra.jpg', true, '{"protein": 11.6, "carbohydrates": 67.5, "fiber": 8.5, "fat": 5.0, "calories": 361, "vitamins": ["Vitamin B1", "Vitamin B3"], "minerals": ["Iron", "Magnesium"]}', null, NOW(), NOW()),

(uuid_generate_v4(), 'Finger Millet (Ragi)', 'Calcium-rich finger millet for healthy bones', 'millets', 80.00, 'https://example.com/ragi.jpg', true, '{"protein": 7.3, "carbohydrates": 72.0, "fiber": 3.6, "fat": 1.3, "calories": 328, "vitamins": ["Vitamin B1"], "minerals": ["Calcium", "Iron"]}', null, NOW(), NOW()),

(uuid_generate_v4(), 'Foxtail Millet', 'Gluten-free foxtail millet with low glycemic index', 'millets', 90.00, 'https://example.com/foxtail-millet.jpg', true, '{"protein": 12.3, "carbohydrates": 60.9, "fiber": 6.7, "fat": 4.3, "calories": 331, "vitamins": ["Vitamin B1"], "minerals": ["Iron", "Copper"]}', null, NOW(), NOW()),

-- Spices
(uuid_generate_v4(), 'Turmeric Powder', 'Pure turmeric powder with anti-inflammatory properties', 'spices', 450.00, 'https://example.com/turmeric.jpg', true, '{"protein": 7.8, "carbohydrates": 64.9, "fiber": 21.1, "fat": 9.9, "calories": 354, "vitamins": ["Vitamin C"], "minerals": ["Iron", "Manganese"]}', null, NOW(), NOW()),

(uuid_generate_v4(), 'Red Chili Powder', 'Spicy red chili powder for authentic flavor', 'spices', 380.00, 'https://example.com/chili-powder.jpg', true, '{"protein": 12.0, "carbohydrates": 54.7, "fiber": 28.7, "fat": 17.3, "calories": 324, "vitamins": ["Vitamin A", "Vitamin C"], "minerals": ["Iron", "Potassium"]}', null, NOW(), NOW()),

(uuid_generate_v4(), 'Coriander Powder', 'Aromatic coriander powder for enhancing taste', 'spices', 320.00, 'https://example.com/coriander.jpg', true, '{"protein": 12.4, "carbohydrates": 54.8, "fiber": 41.9, "fat": 17.8, "calories": 298, "vitamins": ["Vitamin C"], "minerals": ["Iron", "Magnesium"]}', null, NOW(), NOW());

-- Insert grinding options
INSERT INTO grinding_options (id, name, description, additional_cost, is_custom, mill_id, created_at, updated_at) VALUES
(uuid_generate_v4(), 'Coarse Grinding', 'Coarse texture grinding suitable for chapati and bread', 0.00, false, null, NOW(), NOW()),
(uuid_generate_v4(), 'Medium Grinding', 'Medium texture grinding for general cooking purposes', 5.00, false, null, NOW(), NOW()),
(uuid_generate_v4(), 'Fine Grinding', 'Fine texture grinding perfect for baking and sweets', 10.00, false, null, NOW(), NOW()),
(uuid_generate_v4(), 'Extra Fine Grinding', 'Extra fine grinding for premium flour quality', 15.00, false, null, NOW(), NOW()),
(uuid_generate_v4(), 'Custom Mix Grinding', 'Custom grinding for mixed grain combinations', 20.00, true, null, NOW(), NOW());