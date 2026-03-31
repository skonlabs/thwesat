import { motion } from "framer-motion";
import { Search, Star, MapPin, MessageCircle, Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const categories = ["အားလုံး", "Tech", "Design", "Business", "Legal", "Career"];

const mentors = [
  { name: "ဒေါ်ခင်မြတ်နိုး", nameEn: "Khin Myat Noe", role: "Senior Software Engineer", company: "Grab, Singapore", location: "Singapore", rating: 4.9, reviews: 47, expertise: ["React", "System Design", "Career Coaching"], avatar: "KM", available: true },
  { name: "ဦးဇော်မင်း", nameEn: "Zaw Min", role: "Product Designer", company: "Agoda, Bangkok", location: "Bangkok, TH", rating: 4.8, reviews: 32, expertise: ["UI/UX", "Design Systems", "Portfolio Review"], avatar: "ZM", available: true },
  { name: "ဒေါ်သီတာ", nameEn: "Thida", role: "Immigration Lawyer", company: "Independent", location: "Bangkok, TH", rating: 5.0, reviews: 89, expertise: ["Thai Work Permit", "Pink Card", "Visa"], avatar: "TH", available: false },
  { name: "ဦးအောင်ကျော်", nameEn: "Aung Kyaw", role: "Engineering Manager", company: "LINE, Tokyo", location: "Tokyo, JP", rating: 4.7, reviews: 21, expertise: ["Leadership", "Interview Prep", "Japan Work"], avatar: "AK", available: true },
];

const Mentors = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 pt-6">
        <h1 className="mb-1 text-xl font-bold text-foreground">လမ်းညွှန်သူများ</h1>
        <p className="mb-4 text-xs text-muted-foreground">Connect with mentors · အတွေ့အကြုံရှင်များနှင့် ချိတ်ဆက်ပါ</p>

        <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input placeholder="လမ်းညွှန်သူ ရှာဖွေရန်..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat, i) => (
            <button
              key={cat}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition-all ${
                i === 0 ? "bg-primary text-primary-foreground shadow-gold" : "bg-card text-muted-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 px-6 pb-6">
        {mentors.map((mentor, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl bg-card p-4 shadow-card"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-gold text-sm font-bold text-primary-foreground">
                {mentor.avatar}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{mentor.name}</h3>
                    <p className="text-[11px] text-muted-foreground">{mentor.nameEn}</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                    <span className="text-xs font-semibold text-foreground">{mentor.rating}</span>
                    <span className="text-[10px] text-muted-foreground">({mentor.reviews})</span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-foreground/80">{mentor.role}</p>
                <p className="text-[11px] text-muted-foreground">{mentor.company}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {mentor.expertise.map((tag) => (
                <span key={tag} className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {mentor.location}
                </span>
                {mentor.available ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-medium text-emerald">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald" /> Available
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Busy
                  </span>
                )}
              </div>
              <Button variant="default" size="sm" className="rounded-lg text-xs">
                <MessageCircle className="mr-1 h-3.5 w-3.5" /> ချိတ်ဆက်
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Mentors;
