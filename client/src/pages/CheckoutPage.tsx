import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import PageFrame from "../components/layout/PageFrame";
import { getCart, type CartItem } from "../services/cartService";
import { createOrder, getCheckoutDeliveryAreas, type CheckoutDeliveryArea } from "../services/orderService";

type Group = { businessId: string; businessName: string; items: CartItem[]; subtotal: number };
type Fulfillment = { type: "pickup" | "delivery"; areaId: string; address: string; areas: CheckoutDeliveryArea[]; loadingAreas: boolean };

export default function CheckoutPage() {
  const navigate = useNavigate();
  const items = useMemo(() => getCart(), []);
  const groups = useMemo(() => Array.from(items.reduce((map, item) => {
    const group = map.get(item.business_id) ?? { businessId: item.business_id, businessName: item.business_name, items: [], subtotal: 0 };
    group.items.push(item);
    group.subtotal += item.price * item.quantity;
    map.set(item.business_id, group);
    return map;
  }, new Map<string, Group>()).values()), [items]);

  const [fulfillment, setFulfillment] = useState<Record<string, Fulfillment>>(() =>
    Object.fromEntries(groups.map((group) => [group.businessId, { type: "pickup", areaId: "", address: "", areas: [], loadingAreas: true }]))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    groups.forEach((group) => {
      getCheckoutDeliveryAreas(group.businessId).then((areas) => {
        if (active) setFulfillment((current) => ({ ...current, [group.businessId]: { ...current[group.businessId], areas, loadingAreas: false } }));
      }).catch(() => {
        if (active) setFulfillment((current) => ({ ...current, [group.businessId]: { ...current[group.businessId], areas: [], loadingAreas: false } }));
      });
    });
    return () => { active = false; };
  }, [groups]);

  function updateFulfillment(businessId: string, changes: Partial<Fulfillment>) {
    setFulfillment((current) => ({ ...current, [businessId]: { ...current[businessId], ...changes } }));
  }

  const itemSubtotal = groups.reduce((sum, group) => sum + group.subtotal, 0);
  const deliveryTotal = groups.reduce((sum, group) => {
    const settings = fulfillment[group.businessId];
    return settings?.type === "delivery"
      ? sum + (settings.areas.find((area) => area._id === settings.areaId)?.delivery_fee ?? 0)
      : sum;
  }, 0);

  async function submitOrders(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!groups.length) return setError("Your cart is empty.");
    for (const group of groups) {
      const settings = fulfillment[group.businessId];
      if (settings.type === "delivery" && (!settings.areaId || !settings.address.trim())) {
        setError(`Choose a delivery area and enter an address for ${group.businessName}.`);
        return;
      }
    }

    setLoading(true);
    setError("");
    try {
      const created = [];
      for (const group of groups) {
        const settings = fulfillment[group.businessId];
        created.push(await createOrder({
          items: group.items.map((item) => ({ listing_id: item.listing_id, quantity: item.quantity })),
          fulfillment_type: settings.type,
          delivery_area_id: settings.type === "delivery" ? settings.areaId : undefined,
          delivery_address: settings.type === "delivery" ? settings.address.trim() : undefined,
        }));
      }
      navigate(`/payment?orders=${created.map((order) => order.order_id).join(",")}`);
    } catch (requestError) {
      const detail = axios.isAxiosError(requestError) ? requestError.response?.data?.detail : null;
      setError(typeof detail === "string" ? detail : "Could not prepare the combined checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageFrame hideFooter>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <Link to="/cart" className="text-sm font-semibold text-[#C9472E]">← Back to cart</Link>
        <h1 className="mt-5 text-3xl font-bold text-[#3A2925]">Combined checkout</h1>
        <p className="mt-2 text-sm text-[#71605A]">Choose fulfillment for each business, then pay once for the entire cart.</p>
        {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <form onSubmit={submitOrders} className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            {groups.map((group) => {
              const settings = fulfillment[group.businessId];
              return (
                <section key={group.businessId} className="rounded-2xl border border-[#EEDFD3] bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="text-xs font-semibold uppercase tracking-wide text-[#E85D3F]">Business order</p><h2 className="mt-1 text-xl font-bold text-[#3A2925]">{group.businessName}</h2></div>
                    <span className="font-bold text-[#3A2925]">${group.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="mt-4 space-y-2 border-y border-[#EEDFD3] py-4">
                    {group.items.map((item) => <div key={item.listing_id} className="flex justify-between gap-4 text-sm"><span className="text-[#71605A]">{item.title} × {item.quantity}</span><span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span></div>)}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {(["pickup", "delivery"] as const).map((method) => (
                      <button key={method} type="button" disabled={method === "delivery" && !settings?.loadingAreas && settings?.areas.length === 0} onClick={() => updateFulfillment(group.businessId, { type: method })} className={`rounded-xl border-2 p-3 text-left disabled:cursor-not-allowed disabled:opacity-45 ${settings?.type === method ? "border-[#E85D3F] bg-[#FFF0E5]" : "border-[#EEDFD3]"}`}>
                        <span className="font-semibold capitalize text-[#3A2925]">{method}</span>
                        <span className="mt-1 block text-xs text-[#71605A]">{method === "pickup" ? "Collect at this business" : "Deliver this order"}</span>
                      </button>
                    ))}
                  </div>
                  {settings?.type === "delivery" && (
                    <div className="mt-4 space-y-3">
                      <select value={settings.areaId} onChange={(event) => updateFulfillment(group.businessId, { areaId: event.target.value })} className="w-full rounded-xl border border-[#EEDFD3] bg-white px-4 py-3 text-sm outline-none focus:border-[#E85D3F]">
                        <option value="">{settings.loadingAreas ? "Loading delivery areas..." : "Choose delivery area"}</option>
                        {settings.areas.map((area) => <option key={area._id} value={area._id}>{area.area_name} · ${area.delivery_fee.toFixed(2)}</option>)}
                      </select>
                      <textarea rows={2} value={settings.address} onChange={(event) => updateFulfillment(group.businessId, { address: event.target.value })} placeholder="Full delivery address for this order" className="w-full resize-none rounded-xl border border-[#EEDFD3] px-4 py-3 text-sm outline-none focus:border-[#E85D3F]" />
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          <aside className="h-fit rounded-2xl border border-[#EEDFD3] bg-white p-6 shadow-sm lg:sticky lg:top-24">
            <h2 className="text-lg font-bold text-[#3A2925]">Payment summary</h2>
            <div className="mt-5 flex justify-between text-sm"><span className="text-[#71605A]">Business orders</span><span>{groups.length}</span></div>
            <div className="mt-3 flex justify-between text-sm"><span className="text-[#71605A]">Items subtotal</span><span>${itemSubtotal.toFixed(2)}</span></div>
            <div className="mt-3 flex justify-between text-sm"><span className="text-[#71605A]">Delivery fees</span><span>${deliveryTotal.toFixed(2)}</span></div>
            <div className="mt-5 flex justify-between border-t border-[#EEDFD3] pt-4 text-lg font-bold text-[#3A2925]"><span>Total</span><span>${(itemSubtotal + deliveryTotal).toFixed(2)}</span></div>
            <p className="mt-3 text-xs leading-5 text-[#71605A]">You will make one secure payment. BalaHader sends each business its own order and records its earnings separately.</p>
            <button type="submit" disabled={loading || !groups.length} className="mt-5 w-full rounded-xl bg-[#E85D3F] px-5 py-3 font-semibold text-white hover:bg-[#C9472E] disabled:opacity-60">{loading ? "Preparing all orders..." : "Continue to one payment"}</button>
          </aside>
        </form>
      </main>
    </PageFrame>
  );
}
