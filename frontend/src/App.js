import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [grains, setGrains] = useState([]);
  const [grindOptions, setGrindOptions] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeTab, setActiveTab] = useState('catalog');
  const [mixBuilder, setMixBuilder] = useState({
    grains: [],
    grindOption: null
  });
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');

  useEffect(() => {
    fetchGrains();
    fetchGrindOptions();
    fetchCart();
  }, []);

  const fetchGrains = async () => {
    try {
      const response = await axios.get(`${API}/grains`);
      setGrains(response.data);
    } catch (error) {
      console.error('Error fetching grains:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGrindOptions = async () => {
    try {
      const response = await axios.get(`${API}/grind-options`);
      setGrindOptions(response.data);
    } catch (error) {
      console.error('Error fetching grind options:', error);
    }
  };

  const fetchCart = async () => {
    try {
      const response = await axios.get(`${API}/cart`);
      setCart(response.data);
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  const addIndividualGrain = async (grain, quantity, grindOption) => {
    try {
      const response = await axios.post(`${API}/cart/add`, {
        type: 'individual',
        grain_id: grain.id,
        quantity_kg: quantity,
        grind_option: grindOption
      });
      
      fetchCart();
      showNotification(`Added ${grain.name} to cart!`);
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const addMixToCart = async () => {
    if (mixBuilder.grains.length === 0) {
      showNotification('Please add at least one grain to your mix!');
      return;
    }

    try {
      const response = await axios.post(`${API}/cart/add`, {
        type: 'mix',
        grains: mixBuilder.grains,
        grind_option: mixBuilder.grindOption
      });
      
      fetchCart();
      setMixBuilder({ grains: [], grindOption: null });
      showNotification('Custom mix added to cart!');
    } catch (error) {
      console.error('Error adding mix to cart:', error);
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      await axios.delete(`${API}/cart/${itemId}`);
      fetchCart();
      showNotification('Item removed from cart!');
    } catch (error) {
      console.error('Error removing from cart:', error);
    }
  };

  const clearCart = async () => {
    try {
      await axios.delete(`${API}/cart`);
      fetchCart();
      showNotification('Cart cleared!');
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const addToMix = (grain, quantity) => {
    const existingIndex = mixBuilder.grains.findIndex(g => g.grain_id === grain.id);
    
    if (existingIndex >= 0) {
      const updatedGrains = [...mixBuilder.grains];
      updatedGrains[existingIndex].quantity_kg = quantity;
      setMixBuilder({ ...mixBuilder, grains: updatedGrains });
    } else {
      setMixBuilder({
        ...mixBuilder,
        grains: [...mixBuilder.grains, {
          grain_id: grain.id,
          grain_name: grain.name,
          quantity_kg: quantity,
          price_per_kg: grain.price_per_kg
        }]
      });
    }
  };

  const removeFromMix = (grainId) => {
    setMixBuilder({
      ...mixBuilder,
      grains: mixBuilder.grains.filter(g => g.grain_id !== grainId)
    });
  };

  const calculateMixPrice = () => {
    const basePrice = mixBuilder.grains.reduce((sum, grain) => 
      sum + (grain.price_per_kg * grain.quantity_kg), 0);
    const grindCost = mixBuilder.grindOption?.additional_cost || 0;
    return basePrice + grindCost;
  };

  const totalCartValue = cart.reduce((sum, item) => sum + item.total_price, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-amber-800">Loading grains...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-amber-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">G</span>
              </div>
              <h1 className="text-2xl font-bold text-amber-900">GrainCraft</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-amber-700">Cart: ₹{totalCartValue.toFixed(2)}</span>
              <span className="bg-amber-600 text-white px-2 py-1 rounded-full text-sm">
                {cart.length} items
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'catalog'
                  ? 'border-amber-600 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Grain Catalog
            </button>
            <button
              onClick={() => setActiveTab('mix')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'mix'
                  ? 'border-amber-600 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Custom Mix Builder
            </button>
            <button
              onClick={() => setActiveTab('cart')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'cart'
                  ? 'border-amber-600 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Cart ({cart.length})
            </button>
          </div>
        </div>
      </nav>

      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {notification}
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'catalog' && (
          <div>
            <h2 className="text-3xl font-bold text-amber-900 mb-8">Premium Grains</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {grains.map((grain) => (
                <GrainCard
                  key={grain.id}
                  grain={grain}
                  grindOptions={grindOptions}
                  onAddToCart={addIndividualGrain}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'mix' && (
          <div>
            <h2 className="text-3xl font-bold text-amber-900 mb-8">Custom Mix Builder</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4">Select Grains for Your Mix</h3>
                <div className="space-y-4">
                  {grains.map((grain) => (
                    <MixGrainSelector
                      key={grain.id}
                      grain={grain}
                      onAddToMix={addToMix}
                    />
                  ))}
                </div>
              </div>
              <div>
                <MixPreview
                  mixBuilder={mixBuilder}
                  grindOptions={grindOptions}
                  onRemoveFromMix={removeFromMix}
                  onSelectGrind={(grind) => setMixBuilder({ ...mixBuilder, grindOption: grind })}
                  onAddToCart={addMixToCart}
                  totalPrice={calculateMixPrice()}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cart' && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-amber-900">Shopping Cart</h2>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                >
                  Clear Cart
                </button>
              )}
            </div>
            {cart.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 text-lg">Your cart is empty</p>
                <button
                  onClick={() => setActiveTab('catalog')}
                  className="mt-4 bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onRemove={removeFromCart}
                  />
                ))}
                <div className="bg-amber-100 p-6 rounded-lg">
                  <div className="flex justify-between items-center text-xl font-bold text-amber-900">
                    <span>Total: ₹{totalCartValue.toFixed(2)}</span>
                    <button className="bg-amber-600 text-white px-8 py-3 rounded-lg hover:bg-amber-700">
                      Checkout
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Components
const GrainCard = ({ grain, grindOptions, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedGrind, setSelectedGrind] = useState(null);

  const handleAddToCart = () => {
    onAddToCart(grain, quantity, selectedGrind);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      <img
        src={grain.image_url}
        alt={grain.name}
        className="w-full h-48 object-cover"
      />
      <div className="p-6">
        <h3 className="text-xl font-bold text-amber-900 mb-2">{grain.name}</h3>
        <p className="text-gray-600 mb-4">{grain.description}</p>
        <div className="mb-4">
          <span className="text-2xl font-bold text-amber-600">₹{grain.price_per_kg}/kg</span>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity (kg)
            </label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grind Option
            </label>
            <select
              value={selectedGrind?.type || ''}
              onChange={(e) => {
                const grind = grindOptions.find(g => g.type === e.target.value);
                setSelectedGrind(grind);
              }}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Select grind option</option>
              {grindOptions.map(grind => (
                <option key={grind.type} value={grind.type}>
                  {grind.description} {grind.additional_cost > 0 && `(+₹${grind.additional_cost})`}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={handleAddToCart}
            className="w-full bg-amber-600 text-white py-2 px-4 rounded-lg hover:bg-amber-700 transition-colors"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

const MixGrainSelector = ({ grain, onAddToMix }) => {
  const [quantity, setQuantity] = useState('');

  const handleAdd = () => {
    if (quantity && parseFloat(quantity) > 0) {
      onAddToMix(grain, parseFloat(quantity));
      setQuantity('');
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow flex items-center space-x-4">
      <img
        src={grain.image_url}
        alt={grain.name}
        className="w-16 h-16 object-cover rounded-lg"
      />
      <div className="flex-1">
        <h4 className="font-semibold text-amber-900">{grain.name}</h4>
        <p className="text-sm text-gray-600">₹{grain.price_per_kg}/kg</p>
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="number"
          placeholder="kg"
          min="0.1"
          step="0.1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-20 p-2 border border-gray-300 rounded-md text-sm"
        />
        <button
          onClick={handleAdd}
          className="bg-amber-600 text-white px-4 py-2 rounded-md text-sm hover:bg-amber-700"
        >
          Add
        </button>
      </div>
    </div>
  );
};

const MixPreview = ({ mixBuilder, grindOptions, onRemoveFromMix, onSelectGrind, onAddToCart, totalPrice }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-xl font-semibold mb-4">Your Custom Mix</h3>
      
      {mixBuilder.grains.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No grains added yet</p>
      ) : (
        <div className="space-y-3 mb-6">
          {mixBuilder.grains.map((grain) => (
            <div key={grain.grain_id} className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
              <div>
                <span className="font-medium">{grain.grain_name}</span>
                <span className="text-sm text-gray-600 ml-2">
                  {grain.quantity_kg}kg × ₹{grain.price_per_kg}
                </span>
              </div>
              <button
                onClick={() => onRemoveFromMix(grain.grain_id)}
                className="text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      
      {mixBuilder.grains.length > 0 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grind Option
            </label>
            <select
              value={mixBuilder.grindOption?.type || ''}
              onChange={(e) => {
                const grind = grindOptions.find(g => g.type === e.target.value);
                onSelectGrind(grind);
              }}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Select grind option</option>
              {grindOptions.map(grind => (
                <option key={grind.type} value={grind.type}>
                  {grind.description} {grind.additional_cost > 0 && `(+₹${grind.additional_cost})`}
                </option>
              ))}
            </select>
          </div>
          
          <div className="bg-amber-100 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span>Total Weight:</span>
              <span>{mixBuilder.grains.reduce((sum, g) => sum + g.quantity_kg, 0).toFixed(1)}kg</span>
            </div>
            <div className="flex justify-between items-center font-bold text-lg">
              <span>Total Price:</span>
              <span>₹{totalPrice.toFixed(2)}</span>
            </div>
          </div>
          
          <button
            onClick={onAddToCart}
            className="w-full bg-amber-600 text-white py-3 px-4 rounded-lg hover:bg-amber-700 transition-colors"
          >
            Add Mix to Cart
          </button>
        </div>
      )}
    </div>
  );
};

const CartItem = ({ item, onRemove }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          {item.type === 'individual' ? (
            <div>
              <h3 className="text-lg font-semibold text-amber-900">{item.grain_name}</h3>
              <p className="text-gray-600">Quantity: {item.quantity_kg}kg</p>
              {item.grind_option && (
                <p className="text-gray-600">Grind: {item.grind_option.description}</p>
              )}
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold text-amber-900">Custom Mix</h3>
              <div className="text-gray-600">
                {item.grains.map(grain => (
                  <div key={grain.grain_id}>
                    {grain.grain_name}: {grain.quantity_kg}kg
                  </div>
                ))}
              </div>
              {item.grind_option && (
                <p className="text-gray-600">Grind: {item.grind_option.description}</p>
              )}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-amber-600">₹{item.total_price.toFixed(2)}</div>
          <button
            onClick={() => onRemove(item.id)}
            className="mt-2 text-red-500 hover:text-red-700"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;