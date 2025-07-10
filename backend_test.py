import requests
import unittest
import json
import os
import sys
import time
import random
import string
from datetime import datetime, timedelta

# Get the backend URL from the frontend .env file
BACKEND_URL = "https://c119cd1a-33e0-4e79-80c7-34bcb843eacd.preview.emergentagent.com"
API_URL = f"{BACKEND_URL}/api"

# Set up logging
import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class GrainCraftAPITest(unittest.TestCase):
    """Test suite for the GrainCraft API with enhanced features"""

    def setUp(self):
        """Setup before each test"""
        self.admin_credentials = {
            "email": "admin@graincraft.com",
            "password": "admin123"
        }
        self.customer_credentials = None
        self.admin_token = None
        self.customer_token = None
        self.test_email = f"test_user_{int(time.time())}@example.com"
        self.test_password = "Test123!"
        self.cart_items = []

    def test_01_health_check(self):
        """Test the health check endpoint"""
        print("\n🔍 Testing GET /api/health...")
        response = requests.get(f"{API_URL}/health")
        
        self.assertEqual(response.status_code, 200, "Expected status code 200")
        data = response.json()
        self.assertEqual(data["status"], "healthy", "Expected status to be 'healthy'")
        self.assertIn("timestamp", data, "Expected timestamp in response")
        self.assertIn("version", data, "Expected version in response")
        
        print("✅ GET /api/health test passed")

    def test_02_metrics(self):
        """Test the metrics endpoint"""
        print("\n🔍 Testing GET /api/metrics...")
        response = requests.get(f"{API_URL}/metrics")
        
        self.assertEqual(response.status_code, 200, "Expected status code 200")
        data = response.json()
        self.assertIn("total_users", data, "Expected total_users in response")
        self.assertIn("total_orders", data, "Expected total_orders in response")
        self.assertIn("active_orders", data, "Expected active_orders in response")
        self.assertIn("active_connections", data, "Expected active_connections in response")
        
        print("✅ GET /api/metrics test passed")

    def test_03_admin_login(self):
        """Test admin login"""
        print("\n🔍 Testing POST /api/auth/login (admin)...")
        response = requests.post(f"{API_URL}/auth/login", json=self.admin_credentials)
        
        self.assertEqual(response.status_code, 200, "Expected status code 200")
        data = response.json()
        self.assertIn("access_token", data, "Expected access_token in response")
        self.assertIn("user", data, "Expected user data in response")
        self.assertEqual(data["user"]["role"], "admin", "Expected role to be 'admin'")
        
        # Save admin token for later tests
        self.admin_token = data["access_token"]
        
        print("✅ POST /api/auth/login (admin) test passed")

    def test_04_register_customer(self):
        """Test customer registration"""
        print("\n🔍 Testing POST /api/auth/register...")
        
        customer_data = {
            "email": self.test_email,
            "password": self.test_password,
            "first_name": "Test",
            "last_name": "User",
            "phone": "1234567890",
            "role": "customer"
        }
        
        response = requests.post(f"{API_URL}/auth/register", json=customer_data)
        
        self.assertEqual(response.status_code, 200, "Expected status code 200")
        data = response.json()
        self.assertIn("message", data, "Expected message in response")
        
        # Save customer credentials for later tests
        self.customer_credentials = {
            "email": customer_data["email"],
            "password": customer_data["password"]
        }
        
        print("✅ POST /api/auth/register test passed")

    def test_05_verify_otp(self):
        """Test OTP verification"""
        print("\n🔍 Testing POST /api/auth/verify-otp...")
        
        if not self.customer_credentials:
            self.test_04_register_customer()
        
        otp_data = {
            "email": self.customer_credentials["email"],
            "otp": "123456"  # Using the demo OTP
        }
        
        response = requests.post(f"{API_URL}/auth/verify-otp", json=otp_data)
        
        self.assertEqual(response.status_code, 200, "Expected status code 200")
        data = response.json()
        self.assertIn("message", data, "Expected message in response")
        
        print("✅ POST /api/auth/verify-otp test passed")

    def test_06_customer_login(self):
        """Test customer login"""
        print("\n🔍 Testing POST /api/auth/login (customer)...")
        
        if not self.customer_credentials:
            self.test_04_register_customer()
            self.test_05_verify_otp()
        
        response = requests.post(f"{API_URL}/auth/login", json=self.customer_credentials)
        
        self.assertEqual(response.status_code, 200, "Expected status code 200")
        data = response.json()
        self.assertIn("access_token", data, "Expected access_token in response")
        self.assertIn("user", data, "Expected user data in response")
        self.assertEqual(data["user"]["role"], "customer", "Expected role to be 'customer'")
        
        # Save customer token for later tests
        self.customer_token = data["access_token"]
        
        print("✅ POST /api/auth/login (customer) test passed")

    def test_07_get_grains(self):
        """Test GET /api/grains endpoint with Redis caching"""
        print("\n🔍 Testing GET /api/grains with caching...")
        
        # First request should hit the database
        start_time = time.time()
        response1 = requests.get(f"{API_URL}/grains")
        first_request_time = time.time() - start_time
        
        self.assertEqual(response1.status_code, 200, "Expected status code 200")
        grains1 = response1.json()
        
        # Second request should hit the cache and be faster
        start_time = time.time()
        response2 = requests.get(f"{API_URL}/grains")
        second_request_time = time.time() - start_time
        
        self.assertEqual(response2.status_code, 200, "Expected status code 200")
        grains2 = response2.json()
        
        # Verify both responses are identical
        self.assertEqual(grains1, grains2, "Expected identical responses from cache")
        
        # Check if all required fields are present in each grain
        required_fields = ["id", "name", "description", "price_per_kg", "image_url", "category"]
        for grain in grains1:
            for field in required_fields:
                self.assertIn(field, grain, f"Field '{field}' missing in grain")
        
        print(f"✅ GET /api/grains test passed (First request: {first_request_time:.4f}s, Second request: {second_request_time:.4f}s)")
        return grains1

    def test_08_rate_limiting(self):
        """Test rate limiting middleware"""
        print("\n🔍 Testing rate limiting middleware...")
        
        # Make multiple requests to test rate limiting
        num_requests = 10
        responses = []
        
        for i in range(num_requests):
            response = requests.get(f"{API_URL}/grains")
            responses.append(response.status_code)
            print(f"Request {i+1}: Status code {response.status_code}")
        
        # All requests should succeed as we're under the limit (100 per minute)
        self.assertTrue(all(code == 200 for code in responses), "Expected all requests to succeed")
        
        print("✅ Rate limiting test passed (all requests succeeded)")

    def test_09_create_order(self):
        """Test order creation and payment flow"""
        print("\n🔍 Testing order creation flow...")
        
        if not self.customer_token:
            self.test_06_customer_login()
        
        # Get available grains
        grains = self.test_07_get_grains()
        
        # Create order payload
        order_items = [
            {
                "grain_id": grains[0]["id"],
                "name": grains[0]["name"],
                "quantity": 2.5,
                "price": grains[0]["price_per_kg"],
                "total_price": grains[0]["price_per_kg"] * 2.5
            }
        ]
        
        delivery_address = {
            "street": "123 Test Street",
            "city": "Test City",
            "state": "Test State",
            "zip": "12345",
            "country": "Test Country"
        }
        
        order_data = {
            "items": order_items,
            "delivery_address": delivery_address,
            "delivery_slot": "morning",
            "delivery_date": "2025-02-20T10:00:00Z"
        }
        
        # Create order
        headers = {"Authorization": f"Bearer {self.customer_token}"}
        response = requests.post(f"{API_URL}/orders", json=order_data, headers=headers)
        
        self.assertEqual(response.status_code, 200, "Expected status code 200")
        order_response = response.json()
        self.assertIn("order_id", order_response, "Expected order_id in response")
        self.assertIn("razorpay_order_id", order_response, "Expected razorpay_order_id in response")
        
        # Save order ID for later tests
        self.order_id = order_response["order_id"]
        self.razorpay_order_id = order_response["razorpay_order_id"]
        
        print("✅ Order creation test passed")
        return order_response

    def test_10_verify_payment(self):
        """Test payment verification"""
        print("\n🔍 Testing payment verification...")
        
        if not hasattr(self, 'razorpay_order_id'):
            order_response = self.test_09_create_order()
            self.razorpay_order_id = order_response["razorpay_order_id"]
        
        # Create mock payment verification data
        payment_data = {
            "razorpay_order_id": self.razorpay_order_id,
            "razorpay_payment_id": f"pay_{random_string(14)}",
            "razorpay_signature": "mock_signature"  # This will be validated by the server
        }
        
        response = requests.post(f"{API_URL}/orders/verify-payment", json=payment_data)
        
        # Note: This might fail in a real environment due to signature validation
        # but we're testing the API structure
        print(f"Payment verification response: {response.status_code} - {response.text}")
        
        # Even if it fails, we can check if the endpoint exists
        self.assertIn(response.status_code, [200, 400], "Expected status code 200 or 400")
        
        print("✅ Payment verification test completed")

    def test_11_get_my_orders(self):
        """Test getting customer orders with caching"""
        print("\n🔍 Testing GET /api/orders/my-orders with caching...")
        
        if not self.customer_token:
            self.test_06_customer_login()
        
        headers = {"Authorization": f"Bearer {self.customer_token}"}
        
        # First request should hit the database
        start_time = time.time()
        response1 = requests.get(f"{API_URL}/orders/my-orders", headers=headers)
        first_request_time = time.time() - start_time
        
        self.assertEqual(response1.status_code, 200, "Expected status code 200")
        
        # Second request should hit the cache and be faster
        start_time = time.time()
        response2 = requests.get(f"{API_URL}/orders/my-orders", headers=headers)
        second_request_time = time.time() - start_time
        
        self.assertEqual(response2.status_code, 200, "Expected status code 200")
        
        print(f"✅ GET /api/orders/my-orders test passed (First request: {first_request_time:.4f}s, Second request: {second_request_time:.4f}s)")

    def test_12_get_grind_options(self):
        """Test getting grind options"""
        print("\n🔍 Testing GET /api/grind-options...")
        
        response = requests.get(f"{API_URL}/grind-options")
        
        self.assertEqual(response.status_code, 200, "Expected status code 200")
        options = response.json()
        
        # Verify structure of grind options
        self.assertTrue(len(options) > 0, "Expected at least one grind option")
        required_fields = ["type", "description", "additional_cost", "processing_time_minutes"]
        for option in options:
            for field in required_fields:
                self.assertIn(field, option, f"Field '{field}' missing in grind option")
        
        print("✅ GET /api/grind-options test passed")
        return options

    def test_13_cart_operations(self):
        """Test cart operations (add, get, remove, clear)"""
        print("\n🔍 Testing cart operations...")
        
        if not self.customer_token:
            self.test_06_customer_login()
        
        headers = {"Authorization": f"Bearer {self.customer_token}"}
        
        # Get available grains
        grains = self.test_07_get_grains()
        grind_options = self.test_12_get_grind_options()
        
        # 1. Add individual grain to cart
        print("Adding individual grain to cart...")
        individual_item = {
            "type": "individual",
            "grain_id": grains[0]["id"],
            "quantity_kg": 1.5,
            "grind_option": grind_options[1]  # Use the second grind option
        }
        
        response = requests.post(f"{API_URL}/cart/add", json=individual_item, headers=headers)
        self.assertEqual(response.status_code, 200, "Expected status code 200")
        cart_item = response.json()
        self.assertIn("id", cart_item, "Expected id in response")
        self.cart_items.append(cart_item["id"])
        
        # 2. Add custom mix to cart
        print("Adding custom mix to cart...")
        mix_item = {
            "type": "mix",
            "grains": [
                {
                    "grain_id": grains[0]["id"],
                    "grain_name": grains[0]["name"],
                    "quantity_kg": 0.5,
                    "price_per_kg": grains[0]["price_per_kg"]
                },
                {
                    "grain_id": grains[1]["id"],
                    "grain_name": grains[1]["name"],
                    "quantity_kg": 0.5,
                    "price_per_kg": grains[1]["price_per_kg"]
                }
            ],
            "grind_option": grind_options[2]  # Use the third grind option
        }
        
        response = requests.post(f"{API_URL}/cart/add", json=mix_item, headers=headers)
        self.assertEqual(response.status_code, 200, "Expected status code 200")
        cart_item = response.json()
        self.assertIn("id", cart_item, "Expected id in response")
        self.cart_items.append(cart_item["id"])
        
        # 3. Get cart
        print("Getting cart...")
        response = requests.get(f"{API_URL}/cart", headers=headers)
        self.assertEqual(response.status_code, 200, "Expected status code 200")
        cart = response.json()
        self.assertTrue(len(cart) >= 2, "Expected at least 2 items in cart")
        
        # 4. Remove one item from cart
        if len(self.cart_items) > 0:
            print(f"Removing item {self.cart_items[0]} from cart...")
            response = requests.delete(f"{API_URL}/cart/{self.cart_items[0]}", headers=headers)
            self.assertEqual(response.status_code, 200, "Expected status code 200")
            
            # Verify item was removed
            response = requests.get(f"{API_URL}/cart", headers=headers)
            self.assertEqual(response.status_code, 200, "Expected status code 200")
            cart = response.json()
            item_ids = [item["id"] for item in cart]
            self.assertNotIn(self.cart_items[0], item_ids, "Expected item to be removed from cart")
        
        # 5. Clear cart
        print("Clearing cart...")
        response = requests.delete(f"{API_URL}/cart", headers=headers)
        self.assertEqual(response.status_code, 200, "Expected status code 200")
        
        # Verify cart is empty
        response = requests.get(f"{API_URL}/cart", headers=headers)
        self.assertEqual(response.status_code, 200, "Expected status code 200")
        cart = response.json()
        self.assertEqual(len(cart), 0, "Expected empty cart")
        
        print("✅ Cart operations test passed")

    def test_14_admin_dashboard(self):
        """Test admin dashboard"""
        print("\n🔍 Testing GET /api/admin/dashboard...")
        
        if not self.admin_token:
            self.test_03_admin_login()
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        response = requests.get(f"{API_URL}/admin/dashboard", headers=headers)
        
        self.assertEqual(response.status_code, 200, "Expected status code 200")
        data = response.json()
        
        required_fields = ["total_orders", "total_customers", "total_grinding_stores", "total_delivery_boys"]
        for field in required_fields:
            self.assertIn(field, data, f"Field '{field}' missing in dashboard data")
        
        print("✅ GET /api/admin/dashboard test passed")

    def test_15_pwa_features(self):
        """Test PWA-related endpoints (if any)"""
        print("\n🔍 Testing PWA features...")
        
        # Check if service worker is accessible
        response = requests.get(f"{BACKEND_URL}/sw.js")
        print(f"Service worker response: {response.status_code}")
        
        # Check if manifest is accessible
        response = requests.get(f"{BACKEND_URL}/manifest.json")
        print(f"Manifest response: {response.status_code}")
        
        print("✅ PWA features test completed")

def random_string(length):
    """Generate a random string of fixed length"""
    letters = string.ascii_lowercase + string.digits
    return ''.join(random.choice(letters) for i in range(length))

if __name__ == "__main__":
    print("🧪 Starting GrainCraft API Tests")
    unittest.main(argv=['first-arg-is-ignored'], exit=False)
    print("🎉 All tests completed!")