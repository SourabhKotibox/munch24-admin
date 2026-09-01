import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2, ArrowLeft, HelpCircle, Mail, MessageSquare, ChevronDown, Search } from "lucide-react";
import { useGetPublicFAQs } from "@/lib/api-client";
import { PublicHeader, PublicFooter } from "@/pages/streaming-home";

export default function HelpSupportPage() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("appUser");
      if (stored) setUser(JSON.parse(stored));
    } catch {}
  }, []);

  const { data: faqsData, isLoading } = useGetPublicFAQs();
  const faqs: any[] = faqsData?.data || [];

  const filteredFaqs = faqs.filter(
    (faq: any) =>
      faq.question.toLowerCase().includes(search.toLowerCase()) ||
      faq.answer.toLowerCase().includes(search.toLowerCase())
  );

  const handleSignOut = () => {
    localStorage.removeItem("appUser");
    localStorage.removeItem("appAccessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("ott_active_profile");
    setLocation("/login");
    window.location.reload();
  };

  return (
    <div className="min-h-screen text-foreground flex flex-col bg-[#030306]">
      <PublicHeader
        activeTab="home"
        setActiveTab={(tab) => {
          if (tab === "home") setLocation("/");
          else if (tab === "movies") setLocation("/browse/movies");
          else if (tab === "tvshows") setLocation("/tv-shows-browse");
          else setLocation(`/browse/${tab}`);
        }}
        onSignIn={() => setLocation("/login")}
        onSignOut={handleSignOut}
        user={user}
      />

      <div className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-8 pt-28 pb-12">
        {/* Header Section */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            <h1 className="text-foreground font-black text-2xl tracking-tight">Help & Support</h1>
          </div>
        </div>

        {/* Search Block */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/80" />
          <input
            type="text"
            placeholder="Search for questions (e.g. subscription, login, playback)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.02] border border-white/5 focus:border-primary text-foreground placeholder:text-foreground/80 pl-12 pr-4 py-4 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary transition-all backdrop-blur-md"
          />
        </div>

        {/* FAQ Accordion List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : filteredFaqs.length === 0 ? (
          <div className="text-center py-16 bg-white/[0.01] border border-white/5 rounded-2xl p-8 mb-8">
            <HelpCircle className="w-12 h-12 text-foreground/80 mx-auto mb-3 opacity-40" />
            <h3 className="text-foreground font-bold text-lg mb-1">No results found</h3>
            <p className="text-foreground/80 text-sm max-w-sm mx-auto">
              We couldn't find any FAQs matching "{search}". Try searching for other terms or get in touch.
            </p>
          </div>
        ) : (
          <div className="space-y-4 mb-10">
            {filteredFaqs.map((faq: any) => {
              const isExpanded = expandedId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden transition-all duration-300 hover:border-white/10"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : faq.id)}
                    className="w-full flex items-center justify-between p-5 text-left font-bold text-sm sm:text-base text-foreground focus:outline-none"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${
                        isExpanded ? "rotate-180 text-primary" : ""
                      }`}
                    />
                  </button>
                  <div
                    className={`transition-all duration-300 ease-in-out ${
                      isExpanded ? "max-h-[500px] border-t border-white/5" : "max-h-0 overflow-hidden"
                    }`}
                  >
                    <p className="p-5 text-foreground/80 text-xs sm:text-sm leading-relaxed whitespace-pre-line bg-zinc-950/20">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}


      </div>

      <PublicFooter />
    </div>
  );
}
