import requests
import unittest
import json
import os
import sys

# Get the backend URL from the frontend .env file
BACKEND_URL = "https://c119cd1a-33e0-4e79-80c7-34bcb843eacd.preview.emergentagent.com"
API_URL = f"{BACKEND_URL}/api"

class GrainStoreAPITest(unittest.TestCase):
    """Test suite for the Grain Store API"""

    def setUp(self):
        """Setup before each test - clear the cart"""
        self.clear_cart()

    def test_01_get_grains(self):
        """Test GET /api/grains endpoint"""
        print("\n🔍 Testing GET /api/grains...")
        response = requests.get(f"{API_URL}/grains")
        
        self.assertEqual(response.status_code, 200, "Expected status code 200")
        grains = response.json()
        self.assertEqual(len(grains), 5, "Expected 5 grains")
        
        # Check if all required fields are present in each grain
        required_fields = ["id", "name", "description", "price_per_kg", "image_url"]
        for grain in grains:
            for field in required_fields:
                self.assertIn(field, grain, f"Field '{field}' missing in grain")
        
        print("✅ GET /api/grains test passed")
        return grains

    def test_02_get_grind_options(self):
        """Test GET /api/grind-options endpoint"""
        print("\n🔍 Testing GET /api/grind-options...")
        response = requests.get(f"{API_URL}/grind-options")
        
        self.assertEqual(response.status_code, 200, "Expected status code 200")
        options = response.json()
        self.assertEqual(len(options), 5, "Expected 5 grind options")
        
        # Check if all required fields are present in each option
        required_fields = ["type", "description", "additional_cost"]
        for option in options:
            for field in required_fields:
                self.assertIn(field, option, f"Field '{field}' missing in grind option")
        
        print("✅ GET /api/grind-options test passed")
        return options

    def test_03_add_individual_grain_to_cart(self):
        """Test POST /api/cart/add endpoint with individual grain"""
        print("\n🔍 Testing POST /api/cart/add (individual grain)...")
        
        # First get a grain and grind option
        grains = self.test_01_get_grains()
        grind_options = self.test_02_get_grind_options()
        
        # Create payload for individual grain
        payload = {
            "type": "individual",
            "grain_id": grains[0]["id"],
            "quantity_kg": 2.5,
            "grind_option": grind_options[1]  # Using the second grind option
        }
        
        response = requests.post(f"{API_URL}/cart/add", json=payload)
        self.assertEqual(response.status_code, 200, "Expected status code 200")
        
        cart_item = response.json()
        self.assertEqual(cart_item["type"], "individual", "Item type should be 'individual'")
        self.assertEqual(cart_item["grain_id"], grains[0]["id"], "Grain ID should match")
        self.assertEqual(cart_item["quantity_kg"], 2.5, "Quantity should match")
        self.assertIsNotNone(cart_item["total_price"], "Total price should be calculated")
        
        # Calculate expected price
        expected_price = grains[0]["price_per_kg"] * 2.5 + grind_options[1]["additional_cost"]
        self.assertAlmostEqual(cart_item["total_price"], expected_price, places=2, 
                              msg="Total price calculation is incorrect")
        
        print("✅ POST /api/cart/add (individual grain) test passed")
        return cart_item

    def test_04_add_mix_to_cart(self):
        """Test POST /api/cart/add endpoint with custom mix"""
        print("\n🔍 Testing POST /api/cart/add (custom mix)...")
        
        # First get grains and grind option
        grains = self.test_01_get_grains()
        grind_options = self.test_02_get_grind_options()
        
        # Create mix with two grains
        grain_mix = [
            {
                "grain_id": grains[0]["id"],
                "grain_name": grains[0]["name"],
                "quantity_kg": 1.5,
                "price_per_kg": grains[0]["price_per_kg"]
            },
            {
                "grain_id": grains[1]["id"],
                "grain_name": grains[1]["name"],
                "quantity_kg": 0.8,
                "price_per_kg": grains[1]["price_per_kg"]
            }
        ]
        
        payload = {
            "type": "mix",
            "grains": grain_mix,
            "grind_option": grind_options[2]  # Using the third grind option
        }
        
        response = requests.post(f"{API_URL}/cart/add", json=payload)
        self.assertEqual(response.status_code, 200, "Expected status code 200")
        
        cart_item = response.json()
        self.assertEqual(cart_item["type"], "mix", "Item type should be 'mix'")
        self.assertEqual(len(cart_item["grains"]), 2, "Mix should contain 2 grains")
        self.assertIsNotNone(cart_item["total_price"], "Total price should be calculated")
        
        # Calculate expected price
        expected_price = (grains[0]["price_per_kg"] * 1.5) + (grains[1]["price_per_kg"] * 0.8) + grind_options[2]["additional_cost"]
        self.assertAlmostEqual(cart_item["total_price"], expected_price, places=2, 
                              msg="Total price calculation is incorrect")
        
        print("✅ POST /api/cart/add (custom mix) test passed")
        return cart_item

    def test_05_get_cart(self):
        """Test GET /api/cart endpoint"""
        print("\n🔍 Testing GET /api/cart...")
        
        # First add items to cart
        individual_item = self.test_03_add_individual_grain_to_cart()
        mix_item = self.test_04_add_mix_to_cart()
        
        # Get cart
        response = requests.get(f"{API_URL}/cart")
        self.assertEqual(response.status_code, 200, "Expected status code 200")
        
        cart_items = response.json()
        self.assertGreaterEqual(len(cart_items), 2, "Cart should have at least 2 items")
        
        # Check if our added items are in the cart
        item_types = [item["type"] for item in cart_items]
        self.assertIn("individual", item_types, "Cart should contain individual item")
        self.assertIn("mix", item_types, "Cart should contain mix item")
        
        print("✅ GET /api/cart test passed")
        return cart_items

    def test_06_remove_item_from_cart(self):
        """Test DELETE /api/cart/{item_id} endpoint"""
        print("\n🔍 Testing DELETE /api/cart/{item_id}...")
        
        # First get cart items
        cart_items = self.test_05_get_cart()
        item_to_remove = cart_items[0]
        
        # Remove one item
        response = requests.delete(f"{API_URL}/cart/{item_to_remove['id']}")
        self.assertEqual(response.status_code, 200, "Expected status code 200")
        
        # Check if item was removed
        response = requests.get(f"{API_URL}/cart")
        updated_cart = response.json()
        
        # Check if the item is no longer in the cart
        item_ids = [item["id"] for item in updated_cart]
        self.assertNotIn(item_to_remove["id"], item_ids, "Item should be removed from cart")
        
        print("✅ DELETE /api/cart/{item_id} test passed")

    def test_07_clear_cart(self):
        """Test DELETE /api/cart endpoint"""
        print("\n🔍 Testing DELETE /api/cart (clear cart)...")
        
        # First add items to cart
        self.test_03_add_individual_grain_to_cart()
        self.test_04_add_mix_to_cart()
        
        # Clear cart
        response = requests.delete(f"{API_URL}/cart")
        self.assertEqual(response.status_code, 200, "Expected status code 200")
        
        # Check if cart is empty
        response = requests.get(f"{API_URL}/cart")
        cart_items = response.json()
        self.assertEqual(len(cart_items), 0, "Cart should be empty after clearing")
        
        print("✅ DELETE /api/cart (clear cart) test passed")

    def clear_cart(self):
        """Helper method to clear the cart"""
        requests.delete(f"{API_URL}/cart")

if __name__ == "__main__":
    print("🧪 Starting Grain Store API Tests")
    unittest.main(argv=['first-arg-is-ignored'], exit=False)
    print("🎉 All tests completed!")