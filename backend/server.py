from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import uuid
from datetime import datetime

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class Grain(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price_per_kg: float
    image_url: str
    available: bool = True
    nutritional_info: Dict[str, str] = {}

class GrainMixItem(BaseModel):
    grain_id: str
    grain_name: str
    quantity_kg: float
    price_per_kg: float

class GrindOption(BaseModel):
    type: str
    description: str
    additional_cost: float = 0.0

class CartItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # "individual" or "mix"
    grain_id: Optional[str] = None
    grain_name: Optional[str] = None
    quantity_kg: Optional[float] = None
    grains: Optional[List[GrainMixItem]] = None
    grind_option: Optional[GrindOption] = None
    total_price: float
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CreateCartItem(BaseModel):
    type: str
    grain_id: Optional[str] = None
    quantity_kg: Optional[float] = None
    grains: Optional[List[GrainMixItem]] = None
    grind_option: Optional[GrindOption] = None

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    items: List[CartItem]
    customer_name: str
    customer_email: str
    customer_phone: str
    shipping_address: str
    total_amount: float
    status: str = "pending"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CreateOrder(BaseModel):
    items: List[CartItem]
    customer_name: str
    customer_email: str
    customer_phone: str
    shipping_address: str

# Initialize grain data
@app.on_event("startup")
async def startup_event():
    # Check if grains collection is empty and populate with initial data
    grain_count = await db.grains.count_documents({})
    if grain_count == 0:
        initial_grains = [
            {
                "id": "wheat-001",
                "name": "Premium Wheat",
                "description": "High-quality wheat grains perfect for grinding into flour or mixing with other grains",
                "price_per_kg": 45.0,
                "image_url": "https://images.pexels.com/photos/54084/wheat-grain-agriculture-seed-54084.jpeg",
                "available": True,
                "nutritional_info": {
                    "protein": "12g per 100g",
                    "fiber": "10g per 100g",
                    "carbs": "71g per 100g"
                }
            },
            {
                "id": "millet-001",
                "name": "Organic Millet",
                "description": "Nutrient-rich millet grains, excellent for healthy grain mixes",
                "price_per_kg": 85.0,
                "image_url": "https://images.unsplash.com/photo-1542990253-a781e04c0082",
                "available": True,
                "nutritional_info": {
                    "protein": "11g per 100g",
                    "fiber": "8g per 100g",
                    "iron": "High"
                }
            },
            {
                "id": "rice-001",
                "name": "Brown Rice",
                "description": "Whole grain brown rice, perfect for custom grain blends",
                "price_per_kg": 65.0,
                "image_url": "https://images.pexels.com/photos/1192053/pexels-photo-1192053.jpeg",
                "available": True,
                "nutritional_info": {
                    "protein": "7g per 100g",
                    "fiber": "4g per 100g",
                    "magnesium": "High"
                }
            },
            {
                "id": "oats-001",
                "name": "Steel Cut Oats",
                "description": "Premium steel cut oats for nutritious grain mixes",
                "price_per_kg": 95.0,
                "image_url": "https://images.unsplash.com/photo-1651241587503-a874db54a1a7",
                "available": True,
                "nutritional_info": {
                    "protein": "13g per 100g",
                    "fiber": "10g per 100g",
                    "beta_glucan": "High"
                }
            },
            {
                "id": "quinoa-001",
                "name": "Quinoa Seeds",
                "description": "Superfood quinoa seeds, great for protein-rich grain blends",
                "price_per_kg": 280.0,
                "image_url": "https://images.pexels.com/photos/1192037/pexels-photo-1192037.jpeg",
                "available": True,
                "nutritional_info": {
                    "protein": "14g per 100g",
                    "fiber": "7g per 100g",
                    "complete_protein": "Yes"
                }
            }
        ]
        await db.grains.insert_many(initial_grains)
        logger.info("Initial grains data populated")

# Routes
@api_router.get("/")
async def root():
    return {"message": "Grain Store API"}

@api_router.get("/grains", response_model=List[Grain])
async def get_grains():
    grains = await db.grains.find({"available": True}).to_list(1000)
    return [Grain(**grain) for grain in grains]

@api_router.get("/grains/{grain_id}", response_model=Grain)
async def get_grain(grain_id: str):
    grain = await db.grains.find_one({"id": grain_id})
    if not grain:
        raise HTTPException(status_code=404, detail="Grain not found")
    return Grain(**grain)

@api_router.get("/grind-options")
async def get_grind_options():
    return [
        {"type": "whole", "description": "Whole grains (no grinding)", "additional_cost": 0.0},
        {"type": "coarse", "description": "Coarse grind - chunky texture", "additional_cost": 5.0},
        {"type": "medium", "description": "Medium grind - balanced texture", "additional_cost": 8.0},
        {"type": "fine", "description": "Fine grind - smooth texture", "additional_cost": 12.0},
        {"type": "powder", "description": "Powder grind - very fine flour", "additional_cost": 15.0}
    ]

@api_router.post("/cart/add", response_model=CartItem)
async def add_to_cart(item: CreateCartItem):
    total_price = 0.0
    
    if item.type == "individual":
        # Calculate price for individual grain
        grain = await db.grains.find_one({"id": item.grain_id})
        if not grain:
            raise HTTPException(status_code=404, detail="Grain not found")
        
        base_price = grain["price_per_kg"] * item.quantity_kg
        grind_cost = item.grind_option.additional_cost if item.grind_option else 0.0
        total_price = base_price + grind_cost
        
        cart_item = CartItem(
            type="individual",
            grain_id=item.grain_id,
            grain_name=grain["name"],
            quantity_kg=item.quantity_kg,
            grind_option=item.grind_option,
            total_price=total_price
        )
    
    elif item.type == "mix":
        # Calculate price for custom mix
        base_price = sum(grain_item.price_per_kg * grain_item.quantity_kg for grain_item in item.grains)
        grind_cost = item.grind_option.additional_cost if item.grind_option else 0.0
        total_price = base_price + grind_cost
        
        cart_item = CartItem(
            type="mix",
            grains=item.grains,
            grind_option=item.grind_option,
            total_price=total_price
        )
    
    else:
        raise HTTPException(status_code=400, detail="Invalid item type")
    
    # Store in database (simple cart storage)
    await db.cart.insert_one(cart_item.dict())
    return cart_item

@api_router.get("/cart")
async def get_cart():
    cart_items = await db.cart.find().to_list(1000)
    return [CartItem(**item) for item in cart_items]

@api_router.delete("/cart/{item_id}")
async def remove_from_cart(item_id: str):
    result = await db.cart.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cart item not found")
    return {"message": "Item removed from cart"}

@api_router.delete("/cart")
async def clear_cart():
    await db.cart.delete_many({})
    return {"message": "Cart cleared"}

@api_router.post("/orders", response_model=Order)
async def create_order(order_data: CreateOrder):
    # Calculate total amount
    total_amount = sum(item.total_price for item in order_data.items)
    
    order = Order(
        items=order_data.items,
        customer_name=order_data.customer_name,
        customer_email=order_data.customer_email,
        customer_phone=order_data.customer_phone,
        shipping_address=order_data.shipping_address,
        total_amount=total_amount
    )
    
    # Store order in database
    await db.orders.insert_one(order.dict())
    
    # Clear cart after successful order
    await db.cart.delete_many({})
    
    return order

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return Order(**order)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()