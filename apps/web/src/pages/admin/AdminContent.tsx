import { useState } from "react";
import { FileText, HelpCircle, Inbox, Layers, Settings } from "lucide-react";
import { PanelLayout } from "../../components/Layout";
import { Seo } from "../../components/Seo";
import { ServicesTab } from "../../components/admin/ServicesTab";
import { ArticlesTab } from "../../components/admin/ArticlesTab";
import { FaqsTab } from "../../components/admin/FaqsTab";
import { MessagesTab } from "../../components/admin/MessagesTab";
import { SettingsTab } from "../../components/admin/SettingsTab";
import { cn } from "../../components/ui";

const tabs = [
  { id: "services", label: "خدمات", icon: Layers },
  { id: "articles", label: "مقالات", icon: FileText },
  { id: "faqs", label: "سؤالات متداول", icon: HelpCircle },
  { id: "messages", label: "پیام‌های تماس", icon: Inbox },
  { id: "settings", label: "تنظیمات عمومی", icon: Settings },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function AdminContent() {
  const [tab, setTab] = useState<TabId>("services");

  return (
    <PanelLayout
      title="مدیریت محتوا"
      description="خدمات، مقالات، پرسش‌های متداول، پیام‌های تماس و اطلاعات عمومی سایت را بدون تغییر کد مدیریت کنید."
    >
      <Seo title="مدیریت محتوا" description="پنل مدیریت محتوای سایت." noindex />

      <div
        className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-200 bg-white p-2"
        role="tablist"
        aria-label="بخش‌های مدیریت محتوا"
      >
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                tab === item.id
                  ? "bg-brand-700 text-white"
                  : "text-slate-600 hover:bg-slate-50 hover:text-brand-800",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {tab === "services" ? <ServicesTab /> : null}
        {tab === "articles" ? <ArticlesTab /> : null}
        {tab === "faqs" ? <FaqsTab /> : null}
        {tab === "messages" ? <MessagesTab /> : null}
        {tab === "settings" ? <SettingsTab /> : null}
      </div>
    </PanelLayout>
  );
}
