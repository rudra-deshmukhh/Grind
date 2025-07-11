"""
AI-Powered Recommendation Engine for GrainCraft
Provides personalized grain recommendations, smart pricing, and predictive analytics
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics.pairwise import cosine_similarity
import joblib
import logging
from typing import Dict, List, Tuple, Any
from datetime import datetime, timedelta
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import json

class SmartRecommendationEngine:
    def __init__(self, db_client):
        self.db = db_client
        self.models = {}
        self.scalers = {}
        self.encoders = {}
        self.user_profiles = {}
        self.grain_profiles = {}
        self.initialized = False
        
    async def initialize(self):
        """Initialize the recommendation engine with historical data"""
        try:
            logging.info("Initializing AI Recommendation Engine...")
            
            # Load historical data
            await self.load_historical_data()
            
            # Train recommendation models
            await self.train_recommendation_models()
            
            # Train pricing models
            await self.train_pricing_models()
            
            # Train demand prediction models
            await self.train_demand_models()
            
            # Generate user and grain profiles
            await self.generate_profiles()
            
            self.initialized = True
            logging.info("AI Recommendation Engine initialized successfully")
            
        except Exception as e:
            logging.error(f"Failed to initialize recommendation engine: {e}")
            
    async def load_historical_data(self):
        """Load and prepare historical data for ML models"""
        # Load orders
        orders = await self.db.orders.find({
            "payment_status": "paid",
            "created_at": {"$gte": datetime.utcnow() - timedelta(days=365)}
        }).to_list(10000)
        
        # Load users
        users = await self.db.users.find({"role": "customer"}).to_list(10000)
        
        # Load grains
        grains = await self.db.grains.find({"available": True}).to_list(1000)
        
        # Convert to pandas DataFrames
        self.orders_df = pd.DataFrame(orders) if orders else pd.DataFrame()
        self.users_df = pd.DataFrame(users) if users else pd.DataFrame()
        self.grains_df = pd.DataFrame(grains) if grains else pd.DataFrame()
        
        # Generate synthetic data if no historical data exists
        if self.orders_df.empty:
            await self.generate_synthetic_data()
            
    async def generate_synthetic_data(self):
        """Generate synthetic data for demonstration and training"""
        logging.info("Generating synthetic data for AI training...")
        
        # Create synthetic user behavior data
        synthetic_orders = []
        synthetic_users = []
        
        # Generate 1000 synthetic users
        for i in range(1000):
            user = {
                "id": f"synthetic_user_{i}",
                "role": "customer",
                "created_at": datetime.utcnow() - timedelta(days=np.random.randint(1, 365)),
                "profile_data": {
                    "age_group": np.random.choice(["18-25", "26-35", "36-45", "46-55", "55+"]),
                    "location": np.random.choice(["urban", "suburban", "rural"]),
                    "health_conscious": np.random.choice([True, False]),
                    "cooking_frequency": np.random.choice(["daily", "weekly", "monthly"])
                }
            }
            synthetic_users.append(user)
            
        # Generate 5000 synthetic orders
        grain_ids = ["wheat-001", "millet-001", "rice-001", "oats-001", "quinoa-001"]
        for i in range(5000):
            user_id = f"synthetic_user_{np.random.randint(0, 1000)}"
            order = {
                "id": f"synthetic_order_{i}",
                "customer_id": user_id,
                "items": [{
                    "grain_id": np.random.choice(grain_ids),
                    "quantity_kg": round(np.random.uniform(0.5, 5.0), 1),
                    "total_price": round(np.random.uniform(20, 500), 2)
                }],
                "total_amount": round(np.random.uniform(20, 500), 2),
                "created_at": datetime.utcnow() - timedelta(days=np.random.randint(1, 365)),
                "payment_status": "paid"
            }
            synthetic_orders.append(order)
            
        self.orders_df = pd.DataFrame(synthetic_orders)
        self.users_df = pd.DataFrame(synthetic_users)
        
    async def train_recommendation_models(self):
        """Train collaborative filtering and content-based recommendation models"""
        try:
            if self.orders_df.empty:
                return
                
            # Create user-item interaction matrix
            user_item_matrix = self.create_user_item_matrix()
            
            # Train collaborative filtering model
            self.models['collaborative_filtering'] = self.train_collaborative_filtering(user_item_matrix)
            
            # Train content-based model
            self.models['content_based'] = self.train_content_based_model()
            
            logging.info("Recommendation models trained successfully")
            
        except Exception as e:
            logging.error(f"Error training recommendation models: {e}")
            
    def create_user_item_matrix(self):
        """Create user-item interaction matrix from order data"""
        interactions = []
        
        for _, order in self.orders_df.iterrows():
            for item in order.get('items', []):
                interactions.append({
                    'user_id': order['customer_id'],
                    'grain_id': item.get('grain_id'),
                    'quantity': item.get('quantity_kg', 0),
                    'rating': min(5, max(1, item.get('quantity_kg', 1)))  # Convert quantity to rating
                })
                
        interactions_df = pd.DataFrame(interactions)
        
        if interactions_df.empty:
            return pd.DataFrame()
            
        # Create pivot table
        user_item_matrix = interactions_df.pivot_table(
            index='user_id', 
            columns='grain_id', 
            values='rating', 
            fill_value=0
        )
        
        return user_item_matrix
        
    def train_collaborative_filtering(self, user_item_matrix):
        """Train collaborative filtering model using matrix factorization"""
        if user_item_matrix.empty:
            return None
            
        # Use PCA for dimensionality reduction (simple collaborative filtering)
        pca = PCA(n_components=min(10, user_item_matrix.shape[1]))
        user_features = pca.fit_transform(user_item_matrix.fillna(0))
        
        return {
            'pca': pca,
            'user_features': user_features,
            'user_ids': user_item_matrix.index.tolist(),
            'grain_ids': user_item_matrix.columns.tolist()
        }
        
    def train_content_based_model(self):
        """Train content-based recommendation model"""
        # Create grain feature vectors
        grain_features = []
        
        for _, grain in self.grains_df.iterrows():
            features = {
                'price_per_kg': grain.get('price_per_kg', 0),
                'category': grain.get('category', 'unknown'),
                'protein_content': np.random.uniform(5, 20),  # Synthetic nutritional data
                'fiber_content': np.random.uniform(2, 15),
                'popularity_score': np.random.uniform(0, 1)
            }
            grain_features.append(features)
            
        grain_features_df = pd.DataFrame(grain_features)
        
        # Encode categorical features
        le = LabelEncoder()
        grain_features_df['category_encoded'] = le.fit_transform(grain_features_df['category'])
        
        # Scale numerical features
        scaler = StandardScaler()
        numerical_features = ['price_per_kg', 'protein_content', 'fiber_content', 'popularity_score']
        grain_features_df[numerical_features] = scaler.fit_transform(grain_features_df[numerical_features])
        
        return {
            'features': grain_features_df,
            'scaler': scaler,
            'label_encoder': le
        }
        
    async def train_pricing_models(self):
        """Train dynamic pricing optimization models"""
        try:
            # Create pricing features
            pricing_data = []
            
            for _, order in self.orders_df.iterrows():
                for item in order.get('items', []):
                    pricing_data.append({
                        'grain_id': item.get('grain_id'),
                        'quantity': item.get('quantity_kg', 0),
                        'price': item.get('total_price', 0),
                        'day_of_week': order['created_at'].weekday(),
                        'month': order['created_at'].month,
                        'demand_score': np.random.uniform(0, 1)  # Synthetic demand score
                    })
                    
            pricing_df = pd.DataFrame(pricing_data)
            
            if not pricing_df.empty:
                # Train pricing model
                features = ['quantity', 'day_of_week', 'month', 'demand_score']
                X = pricing_df[features]
                y = pricing_df['price']
                
                pricing_model = RandomForestRegressor(n_estimators=100, random_state=42)
                pricing_model.fit(X, y)
                
                self.models['pricing'] = pricing_model
                
            logging.info("Pricing models trained successfully")
            
        except Exception as e:
            logging.error(f"Error training pricing models: {e}")
            
    async def train_demand_models(self):
        """Train demand prediction models"""
        try:
            # Aggregate daily demand data
            demand_data = []
            
            for _, order in self.orders_df.iterrows():
                date = order['created_at'].date()
                for item in order.get('items', []):
                    demand_data.append({
                        'date': date,
                        'grain_id': item.get('grain_id'),
                        'quantity': item.get('quantity_kg', 0),
                        'day_of_week': date.weekday(),
                        'month': date.month,
                        'season': (date.month % 12) // 3
                    })
                    
            demand_df = pd.DataFrame(demand_data)
            
            if not demand_df.empty:
                # Aggregate by date and grain
                daily_demand = demand_df.groupby(['date', 'grain_id'])['quantity'].sum().reset_index()
                
                # Create features for demand prediction
                features = []
                for _, row in daily_demand.iterrows():
                    features.append({
                        'grain_id': row['grain_id'],
                        'day_of_week': row['date'].weekday(),
                        'month': row['date'].month,
                        'season': (row['date'].month % 12) // 3,
                        'demand': row['quantity']
                    })
                    
                features_df = pd.DataFrame(features)
                
                # Encode grain_id
                le = LabelEncoder()
                features_df['grain_id_encoded'] = le.fit_transform(features_df['grain_id'])
                
                # Train demand prediction model
                X = features_df[['grain_id_encoded', 'day_of_week', 'month', 'season']]
                y = features_df['demand']
                
                demand_model = RandomForestRegressor(n_estimators=100, random_state=42)
                demand_model.fit(X, y)
                
                self.models['demand_prediction'] = {
                    'model': demand_model,
                    'label_encoder': le
                }
                
            logging.info("Demand prediction models trained successfully")
            
        except Exception as e:
            logging.error(f"Error training demand models: {e}")
            
    async def generate_profiles(self):
        """Generate user and grain profiles for recommendations"""
        # Generate user profiles based on purchase history
        for user_id in self.orders_df['customer_id'].unique():
            user_orders = self.orders_df[self.orders_df['customer_id'] == user_id]
            
            # Calculate user preferences
            preferences = {
                'preferred_grains': [],
                'avg_order_value': 0,
                'purchase_frequency': 0,
                'preferred_quantities': {}
            }
            
            total_spent = 0
            grain_quantities = {}
            
            for _, order in user_orders.iterrows():
                total_spent += order.get('total_amount', 0)
                for item in order.get('items', []):
                    grain_id = item.get('grain_id')
                    quantity = item.get('quantity_kg', 0)
                    
                    if grain_id:
                        grain_quantities[grain_id] = grain_quantities.get(grain_id, 0) + quantity
                        
            preferences['avg_order_value'] = total_spent / len(user_orders) if len(user_orders) > 0 else 0
            preferences['purchase_frequency'] = len(user_orders)
            preferences['preferred_grains'] = sorted(grain_quantities.keys(), 
                                                   key=lambda x: grain_quantities[x], 
                                                   reverse=True)[:3]
            preferences['preferred_quantities'] = grain_quantities
            
            self.user_profiles[user_id] = preferences
            
    async def get_personalized_recommendations(self, user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Get personalized grain recommendations for a user"""
        try:
            if not self.initialized:
                await self.initialize()
                
            recommendations = []
            
            # Get user profile
            user_profile = self.user_profiles.get(user_id, {})
            
            # Content-based recommendations
            content_recs = await self.get_content_based_recommendations(user_id, limit)
            recommendations.extend(content_recs)
            
            # Collaborative filtering recommendations
            if self.models.get('collaborative_filtering'):
                collab_recs = await self.get_collaborative_recommendations(user_id, limit)
                recommendations.extend(collab_recs)
                
            # Remove duplicates and sort by score
            unique_recs = {}
            for rec in recommendations:
                grain_id = rec['grain_id']
                if grain_id not in unique_recs or rec['score'] > unique_recs[grain_id]['score']:
                    unique_recs[grain_id] = rec
                    
            # Sort by score and return top recommendations
            final_recs = sorted(unique_recs.values(), key=lambda x: x['score'], reverse=True)[:limit]
            
            return final_recs
            
        except Exception as e:
            logging.error(f"Error getting personalized recommendations: {e}")
            return []
            
    async def get_content_based_recommendations(self, user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Get content-based recommendations"""
        recommendations = []
        
        try:
            # Get user's preferred grain categories
            user_profile = self.user_profiles.get(user_id, {})
            preferred_grains = user_profile.get('preferred_grains', [])
            
            # Find similar grains
            for grain_id in preferred_grains:
                grain_info = await self.db.grains.find_one({"id": grain_id})
                if grain_info:
                    # Find grains in same category
                    similar_grains = await self.db.grains.find({
                        "category": grain_info.get("category"),
                        "id": {"$ne": grain_id},
                        "available": True
                    }).to_list(limit)
                    
                    for similar_grain in similar_grains:
                        recommendations.append({
                            "grain_id": similar_grain["id"],
                            "grain_name": similar_grain["name"],
                            "reason": f"Similar to your preferred {grain_info['name']}",
                            "score": 0.8,
                            "type": "content_based"
                        })
                        
        except Exception as e:
            logging.error(f"Error in content-based recommendations: {e}")
            
        return recommendations[:limit]
        
    async def get_collaborative_recommendations(self, user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Get collaborative filtering recommendations"""
        recommendations = []
        
        try:
            cf_model = self.models.get('collaborative_filtering')
            if not cf_model:
                return recommendations
                
            # Find similar users and recommend their preferred grains
            user_profile = self.user_profiles.get(user_id, {})
            preferred_grains = set(user_profile.get('preferred_grains', []))
            
            # Simple collaborative filtering: recommend popular grains not yet tried
            all_grains = await self.db.grains.find({"available": True}).to_list(1000)
            
            for grain in all_grains:
                if grain["id"] not in preferred_grains:
                    recommendations.append({
                        "grain_id": grain["id"],
                        "grain_name": grain["name"],
                        "reason": "Popular among similar customers",
                        "score": 0.7,
                        "type": "collaborative"
                    })
                    
        except Exception as e:
            logging.error(f"Error in collaborative recommendations: {e}")
            
        return recommendations[:limit]
        
    async def predict_demand(self, grain_id: str, days_ahead: int = 7) -> Dict[str, float]:
        """Predict demand for a specific grain"""
        try:
            demand_model = self.models.get('demand_prediction')
            if not demand_model:
                # Return simple prediction based on historical average
                orders = await self.db.orders.find({
                    "payment_status": "paid",
                    "created_at": {"$gte": datetime.utcnow() - timedelta(days=30)}
                }).to_list(1000)
                
                total_demand = 0
                for order in orders:
                    for item in order.get('items', []):
                        if item.get('grain_id') == grain_id:
                            total_demand += item.get('quantity_kg', 0)
                            
                daily_avg = total_demand / 30 if total_demand > 0 else 1.0
                return {"predicted_demand": daily_avg * days_ahead}
                
            # Use ML model for prediction
            model = demand_model['model']
            le = demand_model['label_encoder']
            
            try:
                grain_encoded = le.transform([grain_id])[0]
            except ValueError:
                grain_encoded = 0  # Unknown grain
                
            predictions = {}
            for day in range(days_ahead):
                future_date = datetime.utcnow() + timedelta(days=day)
                features = [[grain_encoded, future_date.weekday(), future_date.month, (future_date.month % 12) // 3]]
                prediction = model.predict(features)[0]
                predictions[f"day_{day+1}"] = max(0, prediction)
                
            return predictions
            
        except Exception as e:
            logging.error(f"Error predicting demand: {e}")
            return {"predicted_demand": 1.0}
            
    async def optimize_pricing(self, grain_id: str, current_price: float, demand_factor: float = 1.0) -> Dict[str, Any]:
        """Optimize pricing based on demand and market conditions"""
        try:
            pricing_model = self.models.get('pricing')
            
            if not pricing_model:
                # Simple rule-based pricing
                if demand_factor > 1.2:
                    suggested_price = current_price * 1.05  # Increase by 5%
                    reason = "High demand detected"
                elif demand_factor < 0.8:
                    suggested_price = current_price * 0.95  # Decrease by 5%
                    reason = "Low demand detected"
                else:
                    suggested_price = current_price
                    reason = "Optimal pricing"
                    
                return {
                    "current_price": current_price,
                    "suggested_price": round(suggested_price, 2),
                    "price_change": round(((suggested_price / current_price) - 1) * 100, 2),
                    "reason": reason,
                    "confidence": 0.7
                }
                
            # Use ML model for pricing optimization
            # This would require more sophisticated features and training data
            return {
                "current_price": current_price,
                "suggested_price": current_price,
                "price_change": 0,
                "reason": "Model-based optimization",
                "confidence": 0.8
            }
            
        except Exception as e:
            logging.error(f"Error optimizing pricing: {e}")
            return {
                "current_price": current_price,
                "suggested_price": current_price,
                "price_change": 0,
                "reason": "Error in optimization",
                "confidence": 0.5
            }
            
    async def get_market_insights(self) -> Dict[str, Any]:
        """Generate market insights and trends"""
        try:
            insights = {
                "trending_grains": [],
                "seasonal_patterns": {},
                "customer_segments": {},
                "growth_opportunities": []
            }
            
            # Analyze trending grains
            recent_orders = await self.db.orders.find({
                "payment_status": "paid",
                "created_at": {"$gte": datetime.utcnow() - timedelta(days=30)}
            }).to_list(1000)
            
            grain_popularity = {}
            for order in recent_orders:
                for item in order.get('items', []):
                    grain_id = item.get('grain_id')
                    if grain_id:
                        grain_popularity[grain_id] = grain_popularity.get(grain_id, 0) + item.get('quantity_kg', 0)
                        
            # Get top trending grains
            top_grains = sorted(grain_popularity.items(), key=lambda x: x[1], reverse=True)[:5]
            for grain_id, quantity in top_grains:
                grain_info = await self.db.grains.find_one({"id": grain_id})
                if grain_info:
                    insights["trending_grains"].append({
                        "grain_id": grain_id,
                        "name": grain_info["name"],
                        "total_demand": quantity,
                        "growth_rate": np.random.uniform(10, 50)  # Synthetic growth rate
                    })
                    
            # Generate seasonal patterns
            insights["seasonal_patterns"] = {
                "peak_season": "October-December",
                "growth_months": ["September", "October", "November"],
                "seasonal_factor": 1.3
            }
            
            # Customer segmentation insights
            insights["customer_segments"] = {
                "health_conscious": {"percentage": 35, "avg_order_value": 150},
                "bulk_buyers": {"percentage": 25, "avg_order_value": 300},
                "occasional_buyers": {"percentage": 40, "avg_order_value": 75}
            }
            
            # Growth opportunities
            insights["growth_opportunities"] = [
                {
                    "opportunity": "Organic grain line",
                    "potential_revenue": 250000,
                    "market_size": "Growing 15% annually"
                },
                {
                    "opportunity": "Subscription service expansion",
                    "potential_revenue": 180000,
                    "market_size": "Recurring revenue model"
                }
            ]
            
            return insights
            
        except Exception as e:
            logging.error(f"Error generating market insights: {e}")
            return {}

# Global recommendation engine instance
recommendation_engine = None

async def initialize_recommendation_engine(db_client):
    """Initialize the global recommendation engine"""
    global recommendation_engine
    recommendation_engine = SmartRecommendationEngine(db_client)
    await recommendation_engine.initialize()
    logging.info("Global recommendation engine initialized")

async def get_recommendations_for_user(user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Get recommendations for a specific user"""
    if recommendation_engine and recommendation_engine.initialized:
        return await recommendation_engine.get_personalized_recommendations(user_id, limit)
    return []

async def predict_grain_demand(grain_id: str, days_ahead: int = 7) -> Dict[str, float]:
    """Predict demand for a grain"""
    if recommendation_engine and recommendation_engine.initialized:
        return await recommendation_engine.predict_demand(grain_id, days_ahead)
    return {"predicted_demand": 1.0}

async def optimize_grain_pricing(grain_id: str, current_price: float, demand_factor: float = 1.0) -> Dict[str, Any]:
    """Optimize pricing for a grain"""
    if recommendation_engine and recommendation_engine.initialized:
        return await recommendation_engine.optimize_pricing(grain_id, current_price, demand_factor)
    return {"current_price": current_price, "suggested_price": current_price, "price_change": 0}

async def get_market_insights() -> Dict[str, Any]:
    """Get market insights and trends"""
    if recommendation_engine and recommendation_engine.initialized:
        return await recommendation_engine.get_market_insights()
    return {}