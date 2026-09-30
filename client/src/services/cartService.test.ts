import { beforeEach, describe, expect, it } from "vitest";

import { addToCart, clearCart, getCart, getCartCount, updateCartQuantity } from "./cartService";
import type { ListingDetail } from "./listingService";


const listing = {
  _id: "listing-1",
  title: "Bread box",
  category: "Bakery",
  original_price: 8,
  discounted_price: 4,
  remaining_quantity: 3,
  reserved_quantity: 0,
  fulfillment_type: "pickup",
  business: {
    id: "business-1",
    name: "Local Bakery",
  },
} satisfies ListingDetail;


describe("cart workflow", () => {
  beforeEach(() => clearCart());

  it("adds a listing and counts order quantity", () => {
    addToCart(listing);
    expect(getCartCount()).toBe(1);
    expect(getCart()[0].title).toBe("Bread box");
  });

  it("prevents quantities above live availability", () => {
    addToCart(listing);
    expect(() => updateCartQuantity(listing._id, 4)).toThrow();
  });
});
