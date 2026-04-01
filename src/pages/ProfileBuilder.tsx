import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, User, Briefcase, GraduationCap, Award, ChevronRight, ChevronLeft, Copy, Check, Globe, Plus, X, Trash2, Loader2, Sparkles, MoreHorizontal, Download, Bookmark, RotateCcw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";

const SUGGESTED_SKILLS = [
  "JavaScript", "TypeScript", "React", "Node.js", "Python", "Java", "PHP", "HTML/CSS", "SQL", "WordPress",
  "Figma", "UI/UX Design", "Graphic Design", "Adobe Photoshop", "Video Editing",
  "SEO", "Digital Marketing", "Social Media Marketing", "Content Writing", "Copywriting",
  "Data Entry", "Virtual Assistant", "Customer Service", "Project Management",
  "Excel", "Google Sheets", "Data Analysis", "Accounting", "Bookkeeping",
  "Translation", "Teaching / Tutoring", "Nursing", "Caregiving",
  "Cooking / Chef", "Sewing / Garment", "Driving", "Sales", "Leadership",
];

interface EducationEntry {
  degree: string;
  institution: string;
  year: string;
}

interface ExperienceEntry {
  company: string;
  role: string;
  duration: string;
  description: string;
}

const ProfileBuilder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const { profile, session } = useAuth();
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [cvParsed, setCvParsed] = useState(false);

  const { data: savedResumes = [] } = useQuery({
    queryKey: ["saved-resumes", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      const { data } = await supabase.from("generated_documents").select("*").eq("user_id", session.user.id).eq("doc_type", "resume").order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!session?.user?.id,
  });

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [experiences, setExperiences] = useState<ExperienceEntry[]>([{ company: "", role: "", duration: "", description: "" }]);
  const [otherInfo, setOtherInfo] = useState("");
  const [educations, setEducations] = useState<EducationEntry[]>([{ degree: "", institution: "", year: "" }]);
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);
  const [platform, setPlatform] = useState("Upwork");

  // Pre-populate from profile
  useEffect(() => {
    if (profile) {
      setName(profile.display_name || "");
      setTitle(profile.headline || "");
      if (profile.skills && profile.skills.length > 0) {
        setSkills(profile.skills);
      }
      if (profile.experience) {
        setExperiences([{ company: "", role: "", duration: "", description: profile.experience }]);
      }
    }
  }, [profile]);

  // Parse CV if file path was passed from Career Tools
  const cvFilePath = (location.state as any)?.cvFilePath;
  
  useEffect(() => {
    if (cvFilePath && session?.access_token && !cvParsed) {
      parseCv(cvFilePath);
    }
  }, [cvFilePath, session?.access_token]);

  const parseCv = async (filePath: string) => {
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-cv", {
        body: { file_path: filePath },
      });

      if (error) throw error;
      
      const parsed = data?.data;
      if (parsed) {
        if (parsed.name) setName(parsed.name);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.experiences?.length) {
          setExperiences(
            parsed.experiences.map((ex: any) => ({
              company: ex.company || "",
              role: ex.role || "",
              duration: ex.duration || "",
              description: ex.description || "",
            }))
          );
        } else if (parsed.experience) {
          // Fallback for old format
          setExperiences([{ company: "", role: "", duration: "", description: parsed.experience }]);
        }
        if (parsed.other) setOtherInfo(parsed.other);
        if (parsed.summary) setSummary(parsed.summary);
        if (parsed.skills?.length) setSkills(parsed.skills);
        if (parsed.education?.length) {
          setEducations(
            parsed.education.map((ed: any) => ({
              degree: ed.degree || "",
              institution: ed.institution || "",
              year: ed.year || "",
            }))
          );
        }
        setCvParsed(true);
        toast({
          title: lang === "my" ? "CV မှ အချက်အလက်များ ဖတ်ပြီးပါပြီ ✓" : "CV parsed successfully ✓",
          description: lang === "my" ? "အချက်အလက်များကို စစ်ဆေးပြင်ဆင်ပါ" : "Review and edit the extracted data",
        });
      }
    } catch (err: any) {
      console.error("CV parse error:", err);
      toast({
        title: lang === "my" ? "CV ဖတ်၍ မရပါ" : "Could not parse CV",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setParsing(false);
    }
  };

  const platforms = ["Upwork", "Fiverr", "LinkedIn", "Toptal"];

  const addEducation = () => {
    if (educations.length < 5) {
      setEducations([...educations, { degree: "", institution: "", year: "" }]);
    }
  };

  const removeEducation = (index: number) => {
    if (educations.length > 1) {
      setEducations(educations.filter((_, i) => i !== index));
    }
  };

  const updateEducation = (index: number, field: keyof EducationEntry, value: string) => {
    setEducations(educations.map((ed, i) => i === index ? { ...ed, [field]: value } : ed));
  };

  const addSkill = (skill?: string) => {
    const s = (skill || newSkill).trim();
    if (s && !skills.includes(s) && skills.length < 30) {
      setSkills([...skills, s]);
      setNewSkill("");
      setShowSkillSuggestions(false);
    }
  };

  const removeSkill = (skill: string) => setSkills(skills.filter(s => s !== skill));

  const filteredSuggestions = useMemo(() => {
    const q = newSkill.toLowerCase();
    return SUGGESTED_SKILLS.filter(s => !skills.includes(s) && (!q || s.toLowerCase().includes(q)));
  }, [newSkill, skills]);

  const [generatedProfile, setGeneratedProfile] = useState<{
    headline: string;
    summary: string;
    skills: string[];
    sections: { title: string; content: string }[];
  } | null>(null);

  const handleGenerate = async () => {
    if (!name && !title) {
      toast({
        title: lang === "my" ? "အချက်အလက် ဖြည့်ပါ" : "Fill in details",
        description: lang === "my" ? "အနည်းဆုံး နာမည်နှင့် ရာထူးကို ဖြည့်ပါ" : "Please fill in at least your name and title",
      });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-profile", {
        body: { name, title, summary, experiences, educations, skills, otherInfo, platform },
      });
      if (error) throw error;
      const result = data?.data;
      if (result) {
        const profileData = {
          headline: result.headline || title || "",
          summary: result.summary || "",
          skills: result.skills || skills,
          sections: result.sections || [],
        };
        setGeneratedProfile(profileData);
        setStep(3);
      } else {
        throw new Error("No data returned");
      }
    } catch (err: any) {
      console.error("Profile generation error:", err);
      toast({
        title: lang === "my" ? "ပရိုဖိုင် ဖန်တီး၍ မရပါ" : "Profile generation failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedProfile) return;
    const text = `${generatedProfile.headline}\n\n${generatedProfile.summary}\n\n${generatedProfile.sections.map(s => `${s.title}\n${s.content}`).join("\n\n")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: lang === "my" ? "ကူးယူပြီးပါပြီ" : "Copied!", description: lang === "my" ? "ပရိုဖိုင်ကို clipboard သို့ ကူးယူပြီးပါပြီ" : "Profile copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const getProfileText = () => {
    if (!generatedProfile) return { headline: "", summaryText: "", sectionsText: "", skillsLine: "" };
    const headline = `${name ? `${name} — ` : ""}${generatedProfile.headline}`;
    const summaryText = generatedProfile.summary;
    const sectionsText = generatedProfile.sections.map(s => `${s.title}\n${s.content}`).join("\n\n");
    const skillsLine = generatedProfile.skills.length > 0 ? `\nSkills\n${generatedProfile.skills.join(", ")}` : "";
    return { headline, summaryText, sectionsText, skillsLine };
  };

  const handleDownloadPdf = async () => {
    if (!generatedProfile) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let y = 25;

    const addText = (text: string, fontSize: number, bold: boolean = false) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      const lines = doc.splitTextToSize(text, maxWidth);
      for (const line of lines) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += fontSize * 0.5;
      }
      y += 3;
    };

    const { headline, summaryText } = getProfileText();
    addText(headline, 16, true);
    y += 2;
    addText("Summary", 11, true);
    addText(summaryText, 10);

    for (const section of generatedProfile!.sections) {
      addText(section.title, 11, true);
      const contentLines = section.content.split("\n");
      for (const line of contentLines) {
        addText(line, 10);
      }
    }

    if (generatedProfile!.skills.length > 0) {
      addText("Skills", 11, true);
      addText(generatedProfile!.skills.join("  •  "), 10);
    }

    doc.save(`${name || "profile"}-${platform}.pdf`);
    toast({ title: lang === "my" ? "PDF ဒေါင်းလုဒ်လုပ်ပြီးပါပြီ" : "PDF downloaded" });
  };

  const handleDownloadDocx = async () => {
    if (!generatedProfile) return;
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");

    const { headline, summaryText } = getProfileText();

    const children: any[] = [
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: headline, bold: true })] }),
      new Paragraph({ children: [] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "Summary", bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: summaryText, size: 22 })] }),
      new Paragraph({ children: [] }),
    ];

    for (const section of generatedProfile!.sections) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: section.title, bold: true })] }));
      const contentLines = section.content.split("\n");
      for (const line of contentLines) {
        children.push(new Paragraph({ children: [new TextRun({ text: line.trim(), size: 22 })] }));
      }
      children.push(new Paragraph({ children: [] }));
    }

    if (generatedProfile!.skills.length > 0) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "Skills", bold: true })] }));
      children.push(new Paragraph({ children: [new TextRun({ text: generatedProfile!.skills.join("  •  "), size: 22 })] }));
    }

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name || "profile"}-${platform}.docx`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: lang === "my" ? "DOCX ဒေါင်းလုဒ်လုပ်ပြီးပါပြီ" : "DOCX downloaded" });
  };

  const stepLabels = [
    lang === "my" ? "အချက်အလက်" : "Details",
    lang === "my" ? "Platform" : "Platform",
    lang === "my" ? "ရလဒ်" : "Result",
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title={lang === "my" ? "ပရိုဖိုင် တည်ဆောက်ရန်" : "Profile Builder"} onBack={() => step > 1 ? setStep(s => s - 1) : navigate("/ai-tools")} />
      <div className="px-5 pt-4">
        {/* Progress */}
        <div className="mb-5 flex items-center gap-2">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className={`h-1.5 w-full rounded-full ${i + 1 <= step ? "bg-primary" : "bg-muted"}`} />
              <span className={`text-[10px] font-medium ${i + 1 <= step ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Input details */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {/* CV Parsing indicator */}
              {parsing && (
                <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" strokeWidth={2} />
                  <div>
                    <p className="text-sm font-medium text-primary">
                      {lang === "my" ? "CV ဖတ်နေသည်..." : "Parsing your CV with AI..."}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {lang === "my" ? "အချက်အလက်များကို ထုတ်ယူနေပါသည်" : "Extracting name, education, skills & experience"}
                    </p>
                  </div>
                </div>
              )}

              {/* Pre-populated notice */}
              {!parsing && (cvParsed || (profile && (profile.display_name || (profile.skills && profile.skills.length > 0)))) && (
                <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5">
                  <Sparkles className="h-4 w-4 text-primary" strokeWidth={2} />
                  <p className="text-xs text-primary font-medium">
                    {cvParsed
                      ? (lang === "my" ? "CV မှ အချက်အလက်များ ဖြည့်သွင်းထားပါသည် — စစ်ဆေးပြင်ဆင်ပါ" : "Pre-filled from your CV — review & edit below")
                      : (lang === "my" ? "သင့်ပရိုဖိုင်မှ အချက်အလက်များ ထည့်သွင်းထားပါသည်" : "Pre-filled from your profile")}
                  </p>
                </div>
              )}

              {/* Personal Info */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <User className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "ကိုယ်ရေးအချက်အလက်" : "Personal Info"}</h2>
                    <p className="text-[11px] text-muted-foreground">{lang === "my" ? "မြန်မာ သို့မဟုတ် အင်္ဂလိပ်ဘာသာဖြင့် ဖြည့်ပါ" : "Fill in Myanmar or English"}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "နာမည်" : "Full Name"}</label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder={lang === "my" ? "ဥပမာ - မောင်မောင်" : "e.g. Maung Maung"} className="h-10 rounded-lg" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ရာထူး / အထူးပြု" : "Job Title / Specialty"}</label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={lang === "my" ? "ဥပမာ - Web Developer" : "e.g. Web Developer"} className="h-10 rounded-lg" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ကိုယ်ရေးအကျဉ်းချုပ်" : "Professional Summary"}</label>
                    <textarea
                      value={summary}
                      onChange={e => setSummary(e.target.value)}
                      rows={3}
                      placeholder={lang === "my" ? "သင့်အကြောင်း အကျဉ်းချုပ် ရေးပါ..." : "Brief professional summary or objective..."}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Experience - Multiple entries */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald/10">
                      <Briefcase className="h-5 w-5 text-emerald" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "အတွေ့အကြုံ" : "Work Experience"}</h2>
                      <p className="text-[10px] text-muted-foreground">{experiences.length}/10</p>
                    </div>
                  </div>
                  {experiences.length < 10 && (
                    <Button variant="outline" size="sm" onClick={() => setExperiences([...experiences, { company: "", role: "", duration: "", description: "" }])} className="rounded-lg text-xs">
                      <Plus className="mr-1 h-3 w-3" strokeWidth={1.5} />
                      {lang === "my" ? "ထပ်ထည့်" : "Add"}
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  {experiences.map((ex, i) => (
                    <div key={i} className="relative rounded-lg border border-border bg-muted/30 p-3">
                      {experiences.length > 1 && (
                        <button onClick={() => setExperiences(experiences.filter((_, idx) => idx !== i))} className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      )}
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ရာထူး" : "Role"}</label>
                          <Input
                            value={ex.role}
                            onChange={e => setExperiences(experiences.map((x, idx) => idx === i ? { ...x, role: e.target.value } : x))}
                            placeholder={lang === "my" ? "ဥပမာ - Web Developer" : "e.g. Web Developer"}
                            className="h-9 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ကုမ္ပဏီ / အဖွဲ့အစည်း" : "Company / Organization"}</label>
                          <Input
                            value={ex.company}
                            onChange={e => setExperiences(experiences.map((x, idx) => idx === i ? { ...x, company: e.target.value } : x))}
                            placeholder={lang === "my" ? "ဥပမာ - ABC Company" : "e.g. ABC Company"}
                            className="h-9 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "ကာလ" : "Duration"}</label>
                          <Input
                            value={ex.duration}
                            onChange={e => setExperiences(experiences.map((x, idx) => idx === i ? { ...x, duration: e.target.value } : x))}
                            placeholder={lang === "my" ? "ဥပမာ - Jan 2020 - Dec 2022" : "e.g. Jan 2020 - Dec 2022"}
                            className="h-9 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-foreground">{lang === "my" ? "အလုပ်ဖော်ပြချက် / တာဝန်များ" : "Description / Responsibilities"}</label>
                          <textarea
                            value={ex.description}
                            onChange={e => setExperiences(experiences.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))}
                            rows={3}
                            placeholder={lang === "my" ? "တာဝန်များနှင့် အောင်မြင်ချက်များ..." : "Responsibilities & achievements..."}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Other Information */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <MoreHorizontal className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "အခြား အချက်အလက်များ" : "Other Information"}</h2>
                    <p className="text-[11px] text-muted-foreground">{lang === "my" ? "လက်မှတ်များ၊ ဆုများ၊ ဘာသာစကားများ စသည်" : "Certifications, awards, languages, etc."}</p>
                  </div>
                </div>
                <textarea
                  value={otherInfo}
                  onChange={e => setOtherInfo(e.target.value)}
                  rows={3}
                  placeholder={lang === "my" ? "အခြားအချက်အလက်များ — လက်မှတ်များ၊ ဆုများ၊ ဘာသာစကားများ၊ volunteer အလုပ်များ..." : "Other info — certifications, awards, languages, volunteer work, projects, links..."}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
                />
              </div>

              {/* Education - Multiple */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                      <GraduationCap className="h-5 w-5 text-accent" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "ပညာရေး" : "Education"}</h2>
                      <p className="text-[10px] text-muted-foreground">{educations.length}/5</p>
                    </div>
                  </div>
                  {educations.length < 5 && (
                    <Button variant="outline" size="sm" onClick={addEducation} className="rounded-lg text-xs">
                      <Plus className="mr-1 h-3 w-3" strokeWidth={1.5} />
                      {lang === "my" ? "ထပ်ထည့်" : "Add"}
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  {educations.map((ed, i) => (
                    <div key={i} className="relative rounded-lg border border-border bg-muted/30 p-3">
                      {educations.length > 1 && (
                        <button onClick={() => removeEducation(i)} className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      )}
                      <div className="space-y-2">
                        <Input
                          value={ed.degree}
                          onChange={e => updateEducation(i, "degree", e.target.value)}
                          placeholder={lang === "my" ? "ဘွဲ့/ဒီဂရီ (ဥပမာ - BSc Computer Science)" : "Degree (e.g. BSc Computer Science)"}
                          className="h-9 rounded-lg text-sm"
                        />
                        <Input
                          value={ed.institution}
                          onChange={e => updateEducation(i, "institution", e.target.value)}
                          placeholder={lang === "my" ? "တက္ကသိုလ်/ကျောင်း" : "Institution / University"}
                          className="h-9 rounded-lg text-sm"
                        />
                        <Input
                          value={ed.year}
                          onChange={e => updateEducation(i, "year", e.target.value)}
                          placeholder={lang === "my" ? "ခုနှစ် (ဥပမာ - 2020)" : "Year (e.g. 2020)"}
                          className="h-9 w-32 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills - Multiple chips */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Award className="h-5 w-5 text-primary" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "ကျွမ်းကျင်မှုများ" : "Skills"}</h2>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{skills.length}/30</span>
                </div>

                {skills.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {skills.map(skill => (
                      <span key={skill} className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                        {skill}
                        <button onClick={() => removeSkill(skill)} className="rounded-full p-0.5 active:bg-primary/20">
                          <X className="h-3 w-3" strokeWidth={1.5} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={e => { setNewSkill(e.target.value); setShowSkillSuggestions(true); }}
                      onFocus={() => setShowSkillSuggestions(true)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                      placeholder={lang === "my" ? "ကျွမ်းကျင်မှု ထည့်ရန်..." : "Add a skill..."}
                      className="h-10 rounded-lg text-sm"
                    />
                    <Button variant="outline" size="sm" className="rounded-lg" onClick={() => addSkill()}>
                      <Plus className="h-4 w-4" strokeWidth={1.5} />
                    </Button>
                  </div>
                  {showSkillSuggestions && filteredSuggestions.length > 0 && (
                    <div className="absolute z-50 mt-1 max-h-40 w-full overflow-y-auto rounded-xl border border-border bg-popover shadow-lg">
                      {filteredSuggestions.slice(0, 12).map(s => (
                        <button key={s} onClick={() => addSkill(s)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted">
                          <Plus className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">{lang === "my" ? "ရိုက်ထည့်ပြီး Enter နှိပ်ပါ သို့မဟုတ် အကြံပြုချက်မှ ရွေးပါ" : "Type and press Enter, or pick from suggestions"}</p>
              </div>

              <Button onClick={() => setStep(2)} className="w-full">
                {lang === "my" ? "ရှေ့ဆက်ရန်" : "Continue"} <ChevronRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {/* Step 2: Choose platform */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <h2 className="mb-1 text-sm font-semibold text-foreground">{lang === "my" ? "Platform ရွေးချယ်ပါ" : "Choose Platform"}</h2>
                <p className="mb-4 text-xs text-muted-foreground">{lang === "my" ? "ပရိုဖိုင်ကို မည်သည့် platform အတွက် ပြင်ဆင်ချင်ပါသလဲ?" : "Which platform is this profile for?"}</p>
                <div className="grid grid-cols-2 gap-3">
                  {platforms.map(p => (
                    <button key={p} onClick={() => setPlatform(p)} className={`flex items-center gap-2 rounded-xl border p-3.5 text-left transition-colors ${platform === p ? "border-primary bg-primary/5" : "border-border bg-background active:bg-muted"}`}>
                      <Globe className={`h-4 w-4 ${platform === p ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
                      <span className={`text-sm font-medium ${platform === p ? "text-primary" : "text-foreground"}`}>{p}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-2 text-xs font-semibold text-foreground">{lang === "my" ? "အကြံပြုချက်" : "Tips"}</h3>
                <ul className="space-y-2">
                  {[
                    lang === "my" ? "Professional ဓာတ်ပုံ ထည့်ပါ" : "Add a professional photo",
                    lang === "my" ? "ကျွမ်းကျင်မှု စစ်ဆေးမှုများ ပြုလုပ်ပါ" : "Complete skill tests on the platform",
                    lang === "my" ? "Portfolio link ထည့်ပါ" : "Include your portfolio link",
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald" strokeWidth={2} />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ChevronLeft className="h-4 w-4" /> {lang === "my" ? "နောက်သို့" : "Back"}
                </Button>
                <Button onClick={handleGenerate} disabled={generating} className="flex-1">
                  {generating ? (
                    <span className="flex items-center gap-2">
                      <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="inline-block h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent" />
                      {lang === "my" ? "ဖန်တီးနေသည်..." : "Generating..."}
                    </span>
                  ) : (
                    <>{lang === "my" ? "ပရိုဖိုင် ဖန်တီးရန်" : "Generate Profile"}</>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Generated result */}
          {step === 3 && generatedProfile && (
            <motion.div key="step3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald/10">
                      <Check className="h-4 w-4 text-emerald" strokeWidth={2} />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">{lang === "my" ? "ပရိုဖိုင် အသင့်ဖြစ်ပါပြီ" : "Profile Ready!"}</h2>
                      <p className="text-[10px] text-muted-foreground">{lang === "my" ? `${platform} အတွက် ဖန်တီးထားပါသည်` : `Generated for ${platform}`}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-semibold text-emerald">{platform}</span>
                </div>

                <div className="mb-3 rounded-lg bg-primary/5 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Headline</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{name ? `${name} — ` : ""}{generatedProfile.headline}</p>
                </div>

                <div className="mb-3">
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Summary</p>
                  <p className="text-xs leading-relaxed text-foreground/80">{generatedProfile.summary}</p>
                </div>

                {generatedProfile.sections.map((section, i) => (
                  <div key={i} className="mb-3">
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{section.title}</p>
                    <p className="whitespace-pre-line text-xs leading-relaxed text-foreground/80">{section.content}</p>
                  </div>
                ))}

                {generatedProfile.skills.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {generatedProfile.skills.map((skill, i) => (
                        <span key={i} className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Download buttons */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleDownloadPdf} className="flex-1">
                  <Download className="h-4 w-4" />
                  PDF
                </Button>
                <Button variant="outline" onClick={handleDownloadDocx} className="flex-1">
                  <Download className="h-4 w-4" />
                  DOCX
                </Button>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleCopy} className="flex-1">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? (lang === "my" ? "ကူးပြီး" : "Copied") : (lang === "my" ? "ကူးယူရန်" : "Copy")}
                </Button>
                <Button onClick={() => { setStep(1); setGeneratedProfile(null); setSaved(false); setName(""); setTitle(""); setSummary(""); setExperiences([{ company: "", role: "", duration: "", description: "" }]); setOtherInfo(""); setEducations([{ degree: "", institution: "", year: "" }]); setSkills([]); setPlatform("Upwork"); }} className="flex-1">
                  <FileText className="h-4 w-4" />
                  {lang === "my" ? "အသစ်ဖန်တီးရန်" : "Create New"}
                </Button>
              </div>

              <Button
                variant={saved ? "outline" : "default"}
                onClick={async () => {
                  if (saved || !session?.user?.id || !generatedProfile) return;
                  const fullText = `${name ? `${name} — ` : ""}${generatedProfile.headline}\n\n${generatedProfile.summary}\n\n${generatedProfile.sections.map((s: any) => `${s.title}\n${s.content}`).join("\n\n")}${generatedProfile.skills.length ? `\n\nSkills: ${generatedProfile.skills.join(", ")}` : ""}`;
                  await supabase.from("generated_documents").insert({
                    user_id: session.user.id,
                    doc_type: "resume",
                    title: `${platform} Profile — ${name || title || "Untitled"}`,
                    content: fullText,
                    metadata: { platform, name, headline: generatedProfile.headline },
                  });
                  setSaved(true);
                  toast({ title: lang === "my" ? "သိမ်းဆည်းပြီးပါပြီ" : "Saved for future use" });
                }}
                className="w-full"
                disabled={saved}
              >
                {saved ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                {saved ? (lang === "my" ? "သိမ်းဆည်းပြီး" : "Saved") : (lang === "my" ? "နောင်အတွက် သိမ်းဆည်းရန်" : "Save for Future Use")}
              </Button>

              <Button variant="outline" onClick={() => navigate("/ai-tools")} className="w-full">
                <ChevronLeft className="h-4 w-4" />
                {lang === "my" ? "Career Tools သို့ ပြန်သွားရန်" : "Back to Career Tools"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ProfileBuilder;
