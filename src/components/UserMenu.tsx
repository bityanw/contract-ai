import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ChevronDown, LogOut, Crown, Settings } from 'lucide-react';
import { useAppStore } from '@/store';

const ROLE_STYLES: Record<string, { label: string; color: string }> = {
  user: { label: '基础版', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  pro: { label: '专业版', color: 'bg-[#e2b340]/15 text-[#e2b340] border-[#e2b340]/20' },
  admin: { label: '管理员', color: 'bg-red-500/15 text-red-400 border-red-500/20' },
};

export default function UserMenu() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, upgradeRole } = useAppStore();
  const [open, setOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!isAuthenticated || !user) {
    return (
      <button
        onClick={() => navigate('/login')}
        className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-navy-800/50 transition-all duration-200"
      >
        <User size={18} />
        <span>登录</span>
      </button>
    );
  }

  const roleStyle = ROLE_STYLES[user.role] || ROLE_STYLES.user;

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      await upgradeRole();
      setOpen(false);
    } catch {
    } finally {
      setUpgrading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-zinc-300 hover:bg-navy-800/50 transition-all duration-200"
      >
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#e2b340]/10 border border-[#e2b340]/20">
          <span className="text-xs font-semibold text-[#e2b340]">
            {user.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="text-sm text-zinc-200 truncate">{user.name}</div>
          <span className={`inline-block px-1.5 py-0 text-[10px] rounded border ${roleStyle.color}`}>
            {roleStyle.label}
          </span>
        </div>
        <ChevronDown size={14} className={`text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl shadow-black/40 overflow-hidden z-50">
          <div className="px-3 py-2 border-b border-white/5">
            <p className="text-xs text-zinc-500 truncate">{user.email}</p>
          </div>
          <div className="py-1">
            <button
              onClick={() => { setOpen(false); navigate('/settings'); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 transition-colors"
            >
              <Settings size={14} />
              AI 设置
            </button>
            {user.role === 'user' && (
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#e2b340] hover:bg-[#e2b340]/5 transition-colors"
              >
                <Crown size={14} />
                {upgrading ? '升级中...' : '升级专业版'}
              </button>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-400/5 transition-colors"
            >
              <LogOut size={14} />
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
