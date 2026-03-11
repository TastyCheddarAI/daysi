import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import { BRAND_CONFIG } from "@/lib/brand.config";

export interface CartItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  member_price: number | null;
  quantity: number;
  is_package: boolean;
  package_price: number | null;
  package_sessions: number | null;
  category: string | null;
}

interface CartContextType {
  items: CartItem[];
  isLoading: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addItem: (product: {
    id: string;
    name: string;
    price: number;
    member_price: number | null;
    package_price: number | null;
    package_sessions: number | null;
    category: string | null;
  }, isPackage?: boolean) => Promise<void>;
  removeItem: (productId: string, isPackage?: boolean) => Promise<void>;
  updateQuantity: (productId: string, quantity: number, isPackage?: boolean) => Promise<void>;
  clearCart: () => Promise<void>;
  itemCount: number;
  getItemPrice: (item: CartItem) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const CART_STORAGE_KEY = BRAND_CONFIG.STORAGE_KEYS.CART;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading cart from storage:", error);
    }
  }, []);

  const saveCartToStorage = (cartItems: CartItem[]) => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (error) {
      console.error("Error saving cart to storage:", error);
    }
  };

  const addItem = useCallback(async (product: {
    id: string;
    name: string;
    price: number;
    member_price: number | null;
    package_price: number | null;
    package_sessions: number | null;
    category: string | null;
  }, isPackage = false) => {
    const existingItem = items.find(
      (item) => item.product_id === product.id && item.is_package === isPackage
    );

    if (existingItem) {
      const nextItems = items.map((item) =>
        item.product_id === product.id && item.is_package === isPackage
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
      setItems(nextItems);
      saveCartToStorage(nextItems);
      toast.success(`${product.name} quantity updated`);
      return;
    }

    const nextItems = [
      ...items,
      {
        id: crypto.randomUUID(),
        product_id: product.id,
        name: product.name,
        price: product.price,
        member_price: product.member_price,
        quantity: 1,
        is_package: isPackage,
        package_price: product.package_price,
        package_sessions: product.package_sessions,
        category: product.category,
      },
    ];

    setItems(nextItems);
    saveCartToStorage(nextItems);
    toast.success(`${product.name} added to cart`);
  }, [items]);

  const removeItem = useCallback(async (productId: string, isPackage = false) => {
    const nextItems = items.filter(
      (item) => !(item.product_id === productId && item.is_package === isPackage)
    );
    setItems(nextItems);
    saveCartToStorage(nextItems);
  }, [items]);

  const updateQuantity = useCallback(async (productId: string, quantity: number, isPackage = false) => {
    if (quantity <= 0) {
      await removeItem(productId, isPackage);
      return;
    }

    const nextItems = items.map((item) =>
      item.product_id === productId && item.is_package === isPackage
        ? { ...item, quantity }
        : item
    );
    setItems(nextItems);
    saveCartToStorage(nextItems);
  }, [items, removeItem]);

  const clearCart = useCallback(async () => {
    setItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  }, []);

  const getItemPrice = useCallback((item: CartItem): number => {
    if (item.is_package && item.package_price) {
      return item.package_price * (item.package_sessions || 1);
    }
    return item.price;
  }, []);

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        isLoading,
        isOpen,
        setIsOpen,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        getItemPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
