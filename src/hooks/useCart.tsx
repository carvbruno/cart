import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const existInCart = cart.find(product => (product.id === productId));



      if (!existInCart) {
        const { data: productsData } = await api.get<Product>(`/products/${productId}`);
        const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

        if (stock.amount > 0) {
          const products = [...cart, { ...productsData, amount: 1 }];
          setCart(products);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(products));
          return
        }
      } else {
        const { data: stock } = await api.get<Stock>(`/stock/${productId}`);
        if (stock.amount > existInCart.amount) {
          updateProductAmount({ productId: existInCart.id, amount: (existInCart.amount + 1) });
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      }

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.some(product => (product.id === productId));
      if (!productExists) {
        toast.error('Erro na remoção do produto');
        return
      }
      const cartWithoutProduct = cart.filter(product => (product.id !== productId));
      setCart(cartWithoutProduct);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartWithoutProduct));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        toast.error('Erro na alteração de quantidade do produto');
        return
      }

      const response = await api.get(`/stock/${productId}`)
      const productStock = response.data.amount;

      if (amount > productStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const productExist = cart.some(product => product.id === productId);
      if (!productExist) {
        toast.error('Erro na alteração de quantidade do produto');
        return
      }

      const adjustedProduct = cart.map(product => product.id === productId ? {
        ...product,
        amount: amount
      } : product);

      setCart(adjustedProduct);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(adjustedProduct));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}