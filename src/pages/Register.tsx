import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Shield, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store';

export default function Register() {
  const navigate = useNavigate();
  const register = useAppStore((s) => s.register);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, name);
      navigate('/');
    } catch (err: any) {
      setError(err.message || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl flex rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/40">
        <div className="hidden md:flex w-1/2 bg-[#1a1a2e] flex-col items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#e2b340]/5 to-transparent" />
          <div className="relative z-10 text-center space-y-6">
            <div className="flex items-center justify-center w-20 h-20 mx-auto rounded-2xl bg-[#e2b340]/10 border border-[#e2b340]/20">
              <Shield className="w-10 h-10 text-[#e2b340]" />
            </div>
            <h1 className="font-display text-4xl font-bold text-white tracking-wide">
              ContractAI
            </h1>
            <p className="text-lg text-zinc-400">智能合同审核平台</p>
            <p className="text-sm text-zinc-500 leading-relaxed max-w-xs mx-auto">
              注册即可体验 AI 驱动的合同风险分析，提升法律审核效率
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#e2b340]/40 to-transparent" />
        </div>

        <div className="w-full md:w-1/2 bg-[#12122a] p-8 md:p-12 flex flex-col justify-center">
          <div className="md:hidden flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-[#e2b340]" />
            <h1 className="font-display text-2xl font-bold text-white">ContractAI</h1>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">创建账户</h2>
          <p className="text-sm text-zinc-400 mb-8">注册以开始使用智能合同审核</p>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">姓名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="您的姓名"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">邮箱地址</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">密码</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="设置密码"
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">确认密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="再次输入密码"
                className="input-field"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  注册中...
                </>
              ) : (
                '注册'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            已有账户？{' '}
            <Link to="/login" className="text-[#e2b340] hover:text-[#e2b340]/80 font-medium">
              立即登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
