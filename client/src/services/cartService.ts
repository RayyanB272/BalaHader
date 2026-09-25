import {
  getListing,
  type ListingDetail,
} from "./listingService";
import type { SmartBasketResponse } from "./smartBasketService";

export interface CartItem {
  listing_id: string;
  title: string;
  price: number;
  quantity: number;
  business_id: string;
  business_name: string;
  image_url?: string;
  available_quantity: number;
}

const CART_KEY = "balahader_cart";
const CART_EVENT = "balahader-cart-changed";

function notifyCartChanged() {
  window.dispatchEvent(new Event(CART_EVENT));
}

export function getCartCount(): number {
  return getCart().reduce((total, item) => total + item.quantity, 0);
}

export function subscribeToCart(listener: () => void) {
  window.addEventListener(CART_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CART_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export function getCart(): CartItem[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(stored) ? (stored as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function addToCart(listing: ListingDetail): void {
  if (!listing.business?.id) {
    throw new Error("This listing cannot be added to the cart.");
  }

  const cart = getCart();
  const available = Math.max(0, listing.remaining_quantity - (listing.reserved_quantity ?? 0));

  // The current backend creates one order for one business.
  if (
    cart.length > 0 &&
    cart[0].business_id !== listing.business.id
  ) {
    throw new Error(
      "Please finish your order from the first business before adding food from another."
    );
  }

  const existing = cart.find((item) => item.listing_id === listing._id);
  if (available === 0 || (existing?.quantity ?? 0) >= available) {
    throw new Error("The requested quantity is no longer available.");
  }
  if (existing) {
    existing.quantity += 1;
    existing.available_quantity = available;
    existing.price = listing.discounted_price;
  } else {
    cart.push({
      listing_id: listing._id,
      title: listing.title,
      price: listing.discounted_price,
      quantity: 1,
      business_id: listing.business.id,
      business_name: listing.business.name,
      image_url: listing.image_url,
      available_quantity: available,
    });
  }

  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  notifyCartChanged();
}

export function updateCartQuantity(listingId: string, quantity: number): CartItem[] {
  const cart = getCart();
  const item = cart.find((entry) => entry.listing_id === listingId);
  if (!item) return cart;
  if (quantity > item.available_quantity) {
    throw new Error("That quantity is no longer available.");
  }
  const next = quantity <= 0
    ? cart.filter((entry) => entry.listing_id !== listingId)
    : cart.map((entry) => entry.listing_id === listingId ? { ...entry, quantity } : entry);
  localStorage.setItem(CART_KEY, JSON.stringify(next));
  notifyCartChanged();
  return next;
}

export function clearCart(): void {
  localStorage.removeItem(CART_KEY);
  notifyCartChanged();
}

export async function replaceCartWithSmartBasket(
  basket: SmartBasketResponse
): Promise<CartItem[]> {
  if (basket.items.length === 0) {
    throw new Error("The suggested basket has no items.");
  }

  const listings = await Promise.all(
    basket.items.map((item) =>
      getListing(item.listing_id)
    )
  );

  const cartItems: CartItem[] = basket.items.map(
    (suggestedItem, index) => {
      const listing = listings[index];

      if (!listing.business?.id) {
        throw new Error(
          `${listing.title} cannot be added to the cart.`
        );
      }

      if (listing.business.id !== basket.business_id) {
        throw new Error(
          "One of the suggested items belongs to another business."
        );
      }

      const availableQuantity = Math.max(
        0,
        listing.remaining_quantity -
          (listing.reserved_quantity ?? 0)
      );

      if (availableQuantity < suggestedItem.quantity) {
        throw new Error(
          `${listing.title} no longer has enough available quantity. Generate a new basket.`
        );
      }

      return {
        listing_id: listing._id,
        title: listing.title,
        price: listing.discounted_price,
        quantity: suggestedItem.quantity,
        business_id: listing.business.id,
        business_name: listing.business.name,
        image_url: listing.image_url,
        available_quantity: availableQuantity,
      };
    }
  );

  localStorage.setItem(
    CART_KEY,
    JSON.stringify(cartItems)
  );
  notifyCartChanged();

  return cartItems;
}
