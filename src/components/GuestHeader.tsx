import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.svg";
import { Button } from "@/components/ui/button";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/hooks/use-language";

const GuestHeader = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const location = useLocation();
  const my = lang === "my";
  const here = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const linkCls = (active: boolean) =>
    `whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors ${
      active
        ? "bg-accent text-accent-foreground"
        : "text-shell-foreground/75 hover:bg-sidebar-accent hover:text-shell-foreground"
    }`;

  // Preserve where the guest is so we can return them after login/signup.
  const returnTo = encodeURIComponent(location.pathname + location.search);

  return (
    <header className="sticky top-0 z-40 border-b border-shell bg-shell text-shell-foreground">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={logo} alt="ThweSat" width={28} height={28} />
          <span className="font-brand text-base font-semibold lg:text-lg">
            <span className="text-shell-foreground">Thwe</span>
            <span className="text-accent">Sat</span>
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-0.5 md:flex lg:ml-4 lg:gap-1">
          <button onClick={() => navigate("/jobs")} className={linkCls(here("/jobs"))}>
            {my ? "အလုပ်များ" : "Find Jobs"}
          </button>
          <button onClick={() => navigate("/mentors")} className={linkCls(here("/mentors"))}>
            {my ? "လမ်းညွှန်သူများ" : "Mentors"}
          </button>
          <button onClick={() => navigate("/guides")} className={linkCls(here("/guides"))}>
            {my ? "လမ်းညွှန်" : "Guides"}
          </button>
          <button
            onClick={() => navigate("/employer/onboarding")}
            className={linkCls(here("/employer"))}
          >
            {my ? "အလုပ်ရှင်များအတွက်" : "For Employers"}
          </button>
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <LanguageToggle />
          <Button
            variant="ghost"
            size="sm"
            className="text-shell-foreground hover:bg-sidebar-accent hover:text-shell-foreground"
            onClick={() => navigate(`/login?redirect=${returnTo}`)}
          >
            {my ? "ဝင်ရောက်ရန်" : "Sign in"}
          </Button>
          <Button size="sm" onClick={() => navigate(`/signup?redirect=${returnTo}`)}>
            {my ? "စတင်ရန်" : "Get started"}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default GuestHeader;
