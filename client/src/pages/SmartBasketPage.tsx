import { type FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Lock, RefreshCw, ShoppingBasket, Sparkles, Trash2, TriangleAlert, Unlock } from "lucide-react";
import PageFrame from "../components/layout/PageFrame";
import {
  generateSmartBasket,
  type FulfillmentType,
  type SmartBasketResponse,
} from "../services/smartBasketService";
import { replaceCartWithSmartBasket } from "../services/cartService";

const purposes = ["Breakfast", "Lunch", "Dinner", "Snacks", "Gathering"];

function validPurpose(value?: string) {
  return purposes.includes(value || "") ? value! : "Lunch";
}
const preferenceOptions = ["Bakery", "Prepared meals", "Fresh produce", "Dairy", "Drinks", "Desserts", "Snacks", "Vegetarian", "No dairy"];

const field =
  "h-11 w-full rounded-xl border border-[#EEDFD3] bg-white px-3.5 text-[15px] text-[#3A2925]";

const SMART_BASKET_KEY = "balahader_smart_basket";

interface SavedSmartBasket {
  budget: string;
  people: string;
  meals: string;
  mealPurpose: string;
  preferences: string;
  fulfillmentType: FulfillmentType;
  areaCode: string;
  basket: SmartBasketResponse | null;
  optimizationMode?: "best_match" | "lowest_price" | "most_variety";
}

function readSavedBasket(): SavedSmartBasket | null {
  try {
    const saved = JSON.parse(localStorage.getItem(SMART_BASKET_KEY) || "null") as SavedSmartBasket | null;
    if (saved?.basket && (typeof saved.basket.meals !== "number" || saved.basket.items.some((item) => !item.business_id))) saved.basket = null;
    return saved;
  } catch {
    return null;
  }
}

export default function SmartBasketPage() {
  const saved = useRef(readSavedBasket()).current;
  const [budget, setBudget] = useState(saved?.budget ?? "20");
  const [people, setPeople] = useState(saved?.people ?? "2");
  const [meals, setMeals] = useState(saved?.meals ?? "1");
  const [mealPurpose, setMealPurpose] = useState(validPurpose(saved?.mealPurpose));
  const [preferences, setPreferences] = useState(saved?.preferences ?? "");
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>(saved?.fulfillmentType ?? "pickup");
  const [areaCode, setAreaCode] = useState(saved?.areaCode ?? "");
  const [optimizationMode, setOptimizationMode] = useState(saved?.optimizationMode ?? "best_match");

  const [basket, setBasket] = useState<SmartBasketResponse | null>(saved?.basket ?? null);
  const [loading, setLoading] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [error, setError] = useState("");
  const [lockedItems, setLockedItems] = useState<Set<string>>(new Set());

  const navigate = useNavigate();
  const resultRef = useRef<HTMLElement>(null);

  useEffect(() => {
    localStorage.setItem(SMART_BASKET_KEY, JSON.stringify({
      budget, people, meals, mealPurpose, preferences, fulfillmentType, areaCode, basket, optimizationMode,
    }));
  }, [budget, people, meals, mealPurpose, preferences, fulfillmentType, areaCode, basket, optimizationMode]);

  // On small screens the result sits below the form, so bring it into view.
  useEffect(() => {
    if ((basket || loading) && window.innerWidth < 1024) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [basket, loading]);

  async function buildBasket(excludedListingIds: string[] = [], lockedListingIds: string[] = []) {
    const numericBudget = Number(budget);
    const numericPeople = Number(people);
    const numericMeals = Number(meals);

    if (numericBudget <= 0) return setError("Enter a budget greater than zero.");
    if (!Number.isInteger(numericPeople) || numericPeople <= 0) return setError("Enter a valid number of people.");
    if (!Number.isInteger(numericMeals) || numericMeals < 1 || numericMeals > 7) return setError("Choose between 1 and 7 meals.");
    if (!mealPurpose.trim()) return setError("Choose the purpose of this meal.");
    if (fulfillmentType === "delivery" && !areaCode.trim()) return setError("Enter your delivery area code.");

    setLoading(true);
    setError("");

    try {
      const result = await generateSmartBasket({
        budget: numericBudget,
        currency: "USD",
        people: numericPeople,
        meals: numericMeals,
        meal_purpose: mealPurpose.trim(),
        preferences: preferences.trim() || undefined,
        excluded_listing_ids: excludedListingIds,
        optimization_mode: optimizationMode,
        locked_listing_ids: lockedListingIds,
        fulfillment_type: fulfillmentType,
        area_code: fulfillmentType === "delivery" ? areaCode.trim().toUpperCase() : undefined,
      });

      setBasket(result);
    } catch (cause) {
      if (axios.isAxiosError(cause)) {
        setError(cause.response?.data?.detail || (excludedListingIds.length ? "No different basket fits these choices right now." : "The smart basket could not be generated."));
      } else {
        setError(excludedListingIds.length ? "No different basket fits these choices right now." : "The smart basket could not be generated.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLockedItems(new Set());
    void buildBasket();
  }

  function generateAnotherBasket() {
    if (!basket) return;
    const locked = [...lockedItems];
    void buildBasket(basket.items.filter((item) => !lockedItems.has(item.listing_id)).map((item) => item.listing_id), locked);
  }

  function removeSuggestedItem(listingId: string) {
    if (!basket) return;
    const items = basket.items.filter((item) => item.listing_id !== listingId);
    const removed = basket.items.find((item) => item.listing_id === listingId);
    const foodTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const servings = items.reduce((sum, item) => sum + item.quantity * (item.servings_per_unit || 1), 0);
    setBasket({ ...basket, items, food_total: foodTotal, total: Math.max(0, basket.total - (removed?.subtotal || 0)), servings });
    setLockedItems((current) => { const next = new Set(current); next.delete(listingId); return next; });
  }

  function toggleLocked(listingId: string) {
    setLockedItems((current) => { const next = new Set(current); if (next.has(listingId)) next.delete(listingId); else next.add(listingId); return next; });
  }

  function togglePreference(option: string) {
    const current = preferences.split(",").map((value) => value.trim()).filter(Boolean);
    const exists = current.some((value) => value.toLowerCase() === option.toLowerCase());
    setPreferences((exists ? current.filter((value) => value.toLowerCase() !== option.toLowerCase()) : [...current, option]).join(", "));
  }

  async function handleUseBasket() {
    if (!basket) return;

    setAddingToCart(true);
    setError("");

    try {
      await replaceCartWithSmartBasket(basket);
      localStorage.removeItem(SMART_BASKET_KEY);
      navigate("/cart");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The basket could not be added to your cart.");
    } finally {
      setAddingToCart(false);
    }
  }

  function cancelBasket() {
    if (basket && !window.confirm("Cancel this suggested basket?")) return;
    localStorage.removeItem(SMART_BASKET_KEY);
    setBudget("20");
    setPeople("2");
    setMeals("1");
    setMealPurpose("Lunch");
    setPreferences("");
    setFulfillmentType("pickup");
    setAreaCode("");
    setOptimizationMode("best_match");
    setBasket(null);
    setError("");
  }

  return (
    <PageFrame>
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 lg:py-8">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E85D3F] text-white">
            <Sparkles size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-bold leading-tight text-[#3A2925] sm:text-3xl">Smart Basket</h1>
            <p className="text-sm text-[#71605A]">
              Tell us what you need and AI builds a basket from food that's available right now.
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-[#EEDFD3] bg-white p-5"
          >
            <div className="grid grid-cols-3 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-[#3A2925]">Budget (USD)</span>
                <input type="number" min="0.5" step="0.5" required value={budget} onChange={(e) => setBudget(e.target.value)} className={field} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-[#3A2925]">Meals</span>
                <input type="number" min="1" max="7" step="1" required value={meals} onChange={(e) => setMeals(e.target.value)} className={field} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-[#3A2925]">People</span>
                <input type="number" min="1" step="1" required value={people} onChange={(e) => setPeople(e.target.value)} className={field} />
              </label>
            </div>

            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold text-[#3A2925]">What are you planning?</legend>
              <div className="flex flex-wrap gap-2">
                {purposes.map((purpose) => (
                  <button
                    key={purpose}
                    type="button"
                    aria-pressed={mealPurpose === purpose}
                    onClick={() => setMealPurpose(purpose)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      mealPurpose === purpose
                        ? "border-[#E85D3F] bg-[#FFF0E5] text-[#C9472E]"
                        : "border-[#EEDFD3] text-[#71605A] hover:border-[#E85D3F]/50"
                    }`}
                  >
                    {purpose}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#3A2925]">
                Preferences <span className="font-normal text-[#71605A]">(optional)</span>
              </span>
              <textarea
                rows={2}
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                placeholder="e.g. vegetarian, more bakery items, no dairy"
                className="w-full resize-none rounded-xl border border-[#EEDFD3] bg-white px-3.5 py-2.5 text-[15px] text-[#3A2925]"
              />
              <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Quick preferences">
                {preferenceOptions.map((option) => {
                  const selected = preferences.split(",").some((value) => value.trim().toLowerCase() === option.toLowerCase());
                  return <button key={option} type="button" aria-pressed={selected} onClick={() => togglePreference(option)} className={`rounded-full border px-2.5 py-1 text-xs font-medium ${selected ? "border-[#E85D3F] bg-[#FFF0E5] text-[#C9472E]" : "border-[#EEDFD3] text-[#71605A] hover:border-[#E85D3F]/50"}`}>{option}</button>;
                })}
              </div>
              <span className="mt-1 block text-xs text-[#71605A]">
                Not a guarantee for serious allergies.
              </span>
            </label>

            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold text-[#3A2925]">Fulfillment</legend>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#FFF0E5] p-1">
                {(["pickup", "delivery"] as FulfillmentType[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={fulfillmentType === option}
                    onClick={() => setFulfillmentType(option)}
                    className={`rounded-lg py-2 text-sm font-semibold capitalize transition-colors ${
                      fulfillmentType === option
                        ? "bg-white text-[#C9472E] shadow-sm"
                        : "text-[#71605A] hover:text-[#3A2925]"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="block"><span className="mb-1.5 block text-sm font-semibold text-[#3A2925]">Build for</span><select value={optimizationMode} onChange={(event)=>setOptimizationMode(event.target.value as typeof optimizationMode)} className={field}><option value="best_match">Best match</option><option value="lowest_price">Lowest price</option><option value="most_variety">Most variety</option></select></label>

            {fulfillmentType === "delivery" && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-[#3A2925]">Delivery area code</span>
                <input
                  type="text"
                  required
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value)}
                  placeholder="Enter your area code"
                  className={`${field} uppercase`}
                />
              </label>
            )}

            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#E85D3F] font-semibold text-white hover:bg-[#C9472E]"
            >
              <Sparkles size={18} />
              {loading ? "Building your basket..." : "Generate Smart Basket"}
            </button>
          </form>

          {/* Result */}
          <section
            ref={resultRef}
            className="rounded-2xl border border-[#EEDFD3] bg-white p-5 lg:sticky lg:top-6 sm:p-6"
          >
            {loading ? (
              <div className="space-y-3" role="status" aria-label="Building your basket">
                <div className="h-6 w-1/2 animate-pulse rounded-lg bg-[#FFF0E5]" />
                {[0, 1, 2].map((row) => (
                  <div key={row} className="h-14 animate-pulse rounded-xl bg-[#FFF0E5]" />
                ))}
                <p className="pt-1 text-center text-sm text-[#71605A]">Finding the best mix of available food...</p>
              </div>
            ) : !basket ? (
              <div className="flex min-h-64 flex-col items-center justify-center text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF0E5] text-[#E85D3F]">
                  <ShoppingBasket size={30} />
                </span>
                <h2 className="mt-4 text-xl font-bold text-[#3A2925]">Your basket will appear here</h2>
                <p className="mt-2 max-w-sm text-sm text-[#71605A]">
                  Set your budget and meal, and we'll combine suitable items from available local businesses.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#C9472E]">AI suggestion</p>
                    <h2 className="mt-0.5 text-2xl font-bold text-[#3A2925]">{basket.business_name}</h2>
                  </div>
                  <div className="rounded-xl bg-[#FFF0E5] px-4 py-2 text-right">
                    <p className="text-xs text-[#71605A]">Budget ${basket.budget.toFixed(2)}</p>
                    <p className="text-xl font-bold text-[#C9472E]">${basket.total.toFixed(2)}</p>
                  </div>
                </div>

                {basket.reason && (
                  <p className="mt-4 rounded-xl bg-[#FFF9EE] px-4 py-3 text-sm text-[#71605A]">{basket.reason}</p>
                )}
                {basket.preference_note && <p className={`mt-3 rounded-xl px-4 py-3 text-sm ${basket.preference_note.startsWith("Some") ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-700"}`}>{basket.preference_note}</p>}

                <p className="mt-4 rounded-xl border border-[#EEDFD3] bg-[#FFF0E5] px-4 py-3 text-sm font-semibold text-[#3A2925]">
                  Covers {basket.meals} meal{basket.meals === 1 ? "" : "s"} for {basket.people} people ({basket.servings} food portions).
                </p>

                <ul className="mt-4 divide-y divide-[#EEDFD3] rounded-xl border border-[#EEDFD3]">
                  {basket.items.map((item) => (
                    <li key={item.listing_id} className="flex items-center justify-between gap-4 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[#3A2925]">{item.title}</p>
                        <p className="truncate text-xs font-medium text-[#C9472E]">{item.business_name}</p>
                        {item.match_reason && <p className="truncate text-xs text-[#71605A]">{item.match_reason}</p>}
                        <p className="text-sm text-[#71605A]">
                          {item.quantity} × ${item.unit_price.toFixed(2)}
                          {item.servings_per_unit && item.servings_per_unit > 1 ? ` · serves ${item.servings_per_unit * item.quantity}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2"><p className="font-bold text-[#3A2925]">${item.subtotal.toFixed(2)}</p><button type="button" onClick={()=>toggleLocked(item.listing_id)} title={lockedItems.has(item.listing_id)?"Unlock item":"Keep item when regenerating"} className={`rounded-lg p-1.5 ${lockedItems.has(item.listing_id)?"bg-[#FFF0E5] text-[#C9472E]":"text-[#9A8981] hover:bg-[#FFF0E5]"}`}>{lockedItems.has(item.listing_id)?<Lock size={15}/>:<Unlock size={15}/>}</button><button type="button" onClick={()=>removeSuggestedItem(item.listing_id)} title="Remove item" className="rounded-lg p-1.5 text-[#9A8981] hover:bg-red-50 hover:text-red-600"><Trash2 size={15}/></button></div>
                    </li>
                  ))}
                </ul>

                <dl className="mt-4 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-[#71605A]">Food</dt>
                    <dd className="font-semibold text-[#3A2925]">${basket.food_total.toFixed(2)}</dd>
                  </div>
                  {basket.businesses?.filter((business)=>business.delivery_fee>0).map((business)=><div key={business.business_id} className="flex justify-between text-xs"><dt className="text-[#71605A]">{business.business_name} delivery</dt><dd>${business.delivery_fee.toFixed(2)}</dd></div>)}
                  <div className="flex justify-between">
                    <dt className="text-[#71605A]">Delivery</dt>
                    <dd className="font-semibold text-[#3A2925]">${basket.delivery_fee.toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-[#EEDFD3] pt-2 text-base">
                    <dt className="font-bold text-[#3A2925]">Total</dt>
                    <dd className="font-bold text-[#C9472E]">${basket.total.toFixed(2)}</dd>
                  </div>
                </dl>

                <button
                  type="button"
                  onClick={() => void handleUseBasket()}
                  disabled={addingToCart}
                  className="mt-5 h-12 w-full rounded-xl bg-[#E85D3F] font-semibold text-white hover:bg-[#C9472E]"
                >
                  {addingToCart ? "Checking availability..." : "Use This Basket"}
                </button>
                <button type="button" onClick={generateAnotherBasket} disabled={loading || addingToCart} className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#E85D3F] bg-white font-semibold text-[#C9472E] hover:bg-[#FFF0E5] disabled:cursor-not-allowed disabled:opacity-60">
                  <RefreshCw size={17} /> Generate another basket
                </button>
                <button type="button" onClick={cancelBasket} className="mt-2 h-11 w-full rounded-xl border border-[#EEDFD3] font-semibold text-[#71605A] hover:border-[#E85D3F] hover:text-[#C9472E]">
                  Cancel basket
                </button>
                <p className="mt-2 text-center text-xs text-[#71605A]">
                  Replaces your current cart. Food isn't reserved until checkout.
                </p>
              </>
            )}
          </section>
        </div>
      </div>
    </PageFrame>
  );
}
