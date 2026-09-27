import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import PageFrame from "../components/layout/PageFrame";
import EmptyState from "../components/ui/EmptyState";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { getFavoriteIds, subscribeFavorites, toggleFavorite } from "../services/favoriteService";
import { getListing, type ListingDetail } from "../services/listingService";

export default function SavedListingsPage() {
  const [items,setItems]=useState<ListingDetail[]>([]); const [loading,setLoading]=useState(true);
  async function load(){ setLoading(true); const results=await Promise.allSettled(getFavoriteIds().map(getListing)); setItems(results.filter((item): item is PromiseFulfilledResult<ListingDetail> => item.status==="fulfilled").map((item)=>item.value)); setLoading(false); }
  useEffect(()=>{ void load(); return subscribeFavorites(()=>void load()); },[]);
  return <PageFrame><main className="mx-auto min-h-[60vh] w-full max-w-6xl px-4 py-10 sm:px-6"><h1 className="text-3xl font-bold">Saved food</h1><p className="mt-2 text-[#71605A]">Keep favorite listings in one place.</p>{loading?<LoadingSpinner/>:items.length===0?<EmptyState title="Nothing saved yet" description="Use the heart on a listing to save it here."/>:<div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map((item)=><article key={item._id} className="overflow-hidden rounded-2xl border border-[#EEDFD3] bg-white shadow-sm"><img src={item.image_url} alt={item.title} className="h-44 w-full object-cover"/><div className="p-5"><div className="flex justify-between gap-3"><h2 className="font-bold">{item.title}</h2><button aria-label="Remove favorite" onClick={()=>toggleFavorite(item._id)}><Heart className="fill-[#E85D3F] text-[#E85D3F]" size={20}/></button></div><p className="mt-2 text-sm text-[#71605A]">{item.business?.name}</p><div className="mt-4 flex items-center justify-between"><span className="font-bold text-[#C9472E]">${item.discounted_price.toFixed(2)}</span><Link to={`/food/${item._id}`} className="text-sm font-semibold text-[#C9472E]">View →</Link></div></div></article>)}</div>}</main></PageFrame>;
}
