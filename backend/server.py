from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
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
import asyncio
import json
import redis
from geopy.distance import geodesic
from geopy.geocoders import Nominatim
import hashlib
import time
from collections import defaultdict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Redis connection for caching and sessions
try:
    redis_client = redis.Redis(
        host=os.getenv('REDIS_HOST', 'localhost'),
        port=int(os.getenv('REDIS_PORT', 6379)),
        decode_responses=True,
        socket_connect_timeout=1,
        socket_timeout=1
    )
    # Test connection
    redis_available = redis_client.ping()
except:
    redis_available = False
    redis_client = None
    print("Redis not available, continuing without caching")

# Initialize Razorpay client
razorpay_client = razorpay.Client(auth=(
    os.getenv("RAZORPAY_KEY_ID", "rzp_test_demo"),
    os.getenv("RAZORPAY_KEY_SECRET", "demo_secret")
))

# Create the main app
app = FastAPI(
    title="GrainCraft Scalable Platform", 
    version="2.1.0",
    description="High-Performance Multi-Role Grain Ecommerce Platform"
)

# Add security middleware
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])
app.add_middleware(GZipMiddleware, minimum_size=1000)

api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-here")
JWT_ALGORITHM = "HS256"

# Rate limiting
request_counts = defaultdict(list)
RATE_LIMIT_REQUESTS = 100  # requests per minute
RATE_LIMIT_WINDOW = 60  # seconds

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.user_connections[user_id] = websocket

    def disconnect(self, websocket: WebSocket, user_id: str):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if user_id in self.user_connections:
            del self.user_connections[user_id]

    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.user_connections:
            await self.user_connections[user_id].send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

# Enhanced Models with caching
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    password_hash: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: str = "customer"
    is_verified: bool = False
    is_active: bool = True
    profile_data: Dict[str, Any] = {}
    last_login: Optional[datetime] = None
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
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    items: List[Dict[str, Any]]
    delivery_address: Dict[str, Any]
    delivery_slot: Optional[str] = None
    delivery_date: Optional[datetime] = None
    grinding_store_id: Optional[str] = None
    delivery_boy_id: Optional[str] = None
    status: str = "pending"
    payment_status: str = "pending"
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    total_amount: float
    delivery_fee: float = 0.0
    is_subscription: bool = False
    subscription_id: Optional[str] = None
    notes: Optional[str] = None
    priority: int = 1  # 1=normal, 2=high, 3=urgent
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Rate limiting middleware
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host
    current_time = time.time()
    
    # Clean old requests
    request_counts[client_ip] = [
        req_time for req_time in request_counts[client_ip]
        if current_time - req_time < RATE_LIMIT_WINDOW
    ]
    
    # Check rate limit
    if len(request_counts[client_ip]) >= RATE_LIMIT_REQUESTS:
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded"}
        )
    
    # Add current request
    request_counts[client_ip].append(current_time)
    
    response = await call_next(request)
    return response

app.middleware("http")(rate_limit_middleware)

# Utility Functions with Redis caching
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
        
        # Try to get user from cache first if Redis is available
        if redis_available and redis_client:
            cached_user = redis_client.get(f"user:{user_id}")
            if cached_user:
                user_data = json.loads(cached_user)
                return User(**user_data)
        
        # Get from database if not in cache or Redis not available
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Cache user for 15 minutes if Redis is available
        user_obj = User(**user)
        if redis_available and redis_client:
            redis_client.setex(f"user:{user_id}", 900, json.dumps(user_obj.dict(), default=str))
        
        return user_obj
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

def generate_otp() -> str:
    import random
    return str(random.randint(100000, 999999))

async def send_notification(user_id: str, message: str, notification_type: str = "info"):
    """Send real-time notification via WebSocket"""
    notification = {
        "type": notification_type,
        "message": message,
        "timestamp": datetime.utcnow().isoformat()
    }
    await manager.send_personal_message(json.dumps(notification), user_id)

# Background task queue simulation
async def process_order_status_update(order_id: str, new_status: str):
    """Background task to process order status updates"""
    try:
        # Update order in database
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
            "updated_by": "system",
            "notes": "Auto-updated by system",
            "timestamp": datetime.utcnow()
        })
        
        # Get order details for notification
        order = await db.orders.find_one({"id": order_id})
        if order:
            # Send notification to customer
            await send_notification(
                order["customer_id"],
                f"Your order status has been updated to: {new_status}",
                "order_update"
            )
            
            # Clear related cache
            redis_client.delete(f"orders:{order['customer_id']}")
            
    except Exception as e:
        logging.error(f"Error processing order status update: {e}")

# Auto order status progression
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
                    await process_order_status_update(order_obj.id, new_status)
            
            # Wait 1 minute before checking again
            await asyncio.sleep(60)
            
        except Exception as e:
            logging.error(f"Error in auto_update_order_status: {e}")
            await asyncio.sleep(60)

# Optimized Routes with caching
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
        
        # Store OTP in Redis if available, otherwise use a fixed OTP for demo
        if redis_available and redis_client:
            redis_client.setex(f"otp:{user_data.email}", 600, otp)  # 10 minutes expiry
        else:
            # For demo purposes, use a fixed OTP when Redis is not available
            otp = "123456"
        
        # In production, send actual email/SMS
        print(f"OTP for {user_data.email}: {otp}")
        
        return {"message": "User registered successfully. Please verify your email with OTP."}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/auth/verify-otp")
async def verify_otp(otp_data: OTPVerification):
    try:
        # Get OTP from Redis if available
        stored_otp = None
        if redis_available and redis_client:
            stored_otp = redis_client.get(f"otp:{otp_data.email}")
        
        # For demo purposes, accept "123456" when Redis is not available
        if not redis_available or not stored_otp:
            if otp_data.otp == "123456":
                stored_otp = "123456"
        
        if not stored_otp or stored_otp != otp_data.otp:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        
        # Update user verification status
        await db.users.update_one(
            {"email": otp_data.email},
            {"$set": {"is_verified": True}}
        )
        
        # Delete OTP if Redis is available
        if redis_available and redis_client:
            redis_client.delete(f"otp:{otp_data.email}")
        
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
        
        # For demo purposes, skip verification check if it's the admin account
        if user["email"] != "admin@graincraft.com" and not user["is_verified"]:
            # Auto-verify admin account for demo
            if user["email"] == "admin@graincraft.com":
                await db.users.update_one(
                    {"id": user["id"]},
                    {"$set": {"is_verified": True}}
                )
            else:
                raise HTTPException(status_code=401, detail="Please verify your email first")
        
        # Update last login
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"last_login": datetime.utcnow()}}
        )
        
        # Create access token
        access_token = create_access_token(
            data={"sub": user["id"], "role": user["role"]}
        )
        
        # Cache user session if Redis is available
        user_obj = User(**user)
        if redis_available and redis_client:
            redis_client.setex(f"user:{user['id']}", 900, json.dumps(user_obj.dict(), default=str))
        
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

@api_router.get("/grains")
async def get_grains():
    try:
        # Try to get from cache first
        cached_grains = redis_client.get("grains:all")
        if cached_grains:
            return json.loads(cached_grains)
        
        # Get from database
        grains = await db.grains.find({"available": True}).to_list(1000)
        grain_objects = [Grain(**grain) for grain in grains]
        
        # Cache for 5 minutes
        redis_client.setex("grains:all", 300, json.dumps([grain.dict() for grain in grain_objects], default=str))
        
        return grain_objects
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
        
        # Find nearest grinding store with load balancing
        grinding_stores = await db.grinding_stores.find({"is_active": True}).to_list(1000)
        if grinding_stores:
            # Simple round-robin load balancing
            store_index = len(await db.orders.find({}).to_list(1)) % len(grinding_stores)
            selected_store = grinding_stores[store_index]
        else:
            selected_store = None
        
        order = Order(
            customer_id=current_user.id,
            items=order_data["items"],
            delivery_address=order_data["delivery_address"],
            delivery_slot=order_data.get("delivery_slot"),
            delivery_date=datetime.fromisoformat(order_data["delivery_date"]) if order_data.get("delivery_date") else None,
            grinding_store_id=selected_store["id"] if selected_store else None,
            total_amount=total_amount,
            razorpay_order_id=razorpay_order["id"],
            notes=order_data.get("notes"),
            priority=order_data.get("priority", 1)
        )
        
        await db.orders.insert_one(order.dict())
        
        # Clear user's order cache
        redis_client.delete(f"orders:{current_user.id}")
        
        # Send notification
        await send_notification(
            current_user.id,
            "Order created successfully! Proceed with payment.",
            "order_created"
        )
        
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
        order_update = await db.orders.update_one(
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
        
        if order_update.modified_count > 0:
            # Get order details
            order = await db.orders.find_one({"razorpay_order_id": verification_data["razorpay_order_id"]})
            if order:
                # Clear cache
                redis_client.delete(f"orders:{order['customer_id']}")
                
                # Send notification
                await send_notification(
                    order["customer_id"],
                    "Payment successful! Your order has been confirmed.",
                    "payment_success"
                )
                
                # Schedule automatic status update
                asyncio.create_task(
                    process_order_status_update(order["id"], "grinding")
                )
        
        return {"status": "success", "message": "Payment verified successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/orders/my-orders")
async def get_my_orders(current_user: User = Depends(get_current_user)):
    try:
        # Try cache first
        cached_orders = redis_client.get(f"orders:{current_user.id}")
        if cached_orders:
            return json.loads(cached_orders)
        
        # Get from database
        orders = await db.orders.find({"customer_id": current_user.id}).sort("created_at", -1).to_list(1000)
        order_objects = [Order(**order) for order in orders]
        
        # Cache for 5 minutes
        redis_client.setex(f"orders:{current_user.id}", 300, json.dumps([order.dict() for order in order_objects], default=str))
        
        return order_objects
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket endpoint for real-time updates
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming messages if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)

# Health check for load balancers
@api_router.get("/health")
async def health_check():
    try:
        # Check database connection
        await db.command("ping")
        
        # Check Redis connection
        redis_client.ping()
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "2.1.0"
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")

# Metrics endpoint
@api_router.get("/metrics")
async def get_metrics():
    try:
        total_users = await db.users.count_documents({})
        total_orders = await db.orders.count_documents({})
        active_orders = await db.orders.count_documents({"status": {"$in": ["confirmed", "grinding", "packing", "out_for_delivery"]}})
        
        return {
            "total_users": total_users,
            "total_orders": total_orders,
            "active_orders": active_orders,
            "active_connections": len(manager.active_connections),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Initialize data and start background tasks
@app.on_event("startup")
async def startup_event():
    # Create indexes for better performance
    try:
        await db.users.create_index("email", unique=True)
        await db.orders.create_index([("customer_id", 1), ("created_at", -1)])
        await db.orders.create_index("status")
        await db.grains.create_index("category")
        await db.grains.create_index("available")
    except Exception as e:
        logging.warning(f"Index creation warning: {e}")
    
    # Create initial grains data if not exists
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

# CORS middleware
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
    redis_client.close()