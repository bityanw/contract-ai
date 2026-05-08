import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { FileSearch, BookOpen, BarChart3, Clock } from "lucide-react";
import UserMenu from "@/components/UserMenu";

const navItems = [
  { path: "/", label: "审核工作台", icon: FileSearch },
  { path: "/prompts", label: "提示词管理", icon: BookOpen },
  { path: "/report/:id", label: "审核报告", icon: BarChart3, matchPrefix: "/report" },
  { path: "/history", label: "历史记录", icon: Clock },
];

interface AIStatus {
  configured: boolean;
  model: string;
  provider: string;
}

export default function Sidebar() {
  const location = useLocation();
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);

  useEffect(() => {
    fetch("/api/ai/status")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) setAiStatus(json.data);
      })
      .catch(() => {});
  }, []);

  const isActive = (item: (typeof navItems)[number]) => {
    if (item.matchPrefix) {
      return location.pathname.startsWith(item.matchPrefix);
    }
    return location.pathname === item.path;
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-navy-950 border-r border-navy-700/40 flex flex-col z-50">
      <div className="px-6 py-6">
        <h1 className="font-display text-2xl font-bold text-brand-400 tracking-wide">
          ContractAI
        </h1>
        <p className="text-xs text-zinc-500 mt-1">智能合同审核平台</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.path}
              to={item.matchPrefix ? "/report/1" : item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                active
                  ? "bg-brand-400/10 text-brand-400 border-l-2 border-brand-400"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-navy-800/50"
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-2">
        <UserMenu />
      </div>

      <div className="px-6 py-4 border-t border-navy-700/40">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-600">v1.0.0</p>
          {aiStatus && (
            <p className="text-xs text-zinc-600 truncate max-w-[120px]">
              {aiStatus.configured ? aiStatus.model : "未配置AI"}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
