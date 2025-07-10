from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Dict, Optional, Any
import uuid
from datetime import datetime, timedelta
import jwt
import bcrypt
import razorpay
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import random
import asyncio
import json
from geopy.distance import geodesic
from geopy.geocoders import Nominatim
import requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize Razorpay client
razorpay_client = razorpay.Client(auth=(
    os.getenv("RAZORPAY_KEY_ID", "rzp_test_demo"),
    os.getenv("RAZORPAY_KEY_SECRET", "demo_secret")
))

# Create the main app
app = FastAPI(title="GrainCraft Multi-Role Platform", version="2.0.0")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-here")
JWT_ALGORITHM = "HS256"

# User Models
class UserRole(BaseModel):
    role: str  # customer, grinding_store, admin, delivery_boy
    permissions: List[str] = []

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    password_hash: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: str = "customer"  # customer, grinding_store, admin, delivery_boy
    is_verified: bool = False
    is_active: bool = True
    profile_data: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserRegistration(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: str = "customer"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class OTPVerification(BaseModel):
    email: EmailStr
    otp: str

class GrindingStore(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    owner_id: str
    location: Dict[str, Any]  # {address, latitude, longitude, city, state}
    capacity_kg_per_day: float
    contact_info: Dict[str, str]
    operating_hours: Dict[str, str]
    services: List[str]
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DeliveryBoy(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    license_number: str
    vehicle_type: str
    current_location: Dict[str, float]  # {latitude, longitude}
    assigned_area: Dict[str, Any]  # Service area bounds
    is_available: bool = True
    rating: float = 5.0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Grain(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price_per_kg: float
    image_url: str
    category: str
    nutritional_info: Dict[str, str] = {}
    stock_kg: float = 0.0
    minimum_order_kg: float = 0.1
    available: bool = True
    created_by: str  # admin_id
    created_at: datetime = Field(default_factory=datetime.utcnow)

class GrindOption(BaseModel):
    type: str
    description: str
    additional_cost: float = 0.0
    processing_time_minutes: int = 5

class OrderItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # "individual" or "mix"
    grain_id: Optional[str] = None
    grain_name: Optional[str] = None
    quantity_kg: Optional[float] = None
    grains: Optional[List[Dict[str, Any]]] = None
    grind_option: Optional[GrindOption] = None
    unit_price: float
    total_price: float

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    items: List[OrderItem]
    delivery_address: Dict[str, Any]  # {address, latitude, longitude, city, state}
    delivery_slot: Optional[str] = None  # "morning", "afternoon", "evening"
    delivery_date: Optional[datetime] = None
    grinding_store_id: Optional[str] = None
    delivery_boy_id: Optional[str] = None
    status: str = "pending"  # pending, confirmed, grinding, packing, out_for_delivery, delivered, cancelled
    payment_status: str = "pending"  # pending, paid, failed, refunded
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    total_amount: float
    delivery_fee: float = 0.0
    is_subscription: bool = False
    subscription_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Subscription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    items: List[OrderItem]
    delivery_address: Dict[str, Any]
    delivery_slot: str
    frequency: str = "weekly"  # weekly, bi-weekly, monthly
    delivery_day: str = "monday"  # monday, tuesday, etc.
    razorpay_subscription_id: Optional[str] = None
    status: str = "active"  # active, paused, cancelled
    next_delivery_date: datetime
    total_amount: float
    created_at: datetime = Field(default_factory=datetime.utcnow)

class OrderStatus(BaseModel):
    order_id: str
    status: str
    updated_by: str
    notes: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# Utility Functions
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = verify_token(credentials.credentials)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return User(**user)
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

def generate_otp() -> str:
    return str(random.randint(100000, 999999))

def send_otp_email(email: str, otp: str):
    # In real implementation, integrate with email service
    print(f"OTP for {email}: {otp}")
    # Store OTP in database with expiration
    return True

def calculate_distance(location1: Dict[str, float], location2: Dict[str, float]) -> float:
    """Calculate distance between two locations in kilometers"""
    return geodesic(
        (location1['latitude'], location1['longitude']),
        (location2['latitude'], location2['longitude'])
    ).kilometers

async def group_orders_by_location(orders: List[Order], max_distance_km: float = 5.0) -> Dict[str, List[Order]]:
    """Group orders by nearby locations for efficient processing"""
    grouped = {}
    
    for order in orders:
        location_key = None
        
        # Find if order fits in existing group
        for key, group in grouped.items():
            if group:
                group_location = group[0].delivery_address
                if calculate_distance(order.delivery_address, group_location) <= max_distance_km:
                    location_key = key
                    break
        
        # Create new group if no nearby group found
        if location_key is None:
            location_key = f"group_{len(grouped) + 1}"
            grouped[location_key] = []
        
        grouped[location_key].append(order)
    
    return grouped

# Background Tasks
async def auto_update_order_status():
    """Background task to automatically update order status"""
    while True:
        try:
            # Find orders that need status updates
            orders = await db.orders.find({
                "status": {"$in": ["grinding", "packing"]},
                "updated_at": {"$lt": datetime.utcnow() - timedelta(minutes=5)}
            }).to_list(1000)
            
            for order in orders:
                order_obj = Order(**order)
                new_status = None
                
                if order_obj.status == "grinding":
                    new_status = "packing"
                elif order_obj.status == "packing":
                    new_status = "out_for_delivery"
                
                if new_status:
                    await db.orders.update_one(
                        {"id": order_obj.id},
                        {
                            "$set": {
                                "status": new_status,
                                "updated_at": datetime.utcnow()
                            }
                        }
                    )
                    
                    # Add status history
                    await db.order_status_history.insert_one({
                        "order_id": order_obj.id,
                        "status": new_status,
                        "updated_by": "system",
                        "notes": "Auto-updated by system",
                        "timestamp": datetime.utcnow()
                    })
            
            # Wait 1 minute before checking again
            await asyncio.sleep(60)
            
        except Exception as e:
            print(f"Error in auto_update_order_status: {e}")
            await asyncio.sleep(60)

# Authentication Routes
@api_router.post("/auth/register")
async def register_user(user_data: UserRegistration):
    try:
        # Check if user already exists
        existing_user = await db.users.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Hash password
        password_hash = hash_password(user_data.password)
        
        # Create user
        user = User(
            email=user_data.email,
            password_hash=password_hash,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            phone=user_data.phone,
            role=user_data.role
        )
        
        await db.users.insert_one(user.dict())
        
        # Generate OTP for verification
        otp = generate_otp()
        await db.otps.insert_one({
            "email": user_data.email,
            "otp": otp,
            "expires_at": datetime.utcnow() + timedelta(minutes=10)
        })
        
        send_otp_email(user_data.email, otp)
        
        return {"message": "User registered successfully. Please verify your email with OTP."}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/auth/verify-otp")
async def verify_otp(otp_data: OTPVerification):
    try:
        # Find OTP
        otp_record = await db.otps.find_one({
            "email": otp_data.email,
            "otp": otp_data.otp,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        if not otp_record:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        
        # Update user verification status
        await db.users.update_one(
            {"email": otp_data.email},
            {"$set": {"is_verified": True}}
        )
        
        # Delete OTP
        await db.otps.delete_one({"_id": otp_record["_id"]})
        
        return {"message": "Email verified successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/auth/login")
async def login_user(login_data: UserLogin):
    try:
        # Find user
        user = await db.users.find_one({"email": login_data.email})
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Verify password
        if not verify_password(login_data.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        if not user["is_verified"]:
            raise HTTPException(status_code=401, detail="Please verify your email first")
        
        # Create access token
        access_token = create_access_token(
            data={"sub": user["id"], "role": user["role"]}
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "email": user["email"],
                "first_name": user["first_name"],
                "last_name": user["last_name"],
                "role": user["role"]
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Grain Management Routes
@api_router.get("/grains")
async def get_grains():
    grains = await db.grains.find({"available": True}).to_list(1000)
    return [Grain(**grain) for grain in grains]

@api_router.post("/grains")
async def create_grain(grain_data: Grain, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create grains")
    
    grain_data.created_by = current_user.id
    await db.grains.insert_one(grain_data.dict())
    return grain_data

@api_router.get("/grind-options")
async def get_grind_options():
    return [
        {"type": "whole", "description": "Whole grains (no grinding)", "additional_cost": 0.0, "processing_time_minutes": 0},
        {"type": "coarse", "description": "Coarse grind - chunky texture", "additional_cost": 5.0, "processing_time_minutes": 5},
        {"type": "medium", "description": "Medium grind - balanced texture", "additional_cost": 8.0, "processing_time_minutes": 8},
        {"type": "fine", "description": "Fine grind - smooth texture", "additional_cost": 12.0, "processing_time_minutes": 12},
        {"type": "powder", "description": "Powder grind - very fine flour", "additional_cost": 15.0, "processing_time_minutes": 15}
    ]

# Order Management Routes
@api_router.post("/orders")
async def create_order(order_data: Dict[str, Any], current_user: User = Depends(get_current_user)):
    try:
        # Calculate total amount
        total_amount = sum(item["total_price"] for item in order_data["items"])
        
        # Create Razorpay order
        razorpay_order = razorpay_client.order.create({
            "amount": int(total_amount * 100),  # Convert to paise
            "currency": "INR",
            "receipt": str(uuid.uuid4()),
            "notes": {
                "customer_id": current_user.id,
                "order_type": "grain_order"
            }
        })
        
        # Find nearest grinding store
        grinding_store = await db.grinding_stores.find_one({"is_active": True})
        
        order = Order(
            customer_id=current_user.id,
            items=[OrderItem(**item) for item in order_data["items"]],
            delivery_address=order_data["delivery_address"],
            delivery_slot=order_data.get("delivery_slot"),
            delivery_date=datetime.fromisoformat(order_data["delivery_date"]) if order_data.get("delivery_date") else None,
            grinding_store_id=grinding_store["id"] if grinding_store else None,
            total_amount=total_amount,
            razorpay_order_id=razorpay_order["id"],
            notes=order_data.get("notes")
        )
        
        await db.orders.insert_one(order.dict())
        
        return {
            "order_id": order.id,
            "razorpay_order_id": razorpay_order["id"],
            "amount": razorpay_order["amount"],
            "currency": razorpay_order["currency"],
            "key_id": os.getenv("RAZORPAY_KEY_ID", "rzp_test_demo")
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/orders/verify-payment")
async def verify_payment(verification_data: Dict[str, str]):
    try:
        import hmac
        import hashlib
        
        # Verify signature
        generated_signature = hmac.new(
            os.getenv("RAZORPAY_KEY_SECRET", "demo_secret").encode(),
            f"{verification_data['razorpay_order_id']}|{verification_data['razorpay_payment_id']}".encode(),
            hashlib.sha256
        ).hexdigest()
        
        if generated_signature != verification_data["razorpay_signature"]:
            raise HTTPException(status_code=400, detail="Invalid signature")
        
        # Update order status
        await db.orders.update_one(
            {"razorpay_order_id": verification_data["razorpay_order_id"]},
            {
                "$set": {
                    "payment_status": "paid",
                    "razorpay_payment_id": verification_data["razorpay_payment_id"],
                    "status": "confirmed",
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {"status": "success", "message": "Payment verified successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/orders/my-orders")
async def get_my_orders(current_user: User = Depends(get_current_user)):
    orders = await db.orders.find({"customer_id": current_user.id}).to_list(1000)
    return [Order(**order) for order in orders]

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, current_user: User = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order_obj = Order(**order)
    
    # Check if user has access to this order
    if current_user.role == "customer" and order_obj.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return order_obj

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status_data: Dict[str, str], current_user: User = Depends(get_current_user)):
    if current_user.role not in ["grinding_store", "admin", "delivery_boy"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    new_status = status_data["status"]
    
    # Update order status
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "status": new_status,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Add to status history
    await db.order_status_history.insert_one({
        "order_id": order_id,
        "status": new_status,
        "updated_by": current_user.id,
        "notes": status_data.get("notes", ""),
        "timestamp": datetime.utcnow()
    })
    
    return {"message": "Order status updated successfully"}

# Subscription Routes
@api_router.post("/subscriptions")
async def create_subscription(subscription_data: Dict[str, Any], current_user: User = Depends(get_current_user)):
    try:
        # Create subscription plan with Razorpay
        plan_data = {
            "period": "weekly",
            "interval": 1,
            "item": {
                "name": "Weekly Grain Delivery",
                "amount": int(subscription_data["total_amount"] * 100),
                "currency": "INR"
            }
        }
        
        razorpay_plan = razorpay_client.plan.create(plan_data)
        
        # Create subscription
        subscription = Subscription(
            customer_id=current_user.id,
            items=[OrderItem(**item) for item in subscription_data["items"]],
            delivery_address=subscription_data["delivery_address"],
            delivery_slot=subscription_data["delivery_slot"],
            delivery_day=subscription_data.get("delivery_day", "monday"),
            total_amount=subscription_data["total_amount"],
            next_delivery_date=datetime.fromisoformat(subscription_data["next_delivery_date"])
        )
        
        await db.subscriptions.insert_one(subscription.dict())
        
        return {"subscription_id": subscription.id, "plan_id": razorpay_plan["id"]}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/subscriptions/my-subscriptions")
async def get_my_subscriptions(current_user: User = Depends(get_current_user)):
    subscriptions = await db.subscriptions.find({"customer_id": current_user.id}).to_list(1000)
    return [Subscription(**sub) for sub in subscriptions]

# Grinding Store Routes
@api_router.get("/grinding-stores/orders")
async def get_grinding_store_orders(current_user: User = Depends(get_current_user)):
    if current_user.role != "grinding_store":
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get grinding store info
    grinding_store = await db.grinding_stores.find_one({"owner_id": current_user.id})
    if not grinding_store:
        raise HTTPException(status_code=404, detail="Grinding store not found")
    
    # Get orders assigned to this store
    orders = await db.orders.find({
        "grinding_store_id": grinding_store["id"],
        "status": {"$in": ["confirmed", "grinding", "packing"]}
    }).to_list(1000)
    
    # Group orders by location
    order_objects = [Order(**order) for order in orders]
    grouped_orders = await group_orders_by_location(order_objects)
    
    return {"orders": order_objects, "grouped_orders": grouped_orders}

# Delivery Boy Routes
@api_router.get("/delivery/orders")
async def get_delivery_orders(current_user: User = Depends(get_current_user)):
    if current_user.role != "delivery_boy":
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get delivery boy info
    delivery_boy = await db.delivery_boys.find_one({"user_id": current_user.id})
    if not delivery_boy:
        raise HTTPException(status_code=404, detail="Delivery boy profile not found")
    
    # Get orders assigned to this delivery boy
    orders = await db.orders.find({
        "delivery_boy_id": delivery_boy["id"],
        "status": {"$in": ["out_for_delivery", "delivered"]}
    }).to_list(1000)
    
    return [Order(**order) for order in orders]

# Admin Routes
@api_router.post("/admin/grinding-stores")
async def create_grinding_store(store_data: GrindingStore, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.grinding_stores.insert_one(store_data.dict())
    return store_data

@api_router.post("/admin/delivery-boys")
async def create_delivery_boy(delivery_boy_data: DeliveryBoy, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.delivery_boys.insert_one(delivery_boy_data.dict())
    return delivery_boy_data

@api_router.get("/admin/dashboard")
async def get_admin_dashboard(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get dashboard statistics
    total_orders = await db.orders.count_documents({})
    total_customers = await db.users.count_documents({"role": "customer"})
    total_grinding_stores = await db.grinding_stores.count_documents({})
    total_delivery_boys = await db.delivery_boys.count_documents({})
    
    return {
        "total_orders": total_orders,
        "total_customers": total_customers,
        "total_grinding_stores": total_grinding_stores,
        "total_delivery_boys": total_delivery_boys
    }

# Initialize data
@app.on_event("startup")
async def startup_event():
    # Create initial grains data
    grain_count = await db.grains.count_documents({})
    if grain_count == 0:
        initial_grains = [
            {
                "id": "wheat-001",
                "name": "Premium Wheat",
                "description": "High-quality wheat grains perfect for grinding into flour",
                "price_per_kg": 45.0,
                "image_url": "https://images.pexels.com/photos/54084/wheat-grain-agriculture-seed-54084.jpeg",
                "category": "wheat",
                "stock_kg": 1000.0,
                "available": True,
                "created_by": "admin",
                "created_at": datetime.utcnow()
            },
            {
                "id": "millet-001",
                "name": "Organic Millet",
                "description": "Nutrient-rich millet grains for healthy grain mixes",
                "price_per_kg": 85.0,
                "image_url": "https://images.unsplash.com/photo-1542990253-a781e04c0082",
                "category": "millet",
                "stock_kg": 500.0,
                "available": True,
                "created_by": "admin",
                "created_at": datetime.utcnow()
            },
            {
                "id": "rice-001",
                "name": "Brown Rice",
                "description": "Whole grain brown rice for custom grain blends",
                "price_per_kg": 65.0,
                "image_url": "https://images.pexels.com/photos/1192053/pexels-photo-1192053.jpeg",
                "category": "rice",
                "stock_kg": 800.0,
                "available": True,
                "created_by": "admin",
                "created_at": datetime.utcnow()
            },
            {
                "id": "oats-001",
                "name": "Steel Cut Oats",
                "description": "Premium steel cut oats for nutritious grain mixes",
                "price_per_kg": 95.0,
                "image_url": "https://images.unsplash.com/photo-1651241587503-a874db54a1a7",
                "category": "oats",
                "stock_kg": 300.0,
                "available": True,
                "created_by": "admin",
                "created_at": datetime.utcnow()
            },
            {
                "id": "quinoa-001",
                "name": "Quinoa Seeds",
                "description": "Superfood quinoa seeds for protein-rich grain blends",
                "price_per_kg": 280.0,
                "image_url": "https://images.pexels.com/photos/1192037/pexels-photo-1192037.jpeg",
                "category": "quinoa",
                "stock_kg": 200.0,
                "available": True,
                "created_by": "admin",
                "created_at": datetime.utcnow()
            }
        ]
        await db.grains.insert_many(initial_grains)
    
    # Create admin user if doesn't exist
    admin_user = await db.users.find_one({"role": "admin"})
    if not admin_user:
        admin = User(
            email="admin@graincraft.com",
            password_hash=hash_password("admin123"),
            first_name="Admin",
            last_name="User",
            role="admin",
            is_verified=True
        )
        await db.users.insert_one(admin.dict())
    
    # Start background task for order status updates
    asyncio.create_task(auto_update_order_status())

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()