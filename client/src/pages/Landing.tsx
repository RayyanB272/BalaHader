import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartHandshake, Store, Utensils, PackageCheck, type LucideIcon } from 'lucide-react';
import api from '../services/api';
import PublicHeader from '../components/layout/PublicHeader';
import Footer from '../components/layout/Footer';

const categories = [
  { name: 'Bakery & Pastries', value: "bakery", img: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop&auto=format' },
  { name: 'Prepared Meals', value: "prepared_meals", img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop&auto=format' },
  { name: 'Fresh Produce', value: "fresh_produce", img: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop&auto=format' },
  { name: 'Drinks', value: "drinks", img: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=200&h=200&fit=crop&auto=format' },
  { name: 'Desserts', value: "desserts", img: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=200&h=200&fit=crop&auto=format' },
  { name: 'Snacks', value: "snacks", img: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=200&h=200&fit=crop&auto=format' },
];

const steps = [
  { num: '1', title: 'Find', desc: 'Browse surplus food from local businesses.' },
  { num: '2', title: 'Order', desc: 'Choose pickup or delivery (where available).' },
  { num: '3', title: 'Enjoy', desc: 'Collect your food and enjoy great meals for less.' },
  { num: '4', title: 'Make an Impact', desc: 'Help reduce food waste and support a more sustainable community.' },
];

interface PublicStats {
  meals_saved: number;
  businesses: number;
  charities: number;
  donations_completed: number;
}

const impactCards: { key: keyof PublicStats; label: string; text: string; icon: LucideIcon }[] = [
  { key: 'meals_saved', label: 'Meals saved', text: 'Sold or donated instead of thrown away', icon: Utensils },
  { key: 'businesses', label: 'Local businesses', text: 'Sharing their surplus food', icon: Store },
  { key: 'charities', label: 'Verified charities', text: 'Receiving food donations', icon: HeartHandshake },
  { key: 'donations_completed', label: 'Donations delivered', text: 'Collected by charities in Tripoli', icon: PackageCheck },
];

export default function Landing() {
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    api.get<PublicStats>('/public/stats').then((response) => setStats(response.data)).catch(() => setStats(null));
  }, []);

  return (
    <div className="min-h-screen bg-[#FFF9EE]">
      <PublicHeader />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-16 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <p className="text-xs font-semibold text-[#C9472E] uppercase tracking-widest mb-3">Good food shouldn't go to waste</p>
          <h1 className="font-display font-bold text-5xl sm:text-6xl text-[#3A2925] leading-tight mb-2">
            Delicious Food
          </h1>
          <h1 className="font-display font-bold text-5xl sm:text-6xl text-[#E85D3F] leading-tight mb-6">
            A Brighter Tomorrow
          </h1>
          <p className="text-[#71605A] text-lg mb-8 max-w-md">
            BalaHader connects surplus food from local businesses with people who appreciate it — at lower prices, with a bigger purpose.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            <Link to="/browse" className="inline-flex items-center gap-2 px-6 py-3 bg-[#E85D3F] text-white font-semibold rounded-xl hover:bg-[#C9472E] transition-colors">
              Browse Surplus Food →
            </Link>
            <Link to="/#how-it-works" className="inline-flex items-center gap-2 px-6 py-3 border border-[#EEDFD3] text-[#3A2925] font-semibold rounded-xl hover:border-[#E85D3F] transition-colors">
              How It Works
            </Link>
          </div>
          <div className="flex gap-8">
            {[
              { icon: '🌱', label: 'Reduce Food Waste' },
              { icon: '🤝', label: 'Support Local Businesses' },
              { icon: '❤️', label: 'Stronger Communities' },
            ].map((v) => (
              <div key={v.label} className="flex items-center gap-2">
                <span className="text-lg">{v.icon}</span>
                <span className="text-xs font-medium text-[#71605A]">{v.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative hidden lg:block">
          <div className="relative rounded-3xl overflow-hidden h-96 bg-[#FFF0E5]">
            <img
              src="https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&h=500&fit=crop&auto=format"
              alt="Fresh food basket"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#3A2925]/30 to-transparent" />
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-2xl p-3 shadow-lg">
              <div className="flex items-center gap-2">
<img src="/favicon.svg" alt="" className="h-8 w-8 rounded-lg" />
                <div>
                  <div className="font-display font-bold text-sm text-[#3A2925]">BalaHader</div>
                  <div className="text-[10px] text-[#71605A]">Good Food. A Brighter Tomorrow.</div>
                </div>
              </div>
            </div>
            {/* doodle accent */}
            <div className="absolute top-4 right-4 font-display italic text-white/80 text-sm font-semibold text-right leading-snug">
              Small Choices<br />Big Change ♡
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-display font-bold text-3xl text-[#3A2925]">Explore Surplus Food</h2>
            <p className="text-[#71605A] mt-1">Fresh food. Lower prices. Real impact.</p>
          </div>
          <Link to="/browse" className="text-sm font-medium text-[#C9472E] hover:underline">View All →</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              to={`/browse?category=${cat.value}`}
              className="group text-center"
            >
              <div className="relative h-28 rounded-2xl overflow-hidden mb-2 bg-[#FFF0E5]">
                <img src={cat.img} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#3A2925]/40 to-transparent" />
                <div className="absolute bottom-2 left-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow">
                  <span className="text-xs">🍃</span>
                </div>
              </div>
              <p className="text-xs font-semibold text-[#3A2925] group-hover:text-[#C9472E]">{cat.name}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Impact Banner */}
      <section id="impact" className="bg-[#FFF0E5] border-y border-[#EEDFD3] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold text-[#C9472E] uppercase tracking-widest mb-2">Together we make a difference</p>
            <h2 className="font-display font-bold text-4xl text-[#3A2925] mb-2">
              Our Impact <span className="text-[#E85D3F]">So Far</span>
            </h2>
            <p className="text-[#71605A]">Every saved meal creates a positive change for our community and our planet.</p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {impactCards.map(({ key, label, text, icon: Icon }) => (
              <div key={key} className="rounded-2xl border border-[#EEDFD3] bg-white p-6 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF0E5] text-[#C9472E]">
                  <Icon size={22} />
                </span>
                <p className="mt-5 font-display text-4xl font-bold text-[#3A2925]">
                  {stats ? stats[key].toLocaleString() : '—'}
                </p>
                <p className="mt-1 font-semibold text-[#3A2925]">{label}</p>
                <p className="mt-1 text-sm text-[#71605A]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <h2 className="font-display font-bold text-3xl text-[#3A2925] mb-2">How BalaHader Works</h2>
        <p className="text-[#71605A] mb-10">A simple way to turn surplus food into a bigger impact.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div key={step.num} className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full border-2 border-[#E85D3F] flex items-center justify-center mb-4 text-[#C9472E] font-display font-bold text-lg bg-white">
                {step.num}
              </div>
              <h3 className="font-display font-semibold text-[#3A2925] mb-2">{step.title}</h3>
              <p className="text-sm text-[#71605A]">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Good for Everyone */}
      <section id="about" className="bg-[#FFF0E5] py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="font-display font-bold text-3xl text-[#3A2925] mb-2">Good for Everyone</h2>
          <p className="text-[#71605A] mb-10">Different roles. A shared purpose.</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                img: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500&h=300&fit=crop&auto=format',
                icon: '🏪',
                title: 'For Businesses',
                desc: 'Turn your surplus food into real impact. Reduce waste, reach new customers, and be part of a more sustainable future.',
                cta: 'Join as a Business',
                to: '/register?type=business',
              },
              {
                img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=300&fit=crop&auto=format", icon: '👥',
                title: 'For Customers',
                desc: 'Discover great food from your favorite local places at lower prices while helping reduce food waste.',
                cta: 'Start Exploring',
                to: '/register?type=customer',
              },
              {
                img: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=500&h=300&fit=crop&auto=format',
                icon: '❤️',
                title: 'For Charities',
                desc: 'Receive surplus food and help it reach those in need. Together, we can support a stronger, healthier community.',
                cta: 'Join as a Charity',
                to: '/register?type=charity',
              },
            ].map((card) => (
              <div key={card.title} className="bg-white rounded-2xl border border-[#EEDFD3] overflow-hidden">
                <div className="h-48 overflow-hidden">
                  <img src={card.img} alt={card.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-5">
                  <div className="w-10 h-10 bg-[#FFF0E5] rounded-xl flex items-center justify-center text-xl mb-3">{card.icon}</div>
                  <h3 className="font-display font-bold text-[#3A2925] text-lg mb-2">{card.title}</h3>
                  <p className="text-sm text-[#71605A] mb-4">{card.desc}</p>
                  <Link to={card.to} className="inline-flex items-center gap-2 px-4 py-2 border border-[#E85D3F] text-[#C9472E] text-sm font-semibold rounded-xl hover:bg-[#E85D3F] hover:text-white transition-colors">
                    {card.cta} →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-4 sm:mx-6 mb-14 max-w-7xl lg:mx-auto rounded-3xl bg-[#FFF0E5] border border-[#EEDFD3] p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
<img src="/favicon.svg" alt="" className="h-8 w-8 rounded-lg" />
          </div>
          <h2 className="font-display font-bold text-2xl text-[#3A2925]">
            Good Food Creates <span className="text-[#E85D3F]">Brighter Tomorrows</span>
          </h2>
          <p className="text-[#71605A] mt-1">Join BalaHader today and be part of the change.</p>
        </div>
        <Link to="/register" className="flex-shrink-0 px-8 py-3 bg-[#E85D3F] text-white font-semibold rounded-xl hover:bg-[#C9472E] transition-colors">
          Get Started →
        </Link>
      </section>

      <Footer />
    </div>
  );
}
