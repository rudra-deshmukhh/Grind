"""
Smart Inventory Management System for GrainCraft
AI-powered inventory optimization, quality tracking, and automated reordering
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import numpy as np
from dataclasses import dataclass
from enum import Enum
import json

class InventoryAlert(Enum):
    LOW_STOCK = "low_stock"
    OUT_OF_STOCK = "out_of_stock"
    QUALITY_ISSUE = "quality_issue"
    EXPIRY_WARNING = "expiry_warning"
    REORDER_NEEDED = "reorder_needed"

@dataclass
class QualityMetrics:
    moisture_content: float
    purity_percentage: float
    freshness_score: float
    contamination_level: float
    overall_grade: str
    tested_at: datetime

@dataclass
class InventoryItem:
    grain_id: str
    batch_id: str
    current_stock: float
    reserved_stock: float
    available_stock: float
    minimum_threshold: float
    optimal_stock: float
    cost_per_kg: float
    supplier_id: str
    received_date: datetime
    expiry_date: Optional[datetime]
    quality_metrics: Optional[QualityMetrics]
    location: str
    last_updated: datetime

class SmartInventoryManager:
    def __init__(self, db_client):
        self.db = db_client
        self.alerts = []
        self.quality_thresholds = {
            "moisture_content": {"min": 8.0, "max": 14.0},
            "purity_percentage": {"min": 95.0, "max": 100.0},
            "freshness_score": {"min": 7.0, "max": 10.0},
            "contamination_level": {"min": 0.0, "max": 2.0}
        }
        
    async def initialize(self):
        """Initialize the smart inventory system"""
        try:
            logging.info("Initializing Smart Inventory Management System...")
            
            # Create inventory collection indexes
            await self.create_inventory_indexes()
            
            # Initialize inventory items for existing grains
            await self.initialize_inventory_items()
            
            # Start monitoring tasks
            asyncio.create_task(self.continuous_monitoring())
            
            logging.info("Smart Inventory Management System initialized successfully")
            
        except Exception as e:
            logging.error(f"Failed to initialize smart inventory: {e}")
            
    async def create_inventory_indexes(self):
        """Create database indexes for inventory operations"""
        try:
            # Index for grain_id lookup
            await self.db.inventory.create_index("grain_id")
            
            # Index for batch_id lookup
            await self.db.inventory.create_index("batch_id", unique=True)
            
            # Index for expiry date monitoring
            await self.db.inventory.create_index("expiry_date")
            
            # Index for stock level queries
            await self.db.inventory.create_index([("grain_id", 1), ("available_stock", 1)])
            
            # Index for supplier queries
            await self.db.inventory.create_index("supplier_id")
            
        except Exception as e:
            logging.error(f"Error creating inventory indexes: {e}")
            
    async def initialize_inventory_items(self):
        """Initialize inventory items for existing grains"""
        try:
            grains = await self.db.grains.find({"available": True}).to_list(1000)
            
            for grain in grains:
                existing_inventory = await self.db.inventory.find_one({"grain_id": grain["id"]})
                
                if not existing_inventory:
                    # Create initial inventory item
                    inventory_item = {
                        "grain_id": grain["id"],
                        "batch_id": f"BATCH_{grain['id']}_{datetime.utcnow().strftime('%Y%m%d')}",
                        "current_stock": grain.get("stock_kg", 100.0),
                        "reserved_stock": 0.0,
                        "available_stock": grain.get("stock_kg", 100.0),
                        "minimum_threshold": 10.0,
                        "optimal_stock": 100.0,
                        "cost_per_kg": grain.get("price_per_kg", 0) * 0.7,  # Assume 30% markup
                        "supplier_id": "DEFAULT_SUPPLIER",
                        "received_date": datetime.utcnow(),
                        "expiry_date": datetime.utcnow() + timedelta(days=365),
                        "quality_metrics": {
                            "moisture_content": 12.0,
                            "purity_percentage": 98.0,
                            "freshness_score": 9.0,
                            "contamination_level": 0.5,
                            "overall_grade": "A",
                            "tested_at": datetime.utcnow()
                        },
                        "location": "WAREHOUSE_A",
                        "last_updated": datetime.utcnow(),
                        "created_at": datetime.utcnow()
                    }
                    
                    await self.db.inventory.insert_one(inventory_item)
                    
        except Exception as e:
            logging.error(f"Error initializing inventory items: {e}")
            
    async def continuous_monitoring(self):
        """Continuous monitoring of inventory levels and quality"""
        while True:
            try:
                await self.check_stock_levels()
                await self.check_quality_metrics()
                await self.check_expiry_dates()
                await self.generate_reorder_recommendations()
                
                # Sleep for 1 hour before next check
                await asyncio.sleep(3600)
                
            except Exception as e:
                logging.error(f"Error in continuous monitoring: {e}")
                await asyncio.sleep(3600)
                
    async def check_stock_levels(self):
        """Check inventory stock levels and generate alerts"""
        try:
            low_stock_items = await self.db.inventory.find({
                "available_stock": {"$lte": "$minimum_threshold"}
            }).to_list(1000)
            
            for item in low_stock_items:
                if item["available_stock"] <= 0:
                    await self.create_alert(
                        InventoryAlert.OUT_OF_STOCK,
                        f"Grain {item['grain_id']} is out of stock",
                        {"grain_id": item["grain_id"], "batch_id": item["batch_id"]}
                    )
                else:
                    await self.create_alert(
                        InventoryAlert.LOW_STOCK,
                        f"Grain {item['grain_id']} stock is below minimum threshold",
                        {"grain_id": item["grain_id"], "current_stock": item["available_stock"]}
                    )
                    
        except Exception as e:
            logging.error(f"Error checking stock levels: {e}")
            
    async def check_quality_metrics(self):
        """Check quality metrics and generate alerts for quality issues"""
        try:
            inventory_items = await self.db.inventory.find({}).to_list(1000)
            
            for item in inventory_items:
                quality_metrics = item.get("quality_metrics", {})
                issues = []
                
                # Check moisture content
                moisture = quality_metrics.get("moisture_content", 0)
                moisture_thresholds = self.quality_thresholds["moisture_content"]
                if moisture < moisture_thresholds["min"] or moisture > moisture_thresholds["max"]:
                    issues.append(f"Moisture content: {moisture}% (optimal: {moisture_thresholds['min']}-{moisture_thresholds['max']}%)")
                    
                # Check purity
                purity = quality_metrics.get("purity_percentage", 0)
                purity_thresholds = self.quality_thresholds["purity_percentage"]
                if purity < purity_thresholds["min"]:
                    issues.append(f"Purity: {purity}% (minimum: {purity_thresholds['min']}%)")
                    
                # Check contamination
                contamination = quality_metrics.get("contamination_level", 0)
                contamination_thresholds = self.quality_thresholds["contamination_level"]
                if contamination > contamination_thresholds["max"]:
                    issues.append(f"Contamination level: {contamination}% (maximum: {contamination_thresholds['max']}%)")
                    
                if issues:
                    await self.create_alert(
                        InventoryAlert.QUALITY_ISSUE,
                        f"Quality issues detected for grain {item['grain_id']}: {'; '.join(issues)}",
                        {"grain_id": item["grain_id"], "batch_id": item["batch_id"], "issues": issues}
                    )
                    
        except Exception as e:
            logging.error(f"Error checking quality metrics: {e}")
            
    async def check_expiry_dates(self):
        """Check for items approaching expiry"""
        try:
            warning_date = datetime.utcnow() + timedelta(days=30)  # 30 days warning
            
            expiring_items = await self.db.inventory.find({
                "expiry_date": {"$lte": warning_date, "$gte": datetime.utcnow()}
            }).to_list(1000)
            
            for item in expiring_items:
                days_to_expiry = (item["expiry_date"] - datetime.utcnow()).days
                
                await self.create_alert(
                    InventoryAlert.EXPIRY_WARNING,
                    f"Grain {item['grain_id']} expires in {days_to_expiry} days",
                    {
                        "grain_id": item["grain_id"], 
                        "batch_id": item["batch_id"],
                        "expiry_date": item["expiry_date"].isoformat(),
                        "days_to_expiry": days_to_expiry
                    }
                )
                
        except Exception as e:
            logging.error(f"Error checking expiry dates: {e}")
            
    async def generate_reorder_recommendations(self):
        """Generate intelligent reorder recommendations"""
        try:
            # Get demand predictions for next 30 days
            inventory_items = await self.db.inventory.find({}).to_list(1000)
            
            for item in inventory_items:
                grain_id = item["grain_id"]
                current_stock = item["available_stock"]
                minimum_threshold = item["minimum_threshold"]
                
                # Calculate projected demand (simplified)
                recent_orders = await self.db.orders.find({
                    "created_at": {"$gte": datetime.utcnow() - timedelta(days=30)},
                    "payment_status": "paid"
                }).to_list(1000)
                
                total_demand = 0
                for order in recent_orders:
                    for order_item in order.get("items", []):
                        if order_item.get("grain_id") == grain_id:
                            total_demand += order_item.get("quantity_kg", 0)
                            
                daily_demand = total_demand / 30 if total_demand > 0 else 0.1
                projected_30_day_demand = daily_demand * 30
                
                # Check if reorder is needed
                if current_stock <= minimum_threshold or current_stock < projected_30_day_demand:
                    reorder_quantity = max(
                        item["optimal_stock"] - current_stock,
                        projected_30_day_demand * 1.5  # 50% buffer
                    )
                    
                    await self.create_alert(
                        InventoryAlert.REORDER_NEEDED,
                        f"Reorder needed for grain {grain_id}",
                        {
                            "grain_id": grain_id,
                            "current_stock": current_stock,
                            "projected_demand": projected_30_day_demand,
                            "recommended_order_quantity": round(reorder_quantity, 2),
                            "supplier_id": item["supplier_id"]
                        }
                    )
                    
        except Exception as e:
            logging.error(f"Error generating reorder recommendations: {e}")
            
    async def create_alert(self, alert_type: InventoryAlert, message: str, metadata: Dict[str, Any]):
        """Create and store an inventory alert"""
        try:
            alert = {
                "id": f"alert_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{len(self.alerts)}",
                "type": alert_type.value,
                "message": message,
                "metadata": metadata,
                "severity": self.get_alert_severity(alert_type),
                "status": "active",
                "created_at": datetime.utcnow(),
                "acknowledged": False
            }
            
            # Store in database
            await self.db.inventory_alerts.insert_one(alert)
            
            # Add to in-memory list
            self.alerts.append(alert)
            
            # Send real-time notification (if implemented)
            await self.send_alert_notification(alert)
            
        except Exception as e:
            logging.error(f"Error creating alert: {e}")
            
    def get_alert_severity(self, alert_type: InventoryAlert) -> str:
        """Get severity level for alert type"""
        severity_map = {
            InventoryAlert.OUT_OF_STOCK: "critical",
            InventoryAlert.LOW_STOCK: "high",
            InventoryAlert.QUALITY_ISSUE: "medium",
            InventoryAlert.EXPIRY_WARNING: "medium",
            InventoryAlert.REORDER_NEEDED: "low"
        }
        return severity_map.get(alert_type, "low")
        
    async def send_alert_notification(self, alert: Dict[str, Any]):
        """Send alert notification to relevant stakeholders"""
        # This could integrate with email, SMS, or push notification services
        logging.info(f"INVENTORY ALERT: {alert['message']}")
        
    async def reserve_stock(self, grain_id: str, quantity: float) -> bool:
        """Reserve stock for an order"""
        try:
            inventory_item = await self.db.inventory.find_one({"grain_id": grain_id})
            
            if not inventory_item:
                return False
                
            available_stock = inventory_item["available_stock"]
            
            if available_stock >= quantity:
                # Update stock levels
                await self.db.inventory.update_one(
                    {"grain_id": grain_id},
                    {
                        "$inc": {
                            "reserved_stock": quantity,
                            "available_stock": -quantity
                        },
                        "$set": {"last_updated": datetime.utcnow()}
                    }
                )
                return True
            else:
                return False
                
        except Exception as e:
            logging.error(f"Error reserving stock: {e}")
            return False
            
    async def release_stock(self, grain_id: str, quantity: float):
        """Release reserved stock (e.g., when order is cancelled)"""
        try:
            await self.db.inventory.update_one(
                {"grain_id": grain_id},
                {
                    "$inc": {
                        "reserved_stock": -quantity,
                        "available_stock": quantity
                    },
                    "$set": {"last_updated": datetime.utcnow()}
                }
            )
            
        except Exception as e:
            logging.error(f"Error releasing stock: {e}")
            
    async def consume_stock(self, grain_id: str, quantity: float):
        """Consume stock (when order is fulfilled)"""
        try:
            inventory_item = await self.db.inventory.find_one({"grain_id": grain_id})
            
            if inventory_item:
                new_current_stock = inventory_item["current_stock"] - quantity
                new_reserved_stock = max(0, inventory_item["reserved_stock"] - quantity)
                
                await self.db.inventory.update_one(
                    {"grain_id": grain_id},
                    {
                        "$set": {
                            "current_stock": new_current_stock,
                            "reserved_stock": new_reserved_stock,
                            "last_updated": datetime.utcnow()
                        }
                    }
                )
                
                # Update grain stock in main collection
                await self.db.grains.update_one(
                    {"id": grain_id},
                    {"$set": {"stock_kg": new_current_stock}}
                )
                
        except Exception as e:
            logging.error(f"Error consuming stock: {e}")
            
    async def add_stock(self, grain_id: str, quantity: float, supplier_id: str, quality_metrics: Optional[Dict] = None):
        """Add new stock to inventory"""
        try:
            batch_id = f"BATCH_{grain_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            
            # Create new inventory entry for the batch
            inventory_item = {
                "grain_id": grain_id,
                "batch_id": batch_id,
                "current_stock": quantity,
                "reserved_stock": 0.0,
                "available_stock": quantity,
                "minimum_threshold": 10.0,
                "optimal_stock": quantity * 2,
                "cost_per_kg": 0.0,  # To be updated with actual cost
                "supplier_id": supplier_id,
                "received_date": datetime.utcnow(),
                "expiry_date": datetime.utcnow() + timedelta(days=365),
                "quality_metrics": quality_metrics or {
                    "moisture_content": 12.0,
                    "purity_percentage": 98.0,
                    "freshness_score": 9.0,
                    "contamination_level": 0.5,
                    "overall_grade": "A",
                    "tested_at": datetime.utcnow()
                },
                "location": "WAREHOUSE_A",
                "last_updated": datetime.utcnow(),
                "created_at": datetime.utcnow()
            }
            
            await self.db.inventory.insert_one(inventory_item)
            
            # Update total stock in grains collection
            grain = await self.db.grains.find_one({"id": grain_id})
            if grain:
                new_total_stock = grain.get("stock_kg", 0) + quantity
                await self.db.grains.update_one(
                    {"id": grain_id},
                    {"$set": {"stock_kg": new_total_stock}}
                )
                
        except Exception as e:
            logging.error(f"Error adding stock: {e}")
            
    async def get_inventory_analytics(self) -> Dict[str, Any]:
        """Get comprehensive inventory analytics"""
        try:
            analytics = {
                "total_items": 0,
                "total_value": 0,
                "low_stock_items": 0,
                "quality_issues": 0,
                "expiring_soon": 0,
                "top_performing_grains": [],
                "inventory_turnover": {},
                "alerts_summary": {}
            }
            
            # Get all inventory items
            inventory_items = await self.db.inventory.find({}).to_list(1000)
            analytics["total_items"] = len(inventory_items)
            
            # Calculate metrics
            for item in inventory_items:
                # Total value
                analytics["total_value"] += item["current_stock"] * item.get("cost_per_kg", 0)
                
                # Low stock items
                if item["available_stock"] <= item["minimum_threshold"]:
                    analytics["low_stock_items"] += 1
                    
                # Quality issues
                quality_metrics = item.get("quality_metrics", {})
                if (quality_metrics.get("contamination_level", 0) > 2.0 or 
                    quality_metrics.get("purity_percentage", 100) < 95.0):
                    analytics["quality_issues"] += 1
                    
                # Expiring soon (30 days)
                if item.get("expiry_date"):
                    days_to_expiry = (item["expiry_date"] - datetime.utcnow()).days
                    if days_to_expiry <= 30:
                        analytics["expiring_soon"] += 1
                        
            # Get alerts summary
            alerts = await self.db.inventory_alerts.find({
                "status": "active",
                "created_at": {"$gte": datetime.utcnow() - timedelta(days=7)}
            }).to_list(1000)
            
            alert_types = {}
            for alert in alerts:
                alert_type = alert["type"]
                alert_types[alert_type] = alert_types.get(alert_type, 0) + 1
                
            analytics["alerts_summary"] = alert_types
            
            return analytics
            
        except Exception as e:
            logging.error(f"Error getting inventory analytics: {e}")
            return {}
            
    async def get_active_alerts(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get active inventory alerts"""
        try:
            alerts = await self.db.inventory_alerts.find({
                "status": "active"
            }).sort("created_at", -1).limit(limit).to_list(limit)
            
            # Clean alerts for JSON serialization
            for alert in alerts:
                if "_id" in alert:
                    del alert["_id"]
                if "created_at" in alert and isinstance(alert["created_at"], datetime):
                    alert["created_at"] = alert["created_at"].isoformat()
                    
            return alerts
            
        except Exception as e:
            logging.error(f"Error getting active alerts: {e}")
            return []

# Global inventory manager instance
inventory_manager = None

async def initialize_inventory_manager(db_client):
    """Initialize the global inventory manager"""
    global inventory_manager
    inventory_manager = SmartInventoryManager(db_client)
    await inventory_manager.initialize()
    logging.info("Global inventory manager initialized")

async def reserve_inventory_stock(grain_id: str, quantity: float) -> bool:
    """Reserve stock for an order"""
    if inventory_manager:
        return await inventory_manager.reserve_stock(grain_id, quantity)
    return False

async def consume_inventory_stock(grain_id: str, quantity: float):
    """Consume stock when order is fulfilled"""
    if inventory_manager:
        await inventory_manager.consume_stock(grain_id, quantity)

async def get_inventory_alerts(limit: int = 50) -> List[Dict[str, Any]]:
    """Get active inventory alerts"""
    if inventory_manager:
        return await inventory_manager.get_active_alerts(limit)
    return []

async def get_inventory_analytics() -> Dict[str, Any]:
    """Get inventory analytics"""
    if inventory_manager:
        return await inventory_manager.get_inventory_analytics()
    return {}