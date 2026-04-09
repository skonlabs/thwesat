import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { useGuide } from "@/hooks/use-guides-data";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";

const categories = ["visa", "employment", "essentials", "safety", "finance", "legal", "general"];

const AdminEditGuide = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const { data: guide, isLoading } = useGuide(isNew ? undefined : id);

  const [title, setTitle] = useState("");
  const [titleMy, setTitleMy] = useState("");
  const [category, setCategory] = useState("general");
  const [country, setCountry] = useState("");
  const [countryFlag, setCountryFlag] = useState("");
  const [content, setContent] = useState("");
  const [contentMy, setContentMy] = useState("");
  const [readTime, setReadTime] = useState("5");

  useEffect(() => {
    if (guide) {
      setTitle(guide.title || "");
      setTitleMy(guide.title_my || "");
      setCategory(guide.category || "general");
      setCountry(guide.country || "");
      setCountryFlag(guide.country_flag || "");
      setContent(guide.content || "");
      setContentMy(guide.content_my || "");
      setReadTime((guide.read_time_minutes || 5).toString());
    }
  }, [guide]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    const payload = {
      title,
      title_my: titleMy || null,
      category,
      country: country || null,
      country_flag: countryFlag || null,
      content,
      content_my: contentMy || null,
      read_time_minutes: parseInt(readTime) || 5,
      is_verified: true,
    };

    if (isNew) {
      const { error } = await supabase.from("guides").insert(payload);
      if (error) {
        toast.error("Failed to create guide");
        return;
      }
      toast.success(lang === "my" ? "လမ်းညွှန်ချက် ဖန်တီးပြီး" : "Guide created");
    } else {
      const { error } = await supabase.from("guides").update(payload).eq("id", id!);
      if (error) {
        toast.error("Failed to update guide");
        return;
      }
      toast.success(lang === "my" ? "လမ်းညွှန်ချက် ပြင်ဆင်ပြီး" : "Guide updated");
    }

    queryClient.invalidateQueries({ queryKey: ["guides"] });
    queryClient.invalidateQueries({ queryKey: ["guide", id] });
    navigate("/guides");
  };

  if (!isNew && isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={isNew ? (lang === "my" ? "လမ်းညွှန်ချက်အသစ်" : "New Guide") : (lang === "my" ? "လမ်းညွှန်ချက် ပြင်ဆင်" : "Edit Guide")} />
      <div className="space-y-4 px-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">Title (EN) *</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} className="rounded-xl" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">Title (MY)</label>
          <Input value={titleMy} onChange={e => setTitleMy(e.target.value)} className="rounded-xl" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">Category</label>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <button key={c} onClick={() => setCategory(c)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${category === c ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Country</label>
            <Input value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. Thailand" className="rounded-xl" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Flag Emoji</label>
            <Input value={countryFlag} onChange={e => setCountryFlag(e.target.value)} placeholder="🇹🇭" className="rounded-xl" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">Read Time (min)</label>
          <Input type="number" value={readTime} onChange={e => setReadTime(e.target.value)} className="w-24 rounded-xl" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">Content (EN)</label>
          <Textarea value={content} onChange={e => setContent(e.target.value)} className="min-h-[160px] rounded-xl text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">Content (MY)</label>
          <Textarea value={contentMy} onChange={e => setContentMy(e.target.value)} className="min-h-[160px] rounded-xl text-sm" />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={() => navigate("/guides")}>{lang === "my" ? "မလုပ်တော့" : "Cancel"}</Button>
          <Button className="flex-1 rounded-xl" onClick={handleSave} disabled={!title.trim()}>{lang === "my" ? "သိမ်းရန်" : "Save"}</Button>
        </div>
      </div>
    </div>
  );
};

export default AdminEditGuide;
