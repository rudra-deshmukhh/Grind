import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [featuredGrains, setFeaturedGrains] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const { user } = useSelector((state) => state.auth);
  const { cart } = useSelector((state) => state.cart);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setFeaturedGrains([
        {
          id: '1',
          name: 'Premium Wheat',
          price: 45,
          image: 'https://images.pexels.com/photos/54084/wheat-grain-agriculture-seed-54084.jpeg',
          rating: 4.8,
        },
        {
          id: '2',
          name: 'Organic Millet',
          price: 85,
          image: 'https://images.unsplash.com/photo-1542990253-a781e04c0082',
          rating: 4.9,
        },
      ]);

      setRecentOrders([
        {
          id: '1',
          status: 'delivered',
          total: 150,
          date: '2024-01-10',
        },
        {
          id: '2',
          status: 'out_for_delivery',
          total: 220,
          date: '2024-01-12',
        },
      ]);
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHomeData();
  };

  const navigateToGrainCatalog = () => {
    navigation.navigate('GrainCatalog');
  };

  const navigateToMixBuilder = () => {
    navigation.navigate('MixBuilder');
  };

  const navigateToOrders = () => {
    navigation.navigate('Orders');
  };

  const navigateToCart = () => {
    navigation.navigate('Cart');
  };

  const navigateToSubscriptions = () => {
    navigation.navigate('Subscriptions');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
        return '#10B981';
      case 'out_for_delivery':
        return '#3B82F6';
      case 'processing':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D97706" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.first_name}!</Text>
          <Text style={styles.subGreeting}>What would you like to order today?</Text>
        </View>
        <TouchableOpacity style={styles.cartButton} onPress={navigateToCart}>
          <Icon name="shopping-cart" size={24} color="#D97706" />
          {cart?.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cart.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={navigateToGrainCatalog}>
            <Icon name="grain" size={32} color="#D97706" />
            <Text style={styles.actionText}>Browse Grains</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard} onPress={navigateToMixBuilder}>
            <Icon name="build" size={32} color="#D97706" />
            <Text style={styles.actionText}>Mix Builder</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard} onPress={navigateToOrders}>
            <Icon name="receipt-long" size={32} color="#D97706" />
            <Text style={styles.actionText}>My Orders</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard} onPress={navigateToSubscriptions}>
            <Icon name="subscriptions" size={32} color="#D97706" />
            <Text style={styles.actionText}>Subscriptions</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Featured Grains */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Grains</Text>
          <TouchableOpacity onPress={navigateToGrainCatalog}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {featuredGrains.map((grain) => (
            <TouchableOpacity key={grain.id} style={styles.grainCard}>
              <Image source={{ uri: grain.image }} style={styles.grainImage} />
              <View style={styles.grainInfo}>
                <Text style={styles.grainName}>{grain.name}</Text>
                <Text style={styles.grainPrice}>₹{grain.price}/kg</Text>
                <View style={styles.ratingContainer}>
                  <Icon name="star" size={16} color="#F59E0B" />
                  <Text style={styles.ratingText}>{grain.rating}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Recent Orders */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <TouchableOpacity onPress={navigateToOrders}>
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {recentOrders.map((order) => (
          <TouchableOpacity key={order.id} style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderId}>Order #{order.id}</Text>
              <Text style={styles.orderTotal}>₹{order.total}</Text>
            </View>
            <View style={styles.orderDetails}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                <Text style={styles.statusText}>{order.status.replace('_', ' ')}</Text>
              </View>
              <Text style={styles.orderDate}>{order.date}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Subscription Reminder */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.subscriptionCard} onPress={navigateToSubscriptions}>
          <View style={styles.subscriptionContent}>
            <Icon name="subscriptions" size={24} color="#D97706" />
            <Text style={styles.subscriptionTitle}>Weekly Delivery</Text>
            <Text style={styles.subscriptionSubtitle}>Never run out of grains</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#D97706" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subGreeting: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  cartButton: {
    position: 'relative',
    padding: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  seeAllText: {
    fontSize: 16,
    color: '#D97706',
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (width - 60) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
    textAlign: 'center',
  },
  grainCard: {
    width: 160,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  grainImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  grainInfo: {
    padding: 12,
  },
  grainName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  grainPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D97706',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D97706',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  orderDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  subscriptionCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subscriptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E',
    marginLeft: 12,
  },
  subscriptionSubtitle: {
    fontSize: 14,
    color: '#78716C',
    marginLeft: 12,
  },
});

export default HomeScreen;