import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button, Searchbar, Badge, FAB } from 'react-native-paper';
import Icon from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuthStore, selectUser } from '../../stores/authStore';
import { useCartStore, selectTotalItems } from '../../stores/cartStore';
import { COLORS, SPACING, TYPOGRAPHY, DEFAULTS } from '../../constants';
import { Grain, GrainCategory } from '../../types';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
  navigation: any;
}

// Mock data for demonstration
const mockGrains: Grain[] = [
  {
    id: '1',
    name: 'Organic Wheat',
    description: 'Premium organic wheat flour',
    pricePerKg: 85,
    imageUrl: 'https://example.com/wheat.jpg',
    category: GrainCategory.WHEAT,
    isAvailable: true,
  },
  {
    id: '2',
    name: 'Basmati Rice',
    description: 'Aromatic basmati rice',
    pricePerKg: 120,
    imageUrl: 'https://example.com/rice.jpg',
    category: GrainCategory.RICE,
    isAvailable: true,
  },
  {
    id: '3',
    name: 'Mixed Millets',
    description: 'Healthy millet mix',
    pricePerKg: 95,
    imageUrl: 'https://example.com/millets.jpg',
    category: GrainCategory.MILLETS,
    isAvailable: true,
  },
  {
    id: '4',
    name: 'Masoor Dal',
    description: 'Red lentils',
    pricePerKg: 110,
    imageUrl: 'https://example.com/dal.jpg',
    category: GrainCategory.PULSES,
    isAvailable: true,
  },
];

const mockRecentOrders = [
  {
    id: '1',
    status: 'delivered',
    items: 3,
    total: 250,
    date: '2024-01-15',
  },
  {
    id: '2',
    status: 'grinding',
    items: 2,
    total: 180,
    date: '2024-01-20',
  },
];

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [featuredGrains, setFeaturedGrains] = useState<Grain[]>([]);

  const user = useAuthStore(selectUser);
  const cartItemsCount = useCartStore(selectTotalItems);

  useEffect(() => {
    // Simulate loading featured grains
    setFeaturedGrains(mockGrains);
  }, []);

  const renderHeader = () => (
    <View style={styles.header}>
      <LinearGradient
        colors={COLORS.GRADIENT.PRIMARY}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{user?.name || 'Guest'}</Text>
            </View>
            <TouchableOpacity
              style={styles.cartButton}
              onPress={() => navigation.navigate('Cart')}
            >
              <Icon name="shopping-cart" size={24} color={COLORS.BACKGROUND} />
              {cartItemsCount > 0 && (
                <Badge style={styles.cartBadge}>{cartItemsCount}</Badge>
              )}
            </TouchableOpacity>
          </View>
          
          <Searchbar
            placeholder="Search grains, flour..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            iconColor={COLORS.PRIMARY}
            inputStyle={{ color: COLORS.TEXT_PRIMARY }}
          />
        </View>
      </LinearGradient>
    </View>
  );

  const renderCategories = () => (
    <View style={styles.categoriesContainer}>
      <Text style={styles.sectionTitle}>Categories</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[
            styles.categoryItem,
            selectedCategory === 'all' && styles.categoryItemActive,
          ]}
          onPress={() => setSelectedCategory('all')}
        >
          <Icon
            name="apps"
            size={24}
            color={selectedCategory === 'all' ? COLORS.BACKGROUND : COLORS.PRIMARY}
          />
          <Text
            style={[
              styles.categoryText,
              selectedCategory === 'all' && styles.categoryTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>

        {DEFAULTS.GRAIN_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryItem,
              selectedCategory === category.id && styles.categoryItemActive,
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category.id && styles.categoryTextActive,
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity
          style={styles.quickActionItem}
          onPress={() => navigation.navigate('CustomProduct')}
        >
          <Icon name="tune" size={32} color={COLORS.PRIMARY} />
          <Text style={styles.quickActionText}>Custom Mix</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionItem}
          onPress={() => navigation.navigate('Subscriptions')}
        >
          <Icon name="autorenew" size={32} color={COLORS.PRIMARY} />
          <Text style={styles.quickActionText}>Subscriptions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionItem}
          onPress={() => navigation.navigate('Orders')}
        >
          <Icon name="history" size={32} color={COLORS.PRIMARY} />
          <Text style={styles.quickActionText}>Order History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionItem}
          onPress={() => navigation.navigate('TrackOrder', { orderId: '1' })}
        >
          <Icon name="track-changes" size={32} color={COLORS.PRIMARY} />
          <Text style={styles.quickActionText}>Track Order</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFeaturedProducts = () => (
    <View style={styles.featuredContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Featured Products</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Products')}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={featuredGrains}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.productCard}
            onPress={() => navigation.navigate('ProductDetails', { productId: item.id })}
          >
            <Card style={styles.productCardContent}>
              <View style={styles.productImage}>
                <Icon name="grain" size={40} color={COLORS.PRIMARY} />
              </View>
              <Card.Content>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productDescription} numberOfLines={2}>
                  {item.description}
                </Text>
                <Text style={styles.productPrice}>₹{item.pricePerKg}/kg</Text>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderSubscriptionOffer = () => (
    <Card style={styles.offerCard}>
      <LinearGradient
        colors={COLORS.GRADIENT.SECONDARY}
        style={styles.offerGradient}
      >
        <Card.Content>
          <View style={styles.offerContent}>
            <View style={styles.offerText}>
              <Text style={styles.offerTitle}>Save up to 12%</Text>
              <Text style={styles.offerSubtitle}>
                Subscribe to your favorite products
              </Text>
            </View>
            <Icon name="savings" size={40} color={COLORS.BACKGROUND} />
          </View>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Subscriptions')}
            style={styles.offerButton}
            buttonColor={COLORS.BACKGROUND}
            textColor={COLORS.PRIMARY}
          >
            Explore Subscriptions
          </Button>
        </Card.Content>
      </LinearGradient>
    </Card>
  );

  const renderRecentOrders = () => (
    <View style={styles.recentOrdersContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Orders</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {mockRecentOrders.map((order) => (
        <TouchableOpacity
          key={order.id}
          style={styles.orderItem}
          onPress={() => navigation.navigate('OrderDetails', { orderId: order.id })}
        >
          <View style={styles.orderInfo}>
            <Text style={styles.orderDate}>{order.date}</Text>
            <Text style={styles.orderDetails}>
              {order.items} items • ₹{order.total}
            </Text>
          </View>
          <Badge
            style={[
              styles.statusBadge,
              { backgroundColor: DEFAULTS.ORDER_STATUSES.find(s => s.id === order.status)?.color },
            ]}
          >
            {order.status}
          </Badge>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {renderCategories()}
        {renderQuickActions()}
        {renderFeaturedProducts()}
        {renderSubscriptionOffer()}
        {renderRecentOrders()}
      </ScrollView>

      <FAB
        icon="add"
        style={styles.fab}
        onPress={() => navigation.navigate('Products')}
        color={COLORS.BACKGROUND}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    marginBottom: SPACING.LG,
  },
  headerGradient: {
    paddingTop: SPACING.MD,
    paddingBottom: SPACING.LG,
  },
  headerContent: {
    paddingHorizontal: SPACING.LG,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },
  welcomeText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.BACKGROUND,
    opacity: 0.8,
  },
  userName: {
    fontSize: TYPOGRAPHY.FONT_SIZE.HEADING,
    fontWeight: 'bold',
    color: COLORS.BACKGROUND,
  },
  cartButton: {
    position: 'relative',
    padding: SPACING.SM,
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.ERROR,
  },
  searchBar: {
    backgroundColor: COLORS.BACKGROUND,
    elevation: 2,
  },
  categoriesContainer: {
    marginBottom: SPACING.LG,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.LARGE,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
    paddingHorizontal: SPACING.LG,
  },
  categoryItem: {
    alignItems: 'center',
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    marginHorizontal: SPACING.XS,
    borderRadius: 20,
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  categoryItemActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: SPACING.XS,
  },
  categoryText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SMALL,
    color: COLORS.TEXT_PRIMARY,
  },
  categoryTextActive: {
    color: COLORS.BACKGROUND,
  },
  quickActionsContainer: {
    marginBottom: SPACING.LG,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.LG,
  },
  quickActionItem: {
    width: (width - SPACING.LG * 2 - SPACING.MD) / 2,
    alignItems: 'center',
    padding: SPACING.LG,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    marginBottom: SPACING.MD,
    marginRight: SPACING.MD,
  },
  quickActionText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.SM,
    textAlign: 'center',
  },
  featuredContainer: {
    marginBottom: SPACING.LG,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
    marginBottom: SPACING.MD,
  },
  viewAllText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
  },
  productCard: {
    width: 160,
    marginLeft: SPACING.LG,
  },
  productCardContent: {
    backgroundColor: COLORS.SURFACE,
  },
  productImage: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
  },
  productName: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  productDescription: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SMALL,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.SM,
  },
  productPrice: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  offerCard: {
    marginHorizontal: SPACING.LG,
    marginBottom: SPACING.LG,
  },
  offerGradient: {
    borderRadius: 8,
  },
  offerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  offerText: {
    flex: 1,
  },
  offerTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.LARGE,
    fontWeight: 'bold',
    color: COLORS.BACKGROUND,
    marginBottom: SPACING.XS,
  },
  offerSubtitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    color: COLORS.BACKGROUND,
    opacity: 0.9,
  },
  offerButton: {
    alignSelf: 'flex-start',
  },
  recentOrdersContainer: {
    marginBottom: SPACING.XXL,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    marginHorizontal: SPACING.LG,
    marginBottom: SPACING.SM,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
  },
  orderInfo: {
    flex: 1,
  },
  orderDate: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MEDIUM,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  orderDetails: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SMALL,
    color: COLORS.TEXT_SECONDARY,
  },
  statusBadge: {
    color: COLORS.BACKGROUND,
  },
  fab: {
    position: 'absolute',
    bottom: SPACING.LG,
    right: SPACING.LG,
    backgroundColor: COLORS.PRIMARY,
  },
});

export default HomeScreen;