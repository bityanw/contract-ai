import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import ContractInput from '@/components/ContractInput';
import ReviewConfig from '@/components/ReviewConfig';
import ReviewResults from '@/components/ReviewResults';

export default function Workbench() {
  const navigate = useNavigate();
  const fetchTemplates = useAppStore((s) => s.fetchTemplates);
  const currentReview = useAppStore((s) => s.currentReview);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return (
    <div className="min-h-screen bg-[#1a1a2e] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-100">审核工作台</h1>
          <p className="mt-1 text-sm text-gray-500">上传合同文本，配置审核参数，启动智能审核</p>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="lg:w-[60%]">
            <ContractInput />
          </div>
          <div className="lg:w-[40%]">
            <ReviewConfig />
          </div>
        </div>

        {!isAuthenticated && (
          <div className="mt-6 rounded-xl border border-[#e2b340]/20 bg-[#e2b340]/5 p-4 flex items-center justify-between">
            <p className="text-sm text-[#e2b340]/80">登录后可使用完整审核功能，保存审核历史</p>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm bg-[#e2b340] text-[#1a1a2e] rounded-lg font-medium hover:bg-[#e2b340]/90 transition-colors"
            >
              立即登录
            </button>
          </div>
        )}

        {currentReview && (
          <div className="mt-8">
            <ReviewResults />
          </div>
        )}
      </div>
    </div>
  );
}
