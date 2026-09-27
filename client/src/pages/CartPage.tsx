import { useState } from "react";
import { Link } from "react-router-dom";
import PageFrame from "../components/layout/PageFrame";
import EmptyState from "../components/ui/EmptyState";
import BrandIcon from "../components/ui/BrandIcon";
import { clearCart, getCart, updateCartQuantity } from "../services/cartService";

export default function CartPage() {
  const [items, setItems] = useState(getCart);
  const [error, setError] = useState("");
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const businessGroups = Array.from(
    items.reduce((groups, item) => {
      const group = groups.get(item.business_id) ?? {
        businessId: item.business_id,
        businessName: item.business_name,
        items: [],
        subtotal: 0,
      };
      group.items.push(item);
      group.subtotal += item.price * item.quantity;
      groups.set(item.business_id, group);
      return groups;
    }, new Map<string, { businessId: string; businessName: string; items: typeof items; subtotal: number }>()).values()
  );

  function changeQuantity(id: string, quantity: number) {
    try {
      setItems(updateCartQuantity(id, quantity));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update your cart.");
    }
  }

  return (
    <PageFrame>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#3A2925]">Your cart</h1>
            <p className="mt-2 text-sm text-[#71605A]">Review your food before placing an order.</p>
          </div>
          <Link to="/browse" className="text-sm font-semibold text-[#C9472E] hover:underline">
            Continue browsing →
          </Link>
        </div>

        {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {items.length === 0 ? (
          <div className="rounded-2xl border border-[#EEDFD3] bg-white">
            <EmptyState title="Your cart is empty" description="Find something good from a local business." action={{ label: "Browse food", onClick: () => { window.location.href = "/browse"; } }} />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              {items.map((item) => (
                <article key={item.listing_id} className="flex gap-4 rounded-2xl border border-[#EEDFD3] bg-white p-4 shadow-sm">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#FFF0E5] text-3xl">
                    {item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover" /> : <BrandIcon size="sm" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link to={`/food/${item.listing_id}`} className="font-semibold text-[#3A2925] hover:text-[#C9472E]">{item.title}</Link>
                    <p className="mt-1 text-sm text-[#71605A]">{item.business_name}</p>
                    <p className="mt-2 font-bold text-[#C9472E]">${item.price.toFixed(2)}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <label htmlFor={`quantity-${item.listing_id}`} className="text-sm text-[#71605A]">Quantity</label>
                      <select id={`quantity-${item.listing_id}`} value={item.quantity} onChange={(event) => changeQuantity(item.listing_id, Number(event.target.value))} className="rounded-lg border border-[#EEDFD3] bg-white px-2 py-1 text-sm">
                        {Array.from({ length: Math.max(item.quantity, item.available_quantity || 1) }, (_, index) => index + 1).map((quantity) => <option key={quantity} value={quantity}>{quantity}</option>)}
                      </select>
                      <button type="button" onClick={() => changeQuantity(item.listing_id, 0)} className="text-sm text-red-700 hover:underline">Remove</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <aside className="h-fit rounded-2xl border border-[#EEDFD3] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#3A2925]">Order summary</h2>
              <div className="mt-5 flex justify-between border-b border-[#EEDFD3] pb-4 text-sm"><span>Items</span><span>{items.reduce((sum, item) => sum + item.quantity, 0)}</span></div>
              <div className="mt-4 flex justify-between font-bold text-[#3A2925]"><span>Subtotal</span><span>${total.toFixed(2)}</span></div>
              <p className="mt-3 text-xs text-[#71605A]">Delivery charges, if applicable, are calculated during checkout.</p>
              <Link to="/checkout" className="mt-5 block w-full rounded-xl bg-[#E85D3F] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#C9472E]">Checkout entire cart</Link>
              {businessGroups.length > 1 && <p className="mt-3 text-xs text-[#71605A]">Pay once. BalaHader creates and distributes a separate order to each business.</p>}
              <button type="button" onClick={() => { if (window.confirm("Remove all items from your cart?")) { clearCart(); setItems([]); } }} className="mt-6 w-full rounded-xl border border-[#EEDFD3] py-2.5 text-sm font-semibold text-[#3A2925] hover:border-[#E85D3F]">Clear cart</button>
            </aside>
          </div>
        )}
      </main>
      </PageFrame>
  );
}
