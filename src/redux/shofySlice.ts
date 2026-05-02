import { createSlice } from "@reduxjs/toolkit";
import { CartItem, ProductType } from "../../type";
import { FirestoreUser } from "@/lib/firebase/userService";

interface InitialState {
  cart: CartItem[];
  favorite: ProductType[];
  userInfo: FirestoreUser | null;
}

const initialState: InitialState = {
  cart: [],
  favorite: [],
  userInfo: null,
};

export const shofySlice = createSlice({
  name: "kwahudwaso",
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const item: CartItem = action.payload;
      const existing = state.cart.find(
        (c) => c.productId === item.productId
      );
      if (existing) {
        existing.quantity += 1;
      } else {
        state.cart.push({ ...item, quantity: item.quantity || 1 });
      }
    },
    increaseQuantity: (state, action) => {
      const existing = state.cart.find(
        (c) => c.productId === action.payload
      );
      if (existing) {
        existing.quantity += 1;
      }
    },
    decreaseQuantity: (state, action) => {
      const existing = state.cart.find(
        (c) => c.productId === action.payload
      );
      if (existing) {
        existing.quantity -= 1;
      }
    },
    removeFromCart: (state, action) => {
      state.cart = state.cart.filter(
        (c) => c.productId !== action.payload
      );
    },
    resetCart: (state) => {
      state.cart = [];
    },
    // Favorite (still uses full ProductType for UI display)
    addToFavorite: (state, action) => {
      const existingProduct = state.favorite.find(
        (item) => item.id === action.payload.id
      );
      if (existingProduct) {
        state.favorite = state.favorite.filter(
          (item) => item.id !== action.payload.id
        );
      } else {
        state.favorite.push(action.payload);
      }
    },
    resetFavorite: (state) => {
      state.favorite = [];
    },

    addUser: (state, action) => {
      state.userInfo = action.payload;
    },
    updateUser: (state, action) => {
      if (state.userInfo) {
        state.userInfo = { ...state.userInfo, ...action.payload };
      }
    },
    removeUser: (state) => {
      state.userInfo = null;
    },
  },
});
export const {
  addToCart,
  addUser,
  updateUser,
  removeUser,
  increaseQuantity,
  decreaseQuantity,
  removeFromCart,
  resetCart,
  addToFavorite,
  resetFavorite,
} = shofySlice.actions;
export default shofySlice.reducer;
