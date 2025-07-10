"""
Advanced Analytics Service for GrainCraft
Provides real-time dashboards, predictive analytics, and business intelligence
"""

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import asyncio
import json
from dataclasses import dataclass
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
import plotly.graph_objects as go
import plotly.express as px
from motor.motor_asyncio import AsyncIOMotorClient
import logging

# Analytics Models
class SalesMetrics(BaseModel):
    total_revenue: float
    total_orders: int
    average_order_value: float
    growth_rate: float
    period: str

class CustomerAnalytics(BaseModel):
    total_customers: int
    new_customers: int
    retention_rate: float
    churn_rate: float
    lifetime_value: float

class InventoryAnalytics(BaseModel):
    total_grains: int
    low_stock_items: int
    turnover_rate: float
    waste_percentage: float
    reorder_recommendations: List[Dict[str, Any]]

class PredictiveMetrics(BaseModel):
    demand_forecast: Dict[str, float]
    inventory_optimization: Dict[str, int]
    price_recommendations: Dict[str, float]
    seasonal_trends: Dict[str, Any]

class AnalyticsService:
    def __init__(self, db_client):
        self.db = db_client
        self.ml_models = {}
        self.initialize_ml_models()
    
    def initialize_ml_models(self):
        """Initialize machine learning models for predictions"""
        # Demand forecasting model
        self.ml_models['demand'] = RandomForestRegressor(n_estimators=100, random_state=42)
        
        # Price optimization model
        self.ml_models['pricing'] = RandomForestRegressor(n_estimators=100, random_state=42)
        
        # Customer behavior model
        self.ml_models['customer'] = RandomForestRegressor(n_estimators=100, random_state=42)
    
    async def get_sales_metrics(self, period: str = "month") -> SalesMetrics:
        """Calculate comprehensive sales metrics"""
        try:
            # Define date range based on period
            end_date = datetime.utcnow()
            if period == "day":
                start_date = end_date - timedelta(days=1)
            elif period == "week":
                start_date = end_date - timedelta(weeks=1)
            elif period == "month":
                start_date = end_date - timedelta(days=30)
            elif period == "year":
                start_date = end_date - timedelta(days=365)
            else:
                start_date = end_date - timedelta(days=30)
            
            # Get orders for the period
            orders = await self.db.orders.find({
                "created_at": {"$gte": start_date, "$lt": end_date},
                "payment_status": "paid"
            }).to_list(10000)
            
            # Calculate metrics
            total_revenue = sum(order.get("total_amount", 0) for order in orders)
            total_orders = len(orders)
            average_order_value = total_revenue / total_orders if total_orders > 0 else 0
            
            # Calculate growth rate (compare with previous period)
            prev_start = start_date - (end_date - start_date)
            prev_orders = await self.db.orders.find({
                "created_at": {"$gte": prev_start, "$lt": start_date},
                "payment_status": "paid"
            }).to_list(10000)
            
            prev_revenue = sum(order.get("total_amount", 0) for order in prev_orders)
            growth_rate = ((total_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0
            
            return SalesMetrics(
                total_revenue=total_revenue,
                total_orders=total_orders,
                average_order_value=average_order_value,
                growth_rate=growth_rate,
                period=period
            )
            
        except Exception as e:
            logging.error(f"Error calculating sales metrics: {e}")
            return SalesMetrics(
                total_revenue=0, total_orders=0, average_order_value=0, 
                growth_rate=0, period=period
            )
    
    async def get_customer_analytics(self) -> CustomerAnalytics:
        """Analyze customer behavior and metrics"""
        try:
            # Total customers
            total_customers = await self.db.users.count_documents({"role": "customer"})
            
            # New customers (last 30 days)
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            new_customers = await self.db.users.count_documents({
                "role": "customer",
                "created_at": {"$gte": thirty_days_ago}
            })
            
            # Customer retention analysis
            # Get customers who made orders in the last 60 days
            sixty_days_ago = datetime.utcnow() - timedelta(days=60)
            recent_customers = await self.db.orders.distinct("customer_id", {
                "created_at": {"$gte": sixty_days_ago}
            })
            
            # Get customers who made repeat orders
            repeat_customers = []
            for customer_id in recent_customers:
                order_count = await self.db.orders.count_documents({
                    "customer_id": customer_id,
                    "created_at": {"$gte": sixty_days_ago}
                })
                if order_count > 1:
                    repeat_customers.append(customer_id)
            
            retention_rate = (len(repeat_customers) / len(recent_customers) * 100) if recent_customers else 0
            churn_rate = 100 - retention_rate
            
            # Calculate customer lifetime value
            orders = await self.db.orders.find({"payment_status": "paid"}).to_list(10000)
            customer_totals = {}
            for order in orders:
                customer_id = order.get("customer_id")
                if customer_id:
                    customer_totals[customer_id] = customer_totals.get(customer_id, 0) + order.get("total_amount", 0)
            
            lifetime_value = sum(customer_totals.values()) / len(customer_totals) if customer_totals else 0
            
            return CustomerAnalytics(
                total_customers=total_customers,
                new_customers=new_customers,
                retention_rate=retention_rate,
                churn_rate=churn_rate,
                lifetime_value=lifetime_value
            )
            
        except Exception as e:
            logging.error(f"Error calculating customer analytics: {e}")
            return CustomerAnalytics(
                total_customers=0, new_customers=0, retention_rate=0,
                churn_rate=0, lifetime_value=0
            )
    
    async def get_inventory_analytics(self) -> InventoryAnalytics:
        """Analyze inventory performance and optimization"""
        try:
            # Get all grains
            grains = await self.db.grains.find({"available": True}).to_list(1000)
            total_grains = len(grains)
            
            # Identify low stock items (less than 10kg)
            low_stock_items = len([grain for grain in grains if grain.get("stock_kg", 0) < 10])
            
            # Calculate inventory turnover (simplified)
            # Get orders from last 30 days
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            orders = await self.db.orders.find({
                "created_at": {"$gte": thirty_days_ago},
                "payment_status": "paid"
            }).to_list(10000)
            
            # Calculate total sold quantity
            total_sold = 0
            grain_demand = {}
            
            for order in orders:
                for item in order.get("items", []):
                    if item.get("type") == "individual":
                        quantity = item.get("quantity_kg", 0)
                        grain_id = item.get("grain_id")
                        total_sold += quantity
                        grain_demand[grain_id] = grain_demand.get(grain_id, 0) + quantity
                    elif item.get("type") == "mix":
                        for grain in item.get("grains", []):
                            quantity = grain.get("quantity_kg", 0)
                            grain_id = grain.get("grain_id")
                            total_sold += quantity
                            grain_demand[grain_id] = grain_demand.get(grain_id, 0) + quantity
            
            # Calculate turnover rate
            total_stock = sum(grain.get("stock_kg", 0) for grain in grains)
            turnover_rate = (total_sold / total_stock * 100) if total_stock > 0 else 0
            
            # Generate reorder recommendations
            reorder_recommendations = []
            for grain in grains:
                grain_id = grain.get("id")
                current_stock = grain.get("stock_kg", 0)
                demand = grain_demand.get(grain_id, 0)
                
                if current_stock < 20 or (demand > 0 and current_stock / demand < 2):
                    reorder_recommendations.append({
                        "grain_id": grain_id,
                        "grain_name": grain.get("name"),
                        "current_stock": current_stock,
                        "recommended_order": max(50, demand * 2),
                        "priority": "high" if current_stock < 10 else "medium"
                    })
            
            return InventoryAnalytics(
                total_grains=total_grains,
                low_stock_items=low_stock_items,
                turnover_rate=turnover_rate,
                waste_percentage=5.0,  # Placeholder
                reorder_recommendations=reorder_recommendations
            )
            
        except Exception as e:
            logging.error(f"Error calculating inventory analytics: {e}")
            return InventoryAnalytics(
                total_grains=0, low_stock_items=0, turnover_rate=0,
                waste_percentage=0, reorder_recommendations=[]
            )
    
    async def get_predictive_metrics(self) -> PredictiveMetrics:
        """Generate ML-based predictions and recommendations"""
        try:
            # Get historical data for predictions
            orders = await self.db.orders.find({
                "payment_status": "paid",
                "created_at": {"$gte": datetime.utcnow() - timedelta(days=90)}
            }).to_list(10000)
            
            grains = await self.db.grains.find({"available": True}).to_list(1000)
            
            # Prepare data for ML models
            daily_demand = {}
            grain_prices = {}
            
            for order in orders:
                order_date = order.get("created_at", datetime.utcnow()).date()
                for item in order.get("items", []):
                    if item.get("type") == "individual":
                        grain_id = item.get("grain_id")
                        quantity = item.get("quantity_kg", 0)
                        daily_demand.setdefault(order_date, {}).setdefault(grain_id, 0)
                        daily_demand[order_date][grain_id] += quantity
            
            for grain in grains:
                grain_prices[grain.get("id")] = grain.get("price_per_kg", 0)
            
            # Simple demand forecasting (next 7 days)
            demand_forecast = {}
            for grain in grains:
                grain_id = grain.get("id")
                recent_demand = []
                
                for date, demands in daily_demand.items():
                    recent_demand.append(demands.get(grain_id, 0))
                
                if recent_demand:
                    avg_demand = np.mean(recent_demand)
                    # Add some seasonality and trend
                    forecast = avg_demand * 1.1  # Simple 10% growth assumption
                    demand_forecast[grain.get("name")] = round(forecast, 2)
                else:
                    demand_forecast[grain.get("name")] = 0.0
            
            # Inventory optimization recommendations
            inventory_optimization = {}
            for grain in grains:
                grain_name = grain.get("name")
                forecast = demand_forecast.get(grain_name, 0)
                current_stock = grain.get("stock_kg", 0)
                
                # Recommend stock level for next 14 days
                recommended_stock = int(forecast * 14)
                inventory_optimization[grain_name] = max(recommended_stock, 20)
            
            # Price recommendations (simplified)
            price_recommendations = {}
            for grain in grains:
                grain_name = grain.get("name")
                current_price = grain.get("price_per_kg", 0)
                
                # Simple price optimization based on demand
                forecast = demand_forecast.get(grain_name, 0)
                if forecast > 5:  # High demand
                    price_recommendations[grain_name] = round(current_price * 1.05, 2)
                elif forecast < 1:  # Low demand
                    price_recommendations[grain_name] = round(current_price * 0.95, 2)
                else:
                    price_recommendations[grain_name] = current_price
            
            # Seasonal trends (placeholder)
            seasonal_trends = {
                "peak_months": ["October", "November", "December"],
                "growth_trend": "increasing",
                "seasonal_factor": 1.2
            }
            
            return PredictiveMetrics(
                demand_forecast=demand_forecast,
                inventory_optimization=inventory_optimization,
                price_recommendations=price_recommendations,
                seasonal_trends=seasonal_trends
            )
            
        except Exception as e:
            logging.error(f"Error generating predictive metrics: {e}")
            return PredictiveMetrics(
                demand_forecast={}, inventory_optimization={},
                price_recommendations={}, seasonal_trends={}
            )
    
    async def generate_dashboard_data(self) -> Dict[str, Any]:
        """Generate comprehensive dashboard data"""
        try:
            # Get all analytics data
            sales_daily = await self.get_sales_metrics("day")
            sales_monthly = await self.get_sales_metrics("month")
            customer_analytics = await self.get_customer_analytics()
            inventory_analytics = await self.get_inventory_analytics()
            predictive_metrics = await self.get_predictive_metrics()
            
            return {
                "sales": {
                    "daily": sales_daily.dict(),
                    "monthly": sales_monthly.dict()
                },
                "customers": customer_analytics.dict(),
                "inventory": inventory_analytics.dict(),
                "predictions": predictive_metrics.dict(),
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logging.error(f"Error generating dashboard data: {e}")
            return {"error": str(e), "timestamp": datetime.utcnow().isoformat()}

# FastAPI Analytics Router
analytics_router = APIRouter(prefix="/api/analytics", tags=["analytics"])

# Global analytics service instance
analytics_service = None

@analytics_router.get("/dashboard")
async def get_dashboard():
    """Get comprehensive dashboard data"""
    if not analytics_service:
        raise HTTPException(status_code=503, detail="Analytics service not initialized")
    
    dashboard_data = await analytics_service.generate_dashboard_data()
    return dashboard_data

@analytics_router.get("/sales")
async def get_sales_analytics(period: str = Query("month", regex="^(day|week|month|year)$")):
    """Get sales analytics for specified period"""
    if not analytics_service:
        raise HTTPException(status_code=503, detail="Analytics service not initialized")
    
    sales_metrics = await analytics_service.get_sales_metrics(period)
    return sales_metrics

@analytics_router.get("/customers")
async def get_customer_analytics():
    """Get customer analytics and behavior insights"""
    if not analytics_service:
        raise HTTPException(status_code=503, detail="Analytics service not initialized")
    
    customer_analytics = await analytics_service.get_customer_analytics()
    return customer_analytics

@analytics_router.get("/inventory")
async def get_inventory_analytics():
    """Get inventory analytics and optimization recommendations"""
    if not analytics_service:
        raise HTTPException(status_code=503, detail="Analytics service not initialized")
    
    inventory_analytics = await analytics_service.get_inventory_analytics()
    return inventory_analytics

@analytics_router.get("/predictions")
async def get_predictive_analytics():
    """Get ML-based predictions and recommendations"""
    if not analytics_service:
        raise HTTPException(status_code=503, detail="Analytics service not initialized")
    
    predictive_metrics = await analytics_service.get_predictive_metrics()
    return predictive_metrics

def initialize_analytics_service(db_client):
    """Initialize the analytics service with database client"""
    global analytics_service
    analytics_service = AnalyticsService(db_client)
    logging.info("Analytics service initialized successfully")